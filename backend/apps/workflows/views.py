import json

from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.authentication.models import User
from apps.problems.models import Problem
from apps.workflows.models import CandidateReport, InterviewSlot, RecruiterTestDraft, RecruiterTestDraftProblem, InterviewRecording


def _parse_json_body(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return None


def _is_authenticated(user):
    return bool(user and user.is_authenticated)


def _is_recruiter(user):
    return bool(
        _is_authenticated(user)
        and user.role in {User.ROLE_RECRUITER, User.ROLE_INTERVIEWER_LEGACY, User.ROLE_ADMIN}
    )


def _serialize_draft(draft):
    draft_problems = list(draft.draft_problems.select_related("problem"))
    return {
        "id": draft.id,
        "title": draft.title,
        "duration_minutes": draft.duration_minutes,
        "created_at": draft.created_at.isoformat(),
        "problems": [
            {
                "id": item.problem.id,
                "title": item.problem.title,
                "slug": item.problem.slug,
                "difficulty": item.problem.difficulty,
                "time_limit_ms": item.problem.time_limit_ms,
            }
            for item in draft_problems
        ],
    }


def _serialize_slot(slot):
    return {
        "id": slot.id,
        "label": slot.label,
        "recruiter_id": slot.recruiter_id,
        "recruiter_name": slot.recruiter.username,
        "is_booked": bool(slot.booked_by_id),
        "booked_by_id": slot.booked_by_id,
        "booked_by_name": slot.booked_by.username if slot.booked_by_id else "",
        "created_at": slot.created_at.isoformat(),
    }


def _serialize_report(report):
    return {
        "id": report.id,
        "candidate_name": report.candidate_name,
        "score": report.score,
        "status": report.status,
        "verdict": report.verdict,
        "notes": report.notes,
        "updated_at": report.updated_at.isoformat(),
    }


@csrf_exempt
@require_http_methods(["GET", "POST"])
def test_draft_collection_view(request):
    if not _is_authenticated(request.user):
        return JsonResponse({"error": "Authentication required."}, status=401)

    if request.method == "GET":
        if _is_recruiter(request.user):
            drafts = RecruiterTestDraft.objects.filter(recruiter=request.user).prefetch_related("draft_problems__problem")
        else:
            drafts = RecruiterTestDraft.objects.all().prefetch_related("draft_problems__problem")[:200]
        return JsonResponse({"drafts": [_serialize_draft(draft) for draft in drafts]})

    if not _is_recruiter(request.user):
        return JsonResponse({"error": "Recruiter access required."}, status=403)

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    title = (payload.get("title") or "").strip()
    duration_minutes = payload.get("duration_minutes", 60)
    problem_ids = payload.get("problem_ids") or []

    if not title:
        return JsonResponse({"error": "title is required."}, status=400)
    if not isinstance(problem_ids, list) or not problem_ids:
        return JsonResponse({"error": "problem_ids must contain at least one problem."}, status=400)

    try:
        duration_minutes = int(duration_minutes)
    except (TypeError, ValueError):
        return JsonResponse({"error": "duration_minutes must be a number."}, status=400)

    if duration_minutes < 15:
        return JsonResponse({"error": "duration_minutes must be at least 15."}, status=400)

    problem_map = {problem.id: problem for problem in Problem.objects.filter(id__in=problem_ids, is_active=True)}
    ordered_ids = [pid for pid in problem_ids if pid in problem_map]
    if not ordered_ids:
        return JsonResponse({"error": "No valid active problems were selected."}, status=400)

    with transaction.atomic():
        draft = RecruiterTestDraft.objects.create(
            recruiter=request.user,
            title=title,
            duration_minutes=duration_minutes,
        )
        for order, problem_id in enumerate(ordered_ids):
            RecruiterTestDraftProblem.objects.create(draft=draft, problem_id=problem_id, order=order)

    draft = RecruiterTestDraft.objects.prefetch_related("draft_problems__problem").get(id=draft.id)
    return JsonResponse({"message": "Draft created.", "draft": _serialize_draft(draft)}, status=201)


@csrf_exempt
@require_http_methods(["GET", "DELETE"])
def test_draft_detail_view(request, draft_id):
    if not _is_authenticated(request.user):
        return JsonResponse({"error": "Authentication required."}, status=401)

    draft = RecruiterTestDraft.objects.prefetch_related("draft_problems__problem").filter(id=draft_id).first()
    if not draft:
        return JsonResponse({"error": "Draft not found."}, status=404)

    if request.method == "GET":
        return JsonResponse({"draft": _serialize_draft(draft)})

    if not _is_recruiter(request.user) or draft.recruiter_id != request.user.id:
        return JsonResponse({"error": "Only draft owner can delete this draft."}, status=403)

    draft.delete()
    return JsonResponse({"message": "Draft deleted."})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def slot_collection_view(request):
    if not _is_authenticated(request.user):
        return JsonResponse({"error": "Authentication required."}, status=401)

    if request.method == "GET":
        slots = InterviewSlot.objects.select_related("recruiter", "booked_by").all()
        return JsonResponse({"slots": [_serialize_slot(slot) for slot in slots]})

    if not _is_recruiter(request.user):
        return JsonResponse({"error": "Recruiter access required."}, status=403)

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    label = (payload.get("label") or "").strip()
    if not label:
        return JsonResponse({"error": "label is required."}, status=400)

    slot = InterviewSlot.objects.create(recruiter=request.user, label=label)
    slot = InterviewSlot.objects.select_related("recruiter", "booked_by").get(id=slot.id)
    return JsonResponse({"message": "Slot created.", "slot": _serialize_slot(slot)}, status=201)


@csrf_exempt
@require_http_methods(["DELETE"])
def slot_detail_view(request, slot_id):
    if not _is_authenticated(request.user):
        return JsonResponse({"error": "Authentication required."}, status=401)

    slot = InterviewSlot.objects.filter(id=slot_id).first()
    if not slot:
        return JsonResponse({"error": "Slot not found."}, status=404)

    if not _is_recruiter(request.user) or slot.recruiter_id != request.user.id:
        return JsonResponse({"error": "Only slot owner can delete this slot."}, status=403)

    slot.delete()
    return JsonResponse({"message": "Slot deleted."})


@csrf_exempt
@require_http_methods(["POST"])
def slot_book_view(request, slot_id):
    if not _is_authenticated(request.user):
        return JsonResponse({"error": "Authentication required."}, status=401)

    if _is_recruiter(request.user):
        return JsonResponse({"error": "Recruiters cannot book candidate slots."}, status=403)

    slot = InterviewSlot.objects.select_related("recruiter", "booked_by").filter(id=slot_id).first()
    if not slot:
        return JsonResponse({"error": "Slot not found."}, status=404)
    if slot.booked_by_id:
        return JsonResponse({"error": "Slot already booked."}, status=400)

    slot.booked_by = request.user
    slot.save(update_fields=["booked_by"])
    return JsonResponse({"message": "Slot booked.", "slot": _serialize_slot(slot)})


@csrf_exempt
@require_http_methods(["POST"])
def slot_cancel_view(request, slot_id):
    if not _is_authenticated(request.user):
        return JsonResponse({"error": "Authentication required."}, status=401)

    slot = InterviewSlot.objects.select_related("recruiter", "booked_by").filter(id=slot_id).first()
    if not slot:
        return JsonResponse({"error": "Slot not found."}, status=404)

    can_cancel = False
    if _is_recruiter(request.user) and slot.recruiter_id == request.user.id:
        can_cancel = True
    if slot.booked_by_id == request.user.id:
        can_cancel = True

    if not can_cancel:
        return JsonResponse({"error": "You are not allowed to cancel this slot."}, status=403)

    slot.booked_by = None
    slot.save(update_fields=["booked_by"])
    return JsonResponse({"message": "Slot booking cancelled.", "slot": _serialize_slot(slot)})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def report_collection_view(request):
    if not _is_authenticated(request.user):
        return JsonResponse({"error": "Authentication required."}, status=401)
    if not _is_recruiter(request.user):
        return JsonResponse({"error": "Recruiter access required."}, status=403)

    if request.method == "GET":
        reports = CandidateReport.objects.filter(recruiter=request.user)
        return JsonResponse({"reports": [_serialize_report(report) for report in reports]})

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    candidate_name = (payload.get("candidate_name") or "").strip()
    if not candidate_name:
        return JsonResponse({"error": "candidate_name is required."}, status=400)

    score = payload.get("score", 0)
    try:
        score = int(score)
    except (TypeError, ValueError):
        score = 0

    defaults = {
        "score": max(0, score),
        "status": (payload.get("status") or "").strip(),
        "verdict": (payload.get("verdict") or "").strip(),
        "notes": payload.get("notes") or "",
    }
    report, _ = CandidateReport.objects.update_or_create(
        recruiter=request.user,
        candidate_name=candidate_name,
        defaults=defaults,
    )

    return JsonResponse({"message": "Report saved.", "report": _serialize_report(report)})

@csrf_exempt
def upload_recording_view(request, interview_id):
    if not _is_authenticated(request.user):
        return JsonResponse({"error": "Authentication required."}, status=41)
    
    video_file = request.FILES.get('video')
    if not video_file:
        return JsonResponse({"error": "No video file found."}, status=400)

    recording = InterviewRecording.objects.create(
        interview_id=interview_id,
        user=request.user,
        video_file=video_file
    )
    recording.save()

    return JsonResponse({"message": "Recording uploaded successfully."})
