import json
import random
from datetime import timedelta

from django.contrib.auth import authenticate, login, logout
from django.core.mail import send_mail
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.conf import settings

from apps.authentication.models import Company, User, UserProfile


def _parse_json_body(request):
	try:
		return json.loads(request.body or "{}")
	except json.JSONDecodeError:
		return None


def _normalize_role(value: str) -> str:
	role = (value or "").strip().lower()
	if role == User.ROLE_USER_LEGACY:
		return User.ROLE_CANDIDATE
	if role == User.ROLE_INTERVIEWER_LEGACY:
		return User.ROLE_RECRUITER
	return role


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
	except Exception as e:
		print(f"Error sending email: {str(e)}")
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
	except Exception as e:
		print(f"Error sending welcome email: {str(e)}")
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
	except Exception as e:
		print(f"Error sending login email: {str(e)}")
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
	except Exception as e:
		print(f"Error sending password reset email: {str(e)}")
		return False


def home_view(request):
	return JsonResponse({"message": "Interview platform backend is running."})


@csrf_exempt
@require_POST
def signup_view(request):
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

	if role not in {User.ROLE_CANDIDATE, User.ROLE_RECRUITER}:
		return JsonResponse({"error": "Role must be candidate or recruiter."}, status=400)
	if role == User.ROLE_RECRUITER and not company_name:
		return JsonResponse({"error": "company_name is required for interviewer registration."}, status=400)
	if not username or not email or not password:
		return JsonResponse(
			{"error": "username, email and password are required."}, status=400
		)
	if User.objects.filter(username=username).exists():
		return JsonResponse({"error": "Username already exists."}, status=400)
	if User.objects.filter(email=email).exists():
		return JsonResponse({"error": "Email already exists."}, status=400)

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
	
	return JsonResponse(
		{
			"message": "Signup successful. Verification code and welcome email sent.",
			"requires_verification": True,
			"verification_code_sent": True,
			"welcome_email_sent": True,
			"user": {"id": user.id, "username": user.username, "email": user.email, "role": user.role},
		},
		status=201,
	)


@csrf_exempt
@require_POST
def login_view(request):
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

	login(request, authenticated)
	_send_login_email(authenticated.email, authenticated.username, authenticated.role)
	return JsonResponse(
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


@csrf_exempt
@require_POST
def admin_login_view(request):
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

	login(request, authenticated)
	return JsonResponse(
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


@csrf_exempt
@require_POST
def logout_view(request):
	logout(request)
	return JsonResponse({"message": "Logged out."})


def me_view(request):
	if not request.user.is_authenticated:
		return JsonResponse({"error": "Not authenticated."}, status=401)
	return JsonResponse(
		{
			"user": {
				"id": request.user.id,
				"username": request.user.username,
				"email": request.user.email,
				"role": request.user.role,
				"is_verified": request.user.is_verified,
			}
		}
	)


@csrf_exempt
@require_POST
def request_verification_view(request):
	payload = _parse_json_body(request)
	if payload is None:
		return JsonResponse({"error": "Invalid JSON body."}, status=400)

	email = (payload.get("email") or "").strip().lower()
	if not email:
		return JsonResponse({"error": "email is required."}, status=400)

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
@require_POST
def verify_account_view(request):
	payload = _parse_json_body(request)
	if payload is None:
		return JsonResponse({"error": "Invalid JSON body."}, status=400)

	email = (payload.get("email") or "").strip().lower()
	code = (payload.get("code") or "").strip()
	if not email or not code:
		return JsonResponse({"error": "email and code are required."}, status=400)

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
@require_POST
def request_password_reset_view(request):
	payload = _parse_json_body(request)
	if payload is None:
		return JsonResponse({"error": "Invalid JSON body."}, status=400)

	email = (payload.get("email") or "").strip().lower()
	if not email:
		return JsonResponse({"error": "email is required."}, status=400)

	user = User.objects.filter(email=email).first()
	if not user:
		return JsonResponse({"error": "User not found."}, status=404)

	reset_code = _issue_password_reset_code(user)
	_send_password_reset_email(email, reset_code, user.username)

	return JsonResponse({"message": "Password reset code sent to your email.", "reset_code_sent": True})


@csrf_exempt
@require_POST
def confirm_password_reset_view(request):
	payload = _parse_json_body(request)
	if payload is None:
		return JsonResponse({"error": "Invalid JSON body."}, status=400)

	email = (payload.get("email") or "").strip().lower()
	code = (payload.get("code") or "").strip()
	new_password = payload.get("new_password") or ""
	confirm_password = payload.get("confirm_password") or ""

	if not email or not code or not new_password:
		return JsonResponse({"error": "email, code and new_password are required."}, status=400)
	if new_password != confirm_password:
		return JsonResponse({"error": "Passwords do not match."}, status=400)

	user = User.objects.filter(email=email).first()
	if not user:
		return JsonResponse({"error": "User not found."}, status=404)
	if not user.password_reset_code or user.password_reset_code != code:
		return JsonResponse({"error": "Invalid reset code."}, status=400)
	if not user.password_reset_code_expires_at or user.password_reset_code_expires_at < timezone.now():
		return JsonResponse({"error": "Reset code expired."}, status=400)

	user.set_password(new_password)
	user.password_reset_code = ""
	user.password_reset_code_expires_at = None
	user.save(update_fields=["password", "password_reset_code", "password_reset_code_expires_at"])

	return JsonResponse({"message": "Password reset successful."})
