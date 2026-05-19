from django.urls import path

from apps.authentication.views import (
    admin_companies_view,
    admin_company_detail_view,
    admin_login_view,
    admin_user_detail_view,
    admin_users_view,
    confirm_password_reset_view,
    login_view,
    logout_view,
    me_view,
    refresh_view,
    request_password_reset_view,
    request_verification_view,
    signup_view,
    verify_account_view,
)

urlpatterns = [
    path("signup/", signup_view, name="signup"),
    path("login/", login_view, name="login"),
    path("admin/login/", admin_login_view, name="admin_login"),
    path("admin/users/", admin_users_view, name="admin_users"),
    path("admin/users/<int:user_id>/", admin_user_detail_view, name="admin_user_detail"),
    path("admin/companies/", admin_companies_view, name="admin_companies"),
    path("admin/companies/<int:company_id>/", admin_company_detail_view, name="admin_company_detail"),
    path("request-verification/", request_verification_view, name="request_verification"),
    path("verify-account/", verify_account_view, name="verify_account"),
    path("request-password-reset/", request_password_reset_view, name="request_password_reset"),
    path("confirm-password-reset/", confirm_password_reset_view, name="confirm_password_reset"),
    path("logout/", logout_view, name="logout"),
    path("refresh/", refresh_view, name="refresh"),
    path("me/", me_view, name="me"),
]
