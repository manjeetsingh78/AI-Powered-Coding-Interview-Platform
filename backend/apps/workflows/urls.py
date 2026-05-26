from django.urls import path

from apps.workflows.views import (
    report_collection_view,
    slot_book_view,
    slot_cancel_view,
    slot_collection_view,
    slot_detail_view,
    test_draft_collection_view,
    test_draft_detail_view,
    upload_recording_view,
)

urlpatterns = [
    path("tests/", test_draft_collection_view, name="workflow_test_collection"),
    path("tests/<int:draft_id>/", test_draft_detail_view, name="workflow_test_detail"),
    path("slots/", slot_collection_view, name="workflow_slot_collection"),
    path("slots/<int:slot_id>/", slot_detail_view, name="workflow_slot_detail"),
    path("slots/<int:slot_id>/book/", slot_book_view, name="workflow_slot_book"),
    path("slots/<int:slot_id>/cancel/", slot_cancel_view, name="workflow_slot_cancel"),
    path("reports/", report_collection_view, name="workflow_report_collection"),
    path("recordings/<str:interview_id>/", upload_recording_view, name="workflow_upload_recording"),
]
