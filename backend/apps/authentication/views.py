import json
import random
import logging
from datetime import timedelta

from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.password_validation import validate_password as django_validate_password
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
try:
    from ratelimit.decorators import ratelimit
except ImportError:
    from django_ratelimit.decorators import ratelimit

from apps.authentication.models import Company, User, UserProfile
from apps.authentication.jwt_helpers import (
    clear_jwt_cookies,
    jwt_or_session,
    set_jwt_tokens,
    validate_email,
    validate_password,
    validate_username,
)


logger = logging.getLogger(__name__)


def _parse_json_body(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return None


# Rate-limiting helpers

def _ratelimited_error(request, exception):
    return JsonResponse({"error": "Too many requests. Please try again later."}, status=429)


def _get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


# Serialization helpers

def _normalize_role(value: str) -> str:
    role = (value or "").strip().lower()
    if role == User.ROLE_USER_LEGACY:
        return User.ROLE_CANDIDATE
    if role == User.ROLE_INTERVIEWER_LEGACY:
        return User.ROLE_RECRUITER
    return role


def _is_admin_user(user) -> bool:
    return bool(user and (getattr(user, "role", None) == User.ROLE_ADMIN or user.is_staff))


def _serialize_user(user: User) -> dict:
    profile = getattr(user, "profile", None)
    company_name = profile.company.name if profile and profile.company else ""  # type: ignore
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_verified": user.is_verified,
        "is_active": user.is_active,
        "company_name": company_name,
    }


def _serialize_company(company: Company) -> dict:
    return {
        "id": company.id,
        "name": company.name,
        "domain": company.domain,
        "website": company.website,
        "is_active": company.is_active,
        "created_at": company.created_at.isoformat(),
        "recruiter_count": UserProfile.objects.filter(company=company).count(),
    }


# Code and email helpers

def _issue_verification_code(user: User) -> str:
    code = f"{random.randint(100000, 999999)}"
    user.verification_code = code
    user.verification_code_expires_at = timezone.now() + timedelta(minutes=int(getattr(settings, 'OTP_VALIDITY_MINUTES', 10)))
    user.save(update_fields=["verification_code", "verification_code_expires_at"])
    return code


def _issue_password_reset_code(user: User) -> str:
    code = f"{random.randint(100000, 999999)}"
    user.password_reset_code = code
    user.password_reset_code_expires_at = timezone.now() + timedelta(minutes=int(getattr(settings, 'OTP_VALIDITY_MINUTES', 10)))
    user.save(update_fields=["password_reset_code", "password_reset_code_expires_at"])
    return code


def _send_verification_email(email: str, code: str, username: str) -> bool:
    """Send verification code to user's email."""
    try:
        subject = getattr(settings, 'OTP_EMAIL_SUBJECT', 'Verify your Interview Platform account')
        message = f"""
Hello {username},

Welcome to Interview Platform.

Your one-time verification code is: {code}

This code expires in 10 minutes.

If you did not request this verification, you can safely ignore this email.

Best regards,
Interview Platform Support
"""

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("Error sending verification email to %s", email)
        return False


def _send_welcome_email(email: str, username: str, role: str) -> bool:
    """Send welcome email immediately after signup."""
    try:
        role_label = "Candidate" if role == User.ROLE_CANDIDATE else "Recruiter"
        subject = getattr(settings, "WELCOME_EMAIL_SUBJECT", "Welcome to Interview Platform")
        message = f"""
Hello {username},

Welcome to Interview Platform.

Your account has been created successfully as a {role_label}.
Please verify your email using the OTP code sent separately.

After verification, you can log in and start using your dashboard.

Best regards,
Interview Platform Support
"""

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("Error sending welcome email to %s", email)
        return False


def _send_login_email(email: str, username: str, role: str) -> bool:
    """Send a professional login confirmation email."""
    try:
        role_label = {
            User.ROLE_CANDIDATE: "Candidate",
            User.ROLE_USER_LEGACY: "Candidate",
            User.ROLE_RECRUITER: "Recruiter",
            User.ROLE_INTERVIEWER_LEGACY: "Recruiter",
            User.ROLE_ADMIN: "Admin",
        }.get(role, "User")
        subject = getattr(settings, "LOGIN_EMAIL_SUBJECT", "Successful sign-in to Interview Platform")
        message = f"""
Hello {username},

This is a confirmation that your Interview Platform account ({role_label}) has just signed in successfully.

If this was not you, please change your password immediately.

Best regards,
Interview Platform Security
"""

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("Error sending login email to %s", email)
        return False


def _send_password_reset_email(email: str, code: str, username: str) -> bool:
    """Send password reset OTP to the user."""
    try:
        subject = getattr(settings, 'PASSWORD_RESET_EMAIL_SUBJECT', 'Reset your Interview Platform password')
        message = f"""
Hello {username},

We received a request to reset your Interview Platform password.

Your password reset code is: {code}

This code expires in 10 minutes.

If you did not request a password reset, you can ignore this message.

Best regards,
Interview Platform Security
"""

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("Error sending password reset email to %s", email)
        return False


# Views

def home_view(request):
    return JsonResponse({"message": "Interview platform backend is running."})


@csrf_exempt
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def signup_view(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed."}, status=405)

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    role = _normalize_role(payload.get("role") or User.ROLE_CANDIDATE)
    company_name = (payload.get("company_name") or "").strip()
    company_domain = (payload.get("company_domain") or "").strip()
    company_website = (payload.get("company_website") or "").strip()
    bio = (payload.get("bio") or "").strip()
    skills = payload.get("skills") or []
    linkedin_url = (payload.get("linkedin_url") or "").strip()
    github_url = (payload.get("github_url") or "").strip()

    # Server-side validation
    email_err = validate_email(email)
    if email_err:
        return JsonResponse({"error": email_err}, status=400)

    username_err = validate_username(username)
    if username_err:
        return JsonResponse({"error": username_err}, status=400)

    password_err = validate_password(password)
    if password_err:
        return JsonResponse({"error": password_err}, status=400)

    # Validate role
    if role not in {User.ROLE_CANDIDATE, User.ROLE_RECRUITER}:
        return JsonResponse({"error": "Role must be candidate or recruiter."}, status=400)
    if role == User.ROLE_RECRUITER and not company_name:
        return JsonResponse({"error": "company_name is required for recruiter registration."}, status=400)

    # Check uniqueness
    if User.objects.filter(username=username).exists():
        return JsonResponse({"error": "Username already exists."}, status=400)
    if User.objects.filter(email=email).exists():
        return JsonResponse({"error": "Email already exists."}, status=400)

    # Validate password using Django's validators
    try:
        django_validate_password(password)
    except ValidationError as e:
        return JsonResponse({"error": " ".join(e.messages)}, status=400)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        role=role,
    )
    verification_code = _issue_verification_code(user)

    company = None
    if role == User.ROLE_RECRUITER:
        company, _ = Company.objects.get_or_create(name=company_name)
        if company_domain:
            company.domain = company_domain
        if company_website:
            company.website = company_website
        company.save()

    if role == User.ROLE_RECRUITER or bio or linkedin_url or github_url or skills:
        if isinstance(skills, str):
            skills = [item.strip() for item in skills.split(",") if item.strip()]
        if not isinstance(skills, list):
            skills = []
        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                "company": company,
                "bio": bio,
                "skills": skills,
                "linkedin_url": linkedin_url,
                "github_url": github_url,
            },
        )
    # Send verification email
    _send_verification_email(email, verification_code, username)
    # Send welcome email
    _send_welcome_email(email, username, role)

    # Return user with JWT tokens
    response = JsonResponse(
        {
            "message": "Signup successful. Verification code and welcome email sent.",
            "requires_verification": True,
            "verification_code_sent": True,
            "welcome_email_sent": True,
            "user": {"id": user.id, "username": user.username, "email": user.email, "role": user.role},
        },
        status=201,
    )
    return set_jwt_tokens(response, user)

@csrf_exempt
@ratelimit(key='ip', rate='10/m', method='POST', block=True)
def login_view(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed."}, status=405)

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        return JsonResponse({"error": "email and password are required."}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        return JsonResponse({"error": "Invalid credentials."}, status=401)

    authenticated = authenticate(request, username=user.username, password=password)
    if not authenticated:
        return JsonResponse({"error": "Invalid credentials."}, status=401)
    if (
        not getattr(settings, "ALLOW_UNVERIFIED_LOGIN", False)
        and authenticated.role != User.ROLE_ADMIN
        and not authenticated.is_verified
    ):
        return JsonResponse(
            {"error": "Account not verified. Please verify before login."},
            status=403,
        )

    _send_login_email(authenticated.email, authenticated.username, authenticated.role)

    response = JsonResponse(
        {
            "message": "Login successful.",
            "user": {
                "id": authenticated.id,
                "username": authenticated.username,
                "email": authenticated.email,
                "role": authenticated.role,
            },
        }
    )
    return set_jwt_tokens(response, authenticated)

@csrf_exempt
@ratelimit(key='ip', rate='10/m', method='POST', block=True)
def admin_login_view(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed."}, status=405)

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    if not email or not password:
        return JsonResponse({"error": "email and password are required."}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        return JsonResponse({"error": "Invalid credentials."}, status=401)

    authenticated = authenticate(request, username=user.username, password=password)
    if not authenticated:
        return JsonResponse({"error": "Invalid credentials."}, status=401)
    if authenticated.role != User.ROLE_ADMIN and not authenticated.is_staff:
        return JsonResponse({"error": "Admin access denied."}, status=403)

    response = JsonResponse(
        {
            "message": "Admin login successful.",
            "user": {
                "id": authenticated.id,
                "username": authenticated.username,
                "email": authenticated.email,
                "role": authenticated.role,
            },
        }
    )
    return set_jwt_tokens(response, authenticated)


@csrf_exempt
def logout_view(request):
    response = JsonResponse({"message": "Logged out."})
    return clear_jwt_cookies(response)


@csrf_exempt
@ratelimit(key='ip', rate='20/m', method='POST', block=True)
def refresh_view(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed."}, status=405)

    refresh_value = request.COOKIES.get("refresh_token")
    if not refresh_value:
        payload = _parse_json_body(request) or {}
        refresh_value = payload.get("refresh")
    if not refresh_value:
        return JsonResponse({"error": "Refresh token is required."}, status=401)

    try:
        refresh = RefreshToken(refresh_value)
        user_id = refresh.get("user_id")
    except TokenError:
        return JsonResponse({"error": "Invalid refresh token."}, status=401)

    user = User.objects.filter(id=user_id, is_active=True).first()
    if not user:
        return JsonResponse({"error": "Invalid refresh token."}, status=401)

    response = JsonResponse({"message": "Token refreshed."})
    return set_jwt_tokens(response, user)


def me_view(request):
    user = jwt_or_session(request)
    if not user:
        return JsonResponse({"error": "Not authenticated."}, status=401)
    return JsonResponse(
        {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "is_verified": user.is_verified,
            }
        }
    )


@csrf_exempt
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def request_verification_view(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed."}, status=405)

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    email = (payload.get("email") or "").strip().lower()

    email_err = validate_email(email)
    if email_err:
        return JsonResponse({"error": email_err}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        return JsonResponse({"error": "User not found."}, status=404)
    if user.is_verified:
        return JsonResponse({"message": "Account already verified."})

    verification_code = _issue_verification_code(user)
    # Send verification email
    _send_verification_email(email, verification_code, user.username)

    return JsonResponse(
        {
            "message": "Verification code sent to your email.",
            "verification_code_sent": True,
        }
    )


@csrf_exempt
def verify_account_view(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed."}, status=405)

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    email = (payload.get("email") or "").strip().lower()
    code = (payload.get("code") or "").strip()

    email_err = validate_email(email)
    if email_err:
        return JsonResponse({"error": email_err}, status=400)

    if not code:
        return JsonResponse({"error": "code is required."}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        return JsonResponse({"error": "User not found."}, status=404)
    if user.is_verified:
        return JsonResponse({"message": "Account already verified."})
    if not user.verification_code or user.verification_code != code:
        return JsonResponse({"error": "Invalid verification code."}, status=400)
    if not user.verification_code_expires_at or user.verification_code_expires_at < timezone.now():
        return JsonResponse({"error": "Verification code expired."}, status=400)

    user.is_verified = True
    user.verification_code = ""
    user.verification_code_expires_at = None
    user.save(update_fields=["is_verified", "verification_code", "verification_code_expires_at"])

    return JsonResponse({"message": "Account verified successfully."})

@csrf_exempt
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def request_password_reset_view(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed."}, status=405)

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    email = (payload.get("email") or "").strip().lower()

    email_err = validate_email(email)
    if email_err:
        return JsonResponse({"error": email_err}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        return JsonResponse({"error": "User not found."}, status=404)

    reset_code = _issue_password_reset_code(user)
    _send_password_reset_email(email, reset_code, user.username)

    return JsonResponse({"message": "Password reset code sent to your email.", "reset_code_sent": True})

@csrf_exempt

def confirm_password_reset_view(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed."}, status=405)

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    email = (payload.get("email") or "").strip().lower()
    code = (payload.get("code") or "").strip()
    new_password = payload.get("new_password") or ""
    confirm_password = payload.get("confirm_password") or ""

    email_err = validate_email(email)
    if email_err:
        return JsonResponse({"error": email_err}, status=400)

    if not code:
        return JsonResponse({"error": "code is required."}, status=400)
    if not new_password:
        return JsonResponse({"error": "new_password is required."}, status=400)

    password_err = validate_password(new_password)
    if password_err:
        return JsonResponse({"error": password_err}, status=400)

    if new_password != confirm_password:
        return JsonResponse({"error": "Passwords do not match."}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        return JsonResponse({"error": "User not found."}, status=404)
    if not user.password_reset_code or user.password_reset_code != code:
        return JsonResponse({"error": "Invalid reset code."}, status=400)
    if not user.password_reset_code_expires_at or user.password_reset_code_expires_at < timezone.now():
        return JsonResponse({"error": "Reset code expired."}, status=400)

    # Validate using Django's password validators
    try:
        django_validate_password(new_password, user)
    except ValidationError as e:
        return JsonResponse({"error": " ".join(e.messages)}, status=400)

    user.set_password(new_password)
    user.password_reset_code = ""
    user.password_reset_code_expires_at = None
    user.save(update_fields=["password", "password_reset_code", "password_reset_code_expires_at"])

    return JsonResponse({"message": "Password reset successful."})


def admin_users_view(request):
    user = jwt_or_session(request)
    if not user or not _is_admin_user(user):
        return JsonResponse({"error": "Admin access denied."}, status=403)

    if request.method == 'GET':
        role = (request.GET.get("role") or "").strip().lower()
        search = (request.GET.get("search") or "").strip()
        queryset = User.objects.all().order_by("-date_joined")
        if role:
            queryset = queryset.filter(role=role)
        if search:
            queryset = queryset.filter(Q(username__icontains=search) | Q(email__icontains=search))

        return JsonResponse({"users": [_serialize_user(u) for u in queryset[:500]]})

    if request.method == 'POST':
        payload = _parse_json_body(request)
        if payload is None:
            return JsonResponse({"error": "Invalid JSON body."}, status=400)

        username = (payload.get("username") or "").strip()
        email = (payload.get("email") or "").strip().lower()
        password = payload.get("password") or ""
        role = _normalize_role(payload.get("role") or User.ROLE_CANDIDATE)
        is_active = bool(payload.get("is_active", True))
        company_id = payload.get("company_id")

        # Validate inputs
        user_err = validate_username(username)
        if user_err:
            return JsonResponse({"error": user_err}, status=400)

        email_err = validate_email(email)
        if email_err:
            return JsonResponse({"error": email_err}, status=400)

        pwd_err = validate_password(password)
        if pwd_err:
            return JsonResponse({"error": pwd_err}, status=400)

        if role not in {User.ROLE_CANDIDATE, User.ROLE_RECRUITER, User.ROLE_ADMIN, User.ROLE_USER_LEGACY, User.ROLE_INTERVIEWER_LEGACY}:
            return JsonResponse({"error": "Invalid role."}, status=400)
        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "Username already exists."}, status=400)
        if User.objects.filter(email=email).exists():
            return JsonResponse({"error": "Email already exists."}, status=400)

        # Validate password using Django's validators
        try:
            django_validate_password(password)
        except ValidationError as e:
            return JsonResponse({"error": " ".join(e.messages)}, status=400)

        created_user = User.objects.create_user(username=username, email=email, password=password, role=role, is_active=is_active)

        if company_id:
            company = Company.objects.filter(id=company_id).first()
            if company:
                UserProfile.objects.update_or_create(user=created_user, defaults={"company": company})

        return JsonResponse({"message": "User created.", "user": _serialize_user(created_user)}, status=201)

    return JsonResponse({"error": "Method not allowed."}, status=405)


def admin_user_detail_view(request, user_id: int):
    user = jwt_or_session(request)
    if not user or not _is_admin_user(user):
        return JsonResponse({"error": "Admin access denied."}, status=403)

    target = User.objects.filter(id=user_id).first()
    if not target:
        return JsonResponse({"error": "User not found."}, status=404)

    if request.method == 'DELETE':
        if target.id == user.id:
            return JsonResponse({"error": "You cannot delete your own admin account."}, status=400)
        target.delete()
        return JsonResponse({"message": "User deleted."})

    if request.method == 'PATCH':
        payload = _parse_json_body(request)
        if payload is None:
            return JsonResponse({"error": "Invalid JSON body."}, status=400)

        if "role" in payload:
            role = _normalize_role(payload.get("role"))
            if role in {User.ROLE_CANDIDATE, User.ROLE_RECRUITER, User.ROLE_ADMIN, User.ROLE_USER_LEGACY, User.ROLE_INTERVIEWER_LEGACY}:
                target.role = role

        if "is_active" in payload:
            target.is_active = bool(payload.get("is_active"))

        if "is_verified" in payload:
            target.is_verified = bool(payload.get("is_verified"))

        target.save()

        company_id = payload.get("company_id", -1)  # Use -1 to distinguish from None
        if company_id != -1:
            profile, _ = UserProfile.objects.get_or_create(user=target)
            if not company_id:  # Handles "" or None or 0
                profile.company = None
            else:
                company = Company.objects.filter(id=company_id).first()
                profile.company = company
            profile.save()

        return JsonResponse({"message": "User updated.", "user": _serialize_user(target)})

    return JsonResponse({"error": "Method not allowed."}, status=405)


def admin_companies_view(request):
    user = jwt_or_session(request)
    if not user or not _is_admin_user(user):
        return JsonResponse({"error": "Admin access denied."}, status=403)

    if request.method == 'GET':
        search = (request.GET.get("search") or "").strip()
        queryset = Company.objects.all().order_by("name")
        if search:
            queryset = queryset.filter(name__icontains=search)
        return JsonResponse({"companies": [_serialize_company(c) for c in queryset[:500]]})

    if request.method == 'POST':
        payload = _parse_json_body(request)
        if payload is None:
            return JsonResponse({"error": "Invalid JSON body."}, status=400)

        name = (payload.get("name") or "").strip()
        domain = (payload.get("domain") or "").strip()
        website = (payload.get("website") or "").strip()
        is_active = bool(payload.get("is_active", True))

        if not name:
            return JsonResponse({"error": "Company name is required."}, status=400)
        if Company.objects.filter(name=name).exists():
            return JsonResponse({"error": "Company name already exists."}, status=400)

        company = Company.objects.create(name=name, domain=domain, website=website, is_active=is_active)
        return JsonResponse({"message": "Company created.", "company": _serialize_company(company)}, status=201)

    return JsonResponse({"error": "Method not allowed."}, status=405)


def admin_company_detail_view(request, company_id: int):
    user = jwt_or_session(request)
    if not user or not _is_admin_user(user):
        return JsonResponse({"error": "Admin access denied."}, status=403)

    company = Company.objects.filter(id=company_id).first()
    if not company:
        return JsonResponse({"error": "Company not found."}, status=404)

    if request.method == 'DELETE':
        UserProfile.objects.filter(company=company).update(company=None)
        company.delete()
        return JsonResponse({"message": "Company deleted."})

    if request.method == 'PATCH':
        payload = _parse_json_body(request)
        if payload is None:
            return JsonResponse({"error": "Invalid JSON body."}, status=400)

        if "name" in payload:
            name = (payload.get("name") or "").strip()
            if not name:
                return JsonResponse({"error": "Company name cannot be empty."}, status=400)
            exists = Company.objects.filter(name=name).exclude(id=company.id).exists()
            if exists:
                return JsonResponse({"error": "Company name already exists."}, status=400)
            company.name = name

        if "domain" in payload:
            company.domain = (payload.get("domain") or "").strip()
        if "website" in payload:
            company.website = (payload.get("website") or "").strip()
        if "is_active" in payload:
            company.is_active = bool(payload.get("is_active"))

        company.save()
        return JsonResponse({"message": "Company updated.", "company": _serialize_company(company)})

    return JsonResponse({"error": "Method not allowed."}, status=405)
