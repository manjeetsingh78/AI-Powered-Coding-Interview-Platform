from django.urls import path

from apps.submissions.views import submission_history_view, submission_result_view, submit_code_view


urlpatterns = [
    path("submit/", submit_code_view, name="submit_code"),
    path("results/<int:submission_id>/", submission_result_view, name="submission_result"),
    path("history/", submission_history_view, name="submission_history"),
]
