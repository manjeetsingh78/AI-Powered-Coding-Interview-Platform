from django.urls import path

from apps.authentication.views import (
    admin_login_view,
    confirm_password_reset_view,
    login_view,
    logout_view,
    me_view,
    request_password_reset_view,
    request_verification_view,
    signup_view,
    verify_account_view,
)

urlpatterns = [
    path("signup/", signup_view, name="signup"),
    path("login/", login_view, name="login"),
    path("admin/login/", admin_login_view, name="admin_login"),
    path("request-verification/", request_verification_view, name="request_verification"),
    path("verify-account/", verify_account_view, name="verify_account"),
    path("request-password-reset/", request_password_reset_view, name="request_password_reset"),
    path("confirm-password-reset/", confirm_password_reset_view, name="confirm_password_reset"),
    path("logout/", logout_view, name="logout"),
    path("me/", me_view, name="me"),
]
