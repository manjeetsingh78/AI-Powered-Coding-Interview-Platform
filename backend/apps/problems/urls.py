from django.urls import path

from apps.problems.views import (
    problem_detail_view,
    problems_list_view,
    admin_create_problem_view,
    admin_problem_manage_view,
)

urlpatterns = [
    # Public/problem listing (GET)
    path("", problems_list_view, name="problems_list"),
    # Admin create problem (POST)
    path("admin/", admin_create_problem_view, name="admin_create_problem"),
    # Admin manage single problem (PUT, DELETE)
    path("admin/<int:problem_id>/", admin_problem_manage_view, name="admin_problem_manage"),
    path("<slug:slug>/", problem_detail_view, name="problem_detail"),
]
