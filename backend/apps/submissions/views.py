import json

from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.authentication.jwt_helpers import jwt_or_session
from apps.problems.models import Problem
from apps.submissions.executors import ExecutionBackendUnavailable, ExecutionServiceError, execute_code
from apps.submissions.models import ExecutionResult, Submission


def _parse_json_body(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return None


def _request_user(request):
    return jwt_or_session(request)


def _normalize_output(value):
    return "\n".join(line.rstrip() for line in str(value or "").strip().splitlines()).strip()


def _serialize_execution_result(result):
    return {
        "id": result.id,
        "input": result.input_data,
        "input_data": result.input_data,
        "expected": result.expected_output,
        "expected_output": result.expected_output,
        "actual_output": result.actual_output,
        "stderr": result.stderr,
        "passed": result.passed,
        "execution_time_ms": result.execution_time_ms,
    }


def _serialize_submission(submission, include_code=False):
    data = {
        "id": submission.id,
        "submission_id": submission.id,
        "problem_id": submission.problem_id,
        "problem_slug": submission.problem.slug,
        "problem_title": submission.problem.title,
        "difficulty": submission.problem.difficulty,
        "language": submission.language,
        "status": submission.status,
        "score": submission.score,
        "run_mode": submission.run_mode,
        "stdout": submission.stdout,
        "stderr": submission.stderr,
        "submitted_at": submission.submitted_at.isoformat(),
        "tests": [_serialize_execution_result(item) for item in submission.execution_results.all()],
    }
    if include_code:
        data["code"] = submission.code
    return data


def _resolve_test_cases(problem, payload, run_mode):
    if run_mode == Submission.RUN_CUSTOM:
        custom_cases = payload.get("custom_test_cases") or []
        if isinstance(custom_cases, list) and custom_cases:
            return [
                {
                    "test_case": None,
                    "input_data": str(item.get("input_data") or item.get("input") or ""),
                    "expected_output": str(item.get("expected_output") or item.get("expected") or ""),
                }
                for item in custom_cases
                if isinstance(item, dict)
            ]

    return [
        {
            "test_case": test_case,
            "input_data": test_case.input_data,
            "expected_output": test_case.expected_output,
        }
        for test_case in problem.test_cases.all().order_by("order", "id")
    ]


def _evaluate_submission(submission, test_cases):
    timeout_seconds = max(1, min(10, int(submission.problem.time_limit_ms / 1000) + 1))
    passed_count = 0
    graded_count = 0
    stdout_tail = ""
    stderr_tail = ""
    final_status = Submission.STATUS_ACCEPTED

    for index, test_case in enumerate(test_cases):
        result = execute_code(submission.language, submission.code, test_case["input_data"], timeout_seconds)
        actual = _normalize_output(result["stdout"])
        expected = _normalize_output(test_case["expected_output"])
        has_expected = expected != ""
        passed = None

        if has_expected:
            graded_count += 1
            passed = actual == expected
            if passed:
                passed_count += 1

        if result.get("timed_out"):
            final_status = Submission.STATUS_TIME_LIMIT
        elif result.get("compile_error"):
            final_status = Submission.STATUS_COMPILE_ERROR
        elif result["returncode"] != 0 and final_status == Submission.STATUS_ACCEPTED:
            final_status = Submission.STATUS_RUNTIME_ERROR
        elif has_expected and not passed and final_status == Submission.STATUS_ACCEPTED:
            final_status = Submission.STATUS_WRONG_ANSWER

        stdout_tail = result["stdout"]
        stderr_tail = result["stderr"]
        ExecutionResult.objects.create(
            submission=submission,
            test_case=test_case["test_case"],
            input_data=test_case["input_data"],
            expected_output=test_case["expected_output"],
            actual_output=actual,
            stderr=result["stderr"],
            passed=passed,
            execution_time_ms=result["elapsed_ms"],
            order=index,
        )

        if final_status in {Submission.STATUS_TIME_LIMIT, Submission.STATUS_COMPILE_ERROR}:
            break

    if submission.run_mode == Submission.RUN_CUSTOM:
        final_status = Submission.STATUS_CUSTOM_RUN
        score = 0
    elif graded_count:
        score = round((passed_count / graded_count) * 100)
        if score < 100 and final_status == Submission.STATUS_ACCEPTED:
            final_status = Submission.STATUS_WRONG_ANSWER
    else:
        score = 0
        if final_status == Submission.STATUS_ACCEPTED:
            final_status = Submission.STATUS_WRONG_ANSWER

    submission.status = final_status
    submission.score = score
    submission.stdout = stdout_tail
    submission.stderr = stderr_tail
    submission.save(update_fields=["status", "score", "stdout", "stderr"])


@csrf_exempt
@require_http_methods(["POST"])
def submit_code_view(request):
    user = _request_user(request)
    if not user or not user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    problem_slug = (payload.get("problem_slug") or payload.get("slug") or "").strip()
    language = (payload.get("language") or "").strip().lower()
    code = payload.get("code") or ""
    run_mode = (payload.get("run_mode") or Submission.RUN_SUBMIT).strip().lower()

    if not problem_slug:
        return JsonResponse({"error": "problem_slug is required."}, status=400)
    if language not in dict(Submission.LANGUAGE_CHOICES):
        return JsonResponse({"error": "Unsupported language."}, status=400)
    if not isinstance(code, str) or not code.strip():
        return JsonResponse({"error": "code is required."}, status=400)
    if run_mode not in {Submission.RUN_SUBMIT, Submission.RUN_CUSTOM}:
        return JsonResponse({"error": "Invalid run_mode."}, status=400)

    problem = Problem.objects.prefetch_related("test_cases").filter(slug=problem_slug, is_active=True).first()
    if not problem:
        return JsonResponse({"error": "Problem not found."}, status=404)

    test_cases = _resolve_test_cases(problem, payload, run_mode)
    if not test_cases:
        return JsonResponse({"error": "No test cases are available for this run."}, status=400)

    with transaction.atomic():
        submission = Submission.objects.create(
            user=user,
            problem=problem,
            language=language,
            code=code,
            run_mode=run_mode,
        )

    try:
        _evaluate_submission(submission, test_cases)
    except ExecutionBackendUnavailable as exc:
        submission.delete()
        return JsonResponse({"error": str(exc)}, status=503)
    except ExecutionServiceError as exc:
        submission.delete()
        return JsonResponse({"error": str(exc)}, status=502)
    submission = Submission.objects.select_related("problem").prefetch_related("execution_results").get(id=submission.id)

    return JsonResponse(
        {
            "message": "Submission evaluated.",
            "submission_id": submission.id,
            "submission": _serialize_submission(submission, include_code=True),
        },
        status=201,
    )


@require_http_methods(["GET"])
def submission_result_view(request, submission_id):
    user = _request_user(request)
    if not user or not user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    submission = (
        Submission.objects.select_related("problem", "user")
        .prefetch_related("execution_results")
        .filter(id=submission_id)
        .first()
    )
    if not submission:
        return JsonResponse({"error": "Submission result not found."}, status=404)
    if submission.user_id != user.id and getattr(user, "role", "") not in {"admin", "recruiter", "interviewer"}:
        return JsonResponse({"error": "You are not allowed to view this submission."}, status=403)

    return JsonResponse(_serialize_submission(submission, include_code=True))


@require_http_methods(["GET"])
def submission_history_view(request):
    user = _request_user(request)
    if not user or not user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    problem_slug = (request.GET.get("problem_slug") or "").strip()
    queryset = Submission.objects.select_related("problem").prefetch_related("execution_results").order_by("-submitted_at")

    if getattr(user, "role", "") not in {"admin", "recruiter", "interviewer"}:
        queryset = queryset.filter(user=user)

    if problem_slug:
        queryset = queryset.filter(problem__slug=problem_slug)

    submissions = list(queryset[:100])
    return JsonResponse({"submissions": [_serialize_submission(item) for item in submissions]})
