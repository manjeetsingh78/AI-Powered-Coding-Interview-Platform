"""Middleware for bridging JWT auth into function-based Django views."""

from apps.authentication.jwt_helpers import get_jwt_user


class JWTAuthenticationMiddleware:
    """Populate request.user from a valid Bearer token when present."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        jwt_user = get_jwt_user(request)
        if jwt_user is not None:
            request.user = jwt_user
        return self.get_response(request)
