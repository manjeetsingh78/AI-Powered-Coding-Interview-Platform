"""JWT helper utilities for function-based auth views."""

import functools
import json
import re

from django.conf import settings
from django.http import JsonResponse
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError


def get_jwt_user(request):
    """Extract and validate user from JWT Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        token = request.COOKIES.get("access_token")

    if not token:
        return None

    try:
        from rest_framework_simplejwt.tokens import AccessToken
        access = AccessToken(token)
        from apps.authentication.models import User
        return User.objects.filter(pk=access["user_id"]).first()
    except TokenError:
        return None


def jwt_required(view_func):
    """Decorator to require valid JWT for a view."""

    @functools.wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = get_jwt_user(request)
        if user is None:
            return JsonResponse({"error": "Authentication required."}, status=401)
        request.jwt_user = user
        return view_func(request, *args, **kwargs)

    return wrapper


def jwt_or_session(request):
    """Return user from JWT or fall back to session auth (for testing)."""
    user = get_jwt_user(request)
    if user:
        return user
    if hasattr(request, "user") and request.user.is_authenticated:
        return request.user
    return None


def set_jwt_tokens(response, user):
    """Attach JWT access/refresh tokens as httpOnly cookies."""
    refresh = RefreshToken.for_user(user)
    data = response.content.decode("utf-8")
    payload = json.loads(data)
    response.content = json.dumps(payload).encode("utf-8")
    _set_auth_cookie(response, "access_token", str(refresh.access_token), max_age=60 * 30)
    _set_auth_cookie(response, "refresh_token", str(refresh), max_age=60 * 60 * 24 * 7)
    return response


def clear_jwt_cookies(response):
    response.delete_cookie("access_token", path="/", samesite="Lax")
    response.delete_cookie("refresh_token", path="/", samesite="Lax")
    return response


def _set_auth_cookie(response, name, value, max_age):
    response.set_cookie(
        name,
        value,
        max_age=max_age,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        path="/",
    )


# Validation helpers

EMAIL_PATTERN = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
USERNAME_PATTERN = re.compile(r'^[\w.@+-]+$')
MAX_USERNAME_LENGTH = 150
MAX_PASSWORD_LENGTH = 128
MIN_PASSWORD_LENGTH = 8


def validate_email(value: str):
    if not value or not isinstance(value, str):
        return "Email is required."
    if len(value) > 254:
        return "Email must be 254 characters or fewer."
    if not EMAIL_PATTERN.match(value):
        return "Invalid email format."
    return None


def validate_username(value: str):
    if not value or not isinstance(value, str):
        return "Username is required."
    stripped = value.strip()
    if len(stripped) < 3:
        return "Username must be at least 3 characters."
    if len(stripped) > MAX_USERNAME_LENGTH:
        return f"Username must be {MAX_USERNAME_LENGTH} characters or fewer."
    if not USERNAME_PATTERN.match(stripped):
        return "Username may only contain letters, digits and @/./+/-/_ ."
    return None


def validate_password(value: str):
    if not value or not isinstance(value, str):
        return "Password is required."
    if len(value) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    if len(value) > MAX_PASSWORD_LENGTH:
        return f"Password must be {MAX_PASSWORD_LENGTH} characters or fewer."
    return None
