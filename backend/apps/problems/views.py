import json
import re

from django.db import transaction
from django.http import JsonResponse
from django.utils.text import slugify
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.authentication.jwt_helpers import jwt_or_session
from apps.problems.models import Problem, ProblemTag, Tag, TestCase, Solution


def _parse_json_body(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return None


def _is_admin_user(user):
    return bool(user and user.is_authenticated and (user.is_staff or user.role == "admin"))


def _is_authenticated_user(user):
    return bool(user and user.is_authenticated)


def _request_user(request):
    return jwt_or_session(request)


def _unique_problem_slug(title: str, requested_slug: str = "") -> str:
    base_slug = slugify(requested_slug) or slugify(title) or "problem"
    slug = base_slug
    suffix = 2
    while Problem.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{suffix}"
        suffix += 1
    return slug


def _normalize_example(raw_example, index: int) -> dict | None:
    if not isinstance(raw_example, dict):
        return None

    example_input = str(raw_example.get("input") or raw_example.get("input_data") or "").strip()
    example_output = str(raw_example.get("output") or raw_example.get("expected_output") or "").strip()
    example_explanation = str(raw_example.get("explanation") or "").strip()

    if not example_input and not example_output and not example_explanation:
        return None

    return {
        "id": int(raw_example.get("id") or index + 1),
        "input": example_input,
        "output": example_output,
        "explanation": example_explanation,
    }


def _parse_legacy_problem_content(description: str) -> dict:
    raw_description = str(description or "").strip()
    if not raw_description:
        return {"statement": "", "examples": [], "constraints": [], "follow_up": ""}

    examples = []
    example_pattern = re.compile(
        r"Example\s*(\d+)\s*:\s*Input\s*:\s*([\s\S]*?)\s*Output\s*:\s*([\s\S]*?)"
        r"(?:\s*Explanation\s*:\s*([\s\S]*?))?"
        r"(?=(?:\s*Example\s*\d+\s*:|\s*Constraints?\s*:|\s*Follow\s*[- ]?up\s*:|$))",
        re.IGNORECASE,
    )
    for match in example_pattern.finditer(raw_description):
        examples.append(
            {
                "id": int(match.group(1) or len(examples) + 1),
                "input": (match.group(2) or "").strip(),
                "output": (match.group(3) or "").strip(),
                "explanation": (match.group(4) or "").strip(),
            }
        )

    constraints = []
    constraints_match = re.search(
        r"Constraints?\s*:\s*([\s\S]*?)(?=(?:\s*Follow\s*[- ]?up\s*:|$))",
        raw_description,
        flags=re.IGNORECASE,
    )
    if constraints_match:
        constraints = [
            item.strip()
            for item in re.split(r"\n|;|,(?=\s*[a-zA-Z0-9_])", constraints_match.group(1).strip())
            if item.strip()
        ]

    follow_up_match = re.search(r"Follow\s*[- ]?up\s*:\s*([\s\S]*?)$", raw_description, flags=re.IGNORECASE)
    follow_up = (follow_up_match.group(1) if follow_up_match else "").strip()

    statement = example_pattern.sub("", raw_description)
    statement = re.sub(
        r"Constraints?\s*:\s*[\s\S]*?(?=(?:\s*Follow\s*[- ]?up\s*:|$))",
        "",
        statement,
        flags=re.IGNORECASE,
    )
    statement = re.sub(r"Follow\s*[- ]?up\s*:\s*[\s\S]*$", "", statement, flags=re.IGNORECASE)
    statement = re.sub(r"\s{2,}", " ", statement).strip()

    return {
        "statement": statement,
        "examples": examples,
        "constraints": constraints,
        "follow_up": follow_up,
    }


def _serialize_problem_content(problem: Problem, visible_test_cases=None) -> dict:
    statement = (problem.problem_statement or problem.description or "").strip()
    examples = [
        normalized
        for index, raw_example in enumerate(problem.examples_json or [])
        if (normalized := _normalize_example(raw_example, index))
    ]
    constraints = [str(item).strip() for item in (problem.constraints_json or []) if str(item).strip()]
    follow_up = (problem.follow_up or "").strip()

    if not examples or not constraints or not follow_up:
        legacy_content = _parse_legacy_problem_content(problem.description)
        if not statement:
            statement = legacy_content["statement"]
        if not examples:
            examples = legacy_content["examples"]
        if not constraints:
            constraints = legacy_content["constraints"]
        if not follow_up:
            follow_up = legacy_content["follow_up"]

    if not examples and visible_test_cases is not None:
        examples = [
            {
                "id": index + 1,
                "input": test_case.input_data,
                "output": test_case.expected_output,
                "explanation": "",
            }
            for index, test_case in enumerate(list(visible_test_cases)[:3])
        ]

    if problem.time_limit_ms:
        constraints.append(f"Time limit: {problem.time_limit_ms} ms")
    if problem.memory_limit_mb:
        constraints.append(f"Memory limit: {problem.memory_limit_mb} MB")
    if not constraints:
        constraints.append("Refer to the problem statement for input and output limits.")

    return {
        "statement": statement,
        "examples": examples,
        "constraints": constraints,
        "follow_up": follow_up,
    }


def _serialize_problem(problem: Problem) -> dict:
    tags = list(problem.tags.values_list("name", flat=True))
    test_cases = [
        {
            "id": test_case.id,
            "input_data": test_case.input_data,
            "expected_output": test_case.expected_output,
            "is_sample": test_case.is_sample,
            "is_hidden": test_case.is_hidden,
            "order": test_case.order,
        }
        for test_case in problem.test_cases.all().order_by("order")
    ]

    return {
        "id": problem.id,
        "title": problem.title,
        "slug": problem.slug,
        "description": problem.description,
        "problem_statement": problem.problem_statement,
        "examples": problem.examples_json or [],
        "constraints": problem.constraints_json or [],
        "follow_up": problem.follow_up,
        "difficulty": problem.difficulty,
        "time_limit_ms": problem.time_limit_ms,
        "memory_limit_mb": problem.memory_limit_mb,
        "accepted_count": problem.accepted_count,
        "submission_count": problem.submission_count,
        "is_active": problem.is_active,
        "created_at": problem.created_at.isoformat(),
        "tags": tags,
        "test_cases": test_cases,
        "solutions": [
            {"language": s.language, "code": s.code} for s in problem.solutions.all()
        ],
    }


def _serialize_problem_summary(problem: Problem) -> dict:
    acceptance_rate = 0
    if problem.submission_count > 0:
        acceptance_rate = round((problem.accepted_count / problem.submission_count) * 100, 2)

    return {
        "id": problem.id,
        "title": problem.title,
        "slug": problem.slug,
        "difficulty": problem.difficulty,
        "time_limit_ms": problem.time_limit_ms,
        "memory_limit_mb": problem.memory_limit_mb,
        "accepted_count": problem.accepted_count,
        "submission_count": problem.submission_count,
        "acceptance_rate": acceptance_rate,
        "tags": list(problem.tags.values_list("name", flat=True)),
    }


def _serialize_problem_detail(problem: Problem, include_hidden_cases: bool = False) -> dict:
    if include_hidden_cases:
        test_cases = problem.test_cases.all().order_by("order")
    else:
        test_cases = problem.test_cases.filter(is_sample=True).order_by("order")
    test_cases = list(test_cases)
    content = _serialize_problem_content(problem, visible_test_cases=test_cases)

    return {
        "id": problem.id,
        "title": problem.title,
        "slug": problem.slug,
        "description": problem.description,
        "problem_statement": problem.problem_statement,
        "examples": problem.examples_json or [],
        "constraints": problem.constraints_json or [],
        "follow_up": problem.follow_up,
        "content": content,
        "difficulty": problem.difficulty,
        "time_limit_ms": problem.time_limit_ms,
        "memory_limit_mb": problem.memory_limit_mb,
        "tags": list(problem.tags.values_list("name", flat=True)),
        "test_cases": [
            {
                "id": test_case.id,
                "input_data": test_case.input_data,
                "expected_output": test_case.expected_output,
                "is_sample": test_case.is_sample,
                "is_hidden": test_case.is_hidden,
                "order": test_case.order,
            }
            for test_case in test_cases
        ],
        "solutions": [
            {"language": s.language, "code": s.code} for s in problem.solutions.all()
        ] if include_hidden_cases else [],
    }


@csrf_exempt
@require_http_methods(["GET", "POST"])
def problems_admin_panel_view(request):
    user = _request_user(request)

    if request.method == "GET":
        if not _is_authenticated_user(user):
            return JsonResponse({"error": "Authentication required."}, status=401)

        difficulty = (request.GET.get("difficulty") or "").strip().lower()
        search = (request.GET.get("search") or "").strip()

        problems = (
            Problem.objects.prefetch_related("tags")
            .order_by("-created_at")
        )

        # If the user is NOT an admin, filter by is_active=True
        if not _is_admin_user(user):
            problems = problems.filter(is_active=True)


        if difficulty in {Problem.DIFFICULTY_EASY, Problem.DIFFICULTY_MEDIUM, Problem.DIFFICULTY_HARD}:
            problems = problems.filter(difficulty=difficulty)

        if search:
            problems = problems.filter(title__icontains=search)

        return JsonResponse({"problems": [_serialize_problem_summary(problem) for problem in problems]})

    if not _is_authenticated_user(user):
        return JsonResponse({"error": "Authentication required."}, status=401)
    if not _is_admin_user(user):
        return JsonResponse({"error": "Admin access required."}, status=403)

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    title = (payload.get("title") or "").strip()
    requested_slug = (payload.get("slug") or "").strip()
    description = (payload.get("description") or "").strip()
    problem_statement = (payload.get("problem_statement") or "").strip()
    difficulty = (payload.get("difficulty") or "").strip().lower()
    time_limit_ms = payload.get("time_limit_ms", 1000)
    memory_limit_mb = payload.get("memory_limit_mb", 128)
    examples_payload = payload.get("examples") or []
    constraints_payload = payload.get("constraints") or []
    follow_up = (payload.get("follow_up") or "").strip()
    is_active = bool(payload.get("is_active", True))
    tags_payload = payload.get("tags") or []
    test_cases_payload = payload.get("test_cases") or []
    solutions_payload = payload.get("solutions") or []

    allowed_difficulties = {
        Problem.DIFFICULTY_EASY,
        Problem.DIFFICULTY_MEDIUM,
        Problem.DIFFICULTY_HARD,
    }

    if not title:
        return JsonResponse({"error": "title is required."}, status=400)
    if not description and not problem_statement:
        return JsonResponse(
            {"error": "Either description or problem_statement is required."},
            status=400,
        )
    if difficulty not in allowed_difficulties:
        return JsonResponse({"error": "difficulty must be easy, medium, or hard."}, status=400)

    try:
        time_limit_ms = int(time_limit_ms)
        memory_limit_mb = int(memory_limit_mb)
    except (TypeError, ValueError):
        return JsonResponse({"error": "time_limit_ms and memory_limit_mb must be numbers."}, status=400)

    if time_limit_ms <= 0 or memory_limit_mb <= 0:
        return JsonResponse(
            {"error": "time_limit_ms and memory_limit_mb must be greater than 0."},
            status=400,
        )

    if not isinstance(tags_payload, list):
        return JsonResponse({"error": "tags must be an array of strings."}, status=400)
    if not isinstance(test_cases_payload, list):
        return JsonResponse({"error": "test_cases must be an array."}, status=400)
    if not isinstance(solutions_payload, list):
        return JsonResponse({"error": "solutions must be an array."}, status=400)
    if not isinstance(examples_payload, list):
        return JsonResponse({"error": "examples must be an array."}, status=400)
    if not isinstance(constraints_payload, list):
        return JsonResponse({"error": "constraints must be an array of strings."}, status=400)

    normalized_tags = []
    for raw_tag in tags_payload:
        tag_name = str(raw_tag).strip()
        if tag_name and tag_name.lower() not in {tag.lower() for tag in normalized_tags}:
            normalized_tags.append(tag_name)

    normalized_examples = []
    for raw_example in examples_payload:
        if not isinstance(raw_example, dict):
            continue

        example_input = str(raw_example.get("input") or "").strip()
        example_output = str(raw_example.get("output") or "").strip()
        example_explanation = str(raw_example.get("explanation") or "").strip()

        if not example_input and not example_output and not example_explanation:
            continue

        normalized_examples.append(
            {
                "input": example_input,
                "output": example_output,
                "explanation": example_explanation,
            }
        )

    normalized_constraints = [
        str(item).strip() for item in constraints_payload if str(item).strip()
    ]

    with transaction.atomic():
        problem = Problem.objects.create(
            title=title,
            slug=_unique_problem_slug(title, requested_slug),
            description=description or problem_statement,
            problem_statement=problem_statement or description,
            examples_json=normalized_examples,
            constraints_json=normalized_constraints,
            follow_up=follow_up,
            difficulty=difficulty,
            time_limit_ms=time_limit_ms,
            memory_limit_mb=memory_limit_mb,
            is_active=is_active,
        )

        # persist provided solutions (accept code strings per language)
        allowed_languages = {c[0] for c in Solution.LANGUAGE_CHOICES}
        for raw_solution in solutions_payload:
            if not isinstance(raw_solution, dict):
                continue
            language = (raw_solution.get("language") or "").strip().lower()
            code = raw_solution.get("code") or ""
            if language not in allowed_languages or not isinstance(code, str) or not code.strip():
                continue

            Solution.objects.update_or_create(
                problem=problem,
                language=language,
                defaults={"code": code},
            )

        for tag_name in normalized_tags:
            tag_slug = slugify(tag_name)
            tag, _ = Tag.objects.get_or_create(
                slug=tag_slug,
                defaults={"name": tag_name},
            )
            if tag.name != tag_name:
                tag.name = tag_name
                tag.save(update_fields=["name"])
            ProblemTag.objects.get_or_create(problem=problem, tag=tag)

        for index, raw_case in enumerate(test_cases_payload):
            if not isinstance(raw_case, dict):
                continue

            input_data = str(raw_case.get("input_data") or "")
            expected_output = str(raw_case.get("expected_output") or "")
            if not input_data and not expected_output:
                continue

            order = raw_case.get("order", index)
            try:
                order = int(order)
            except (TypeError, ValueError):
                order = index

            TestCase.objects.create(
                problem=problem,
                input_data=input_data,
                expected_output=expected_output,
                is_sample=bool(raw_case.get("is_sample", False)),
                is_hidden=bool(raw_case.get("is_hidden", True)),
                order=order,
            )

    problem = Problem.objects.prefetch_related("tags", "test_cases").get(id=problem.id)
    return JsonResponse(
        {
            "message": "Problem created successfully.",
            "problem": _serialize_problem(problem),
        },
        status=201,
    )


def problems_list_view(request):
    return problems_admin_panel_view(request)


def admin_create_problem_view(request):
    return problems_admin_panel_view(request)


@require_http_methods(["GET"])
def problem_detail_view(request, slug: str):
    user = _request_user(request)
    if not _is_authenticated_user(user):
        return JsonResponse({"error": "Authentication required."}, status=401)

    problem = (
        Problem.objects.prefetch_related("tags", "test_cases")
        .filter(slug=slug, is_active=True)
        .first()
    )
    if not problem:
        return JsonResponse({"error": "Problem not found."}, status=404)

    include_hidden = _is_admin_user(user)
    return JsonResponse({"problem": _serialize_problem_detail(problem, include_hidden_cases=include_hidden)})


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def admin_problem_manage_view(request, problem_id: int):
    user = _request_user(request)
    if not _is_authenticated_user(user):
        return JsonResponse({"error": "Authentication required."}, status=401)
    if not _is_admin_user(user):
        return JsonResponse({"error": "Admin access required."}, status=403)

    try:
        problem = Problem.objects.get(id=problem_id)
    except Problem.DoesNotExist:
        return JsonResponse({"error": "Problem not found."}, status=404)

    if request.method == "DELETE":
        problem.delete()
        return JsonResponse({"message": "Problem deleted successfully."})

    # PUT — full update
    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    title = (payload.get("title") or "").strip()
    description = (payload.get("description") or "").strip()
    problem_statement = (payload.get("problem_statement") or "").strip()
    difficulty = (payload.get("difficulty") or "").strip().lower()
    is_active = bool(payload.get("is_active", True))

    allowed_difficulties = {
        Problem.DIFFICULTY_EASY,
        Problem.DIFFICULTY_MEDIUM,
        Problem.DIFFICULTY_HARD,
    }

    if not title:
        return JsonResponse({"error": "title is required."}, status=400)
    if not description and not problem_statement:
        return JsonResponse({"error": "Either description or problem_statement is required."}, status=400)
    if difficulty not in allowed_difficulties:
        return JsonResponse({"error": "difficulty must be easy, medium, or hard."}, status=400)

    try:
        time_limit_ms = int(payload.get("time_limit_ms", problem.time_limit_ms))
        memory_limit_mb = int(payload.get("memory_limit_mb", problem.memory_limit_mb))
    except (TypeError, ValueError):
        return JsonResponse({"error": "time_limit_ms and memory_limit_mb must be numbers."}, status=400)

    if time_limit_ms <= 0 or memory_limit_mb <= 0:
        return JsonResponse({"error": "time_limit_ms and memory_limit_mb must be greater than 0."}, status=400)

    examples_payload = payload.get("examples") or []
    constraints_payload = payload.get("constraints") or []
    tags_payload = payload.get("tags") or []
    test_cases_payload = payload.get("test_cases") or []
    solutions_payload = payload.get("solutions") or []

    if not isinstance(tags_payload, list):
        return JsonResponse({"error": "tags must be an array of strings."}, status=400)
    if not isinstance(test_cases_payload, list):
        return JsonResponse({"error": "test_cases must be an array."}, status=400)
    if not isinstance(examples_payload, list):
        return JsonResponse({"error": "examples must be an array."}, status=400)
    if not isinstance(constraints_payload, list):
        return JsonResponse({"error": "constraints must be an array of strings."}, status=400)
    if not isinstance(solutions_payload, list):
        return JsonResponse({"error": "solutions must be an array."}, status=400)

    normalized_tags = []
    for raw_tag in tags_payload:
        tag_name = str(raw_tag).strip()
        if tag_name and tag_name.lower() not in {tag.lower() for tag in normalized_tags}:
            normalized_tags.append(tag_name)

    normalized_examples = []
    for raw_example in examples_payload:
        if not isinstance(raw_example, dict):
            continue
        example_input = str(raw_example.get("input") or "").strip()
        example_output = str(raw_example.get("output") or "").strip()
        example_explanation = str(raw_example.get("explanation") or "").strip()
        if not example_input and not example_output and not example_explanation:
            continue
        normalized_examples.append({
            "input": example_input,
            "output": example_output,
            "explanation": example_explanation,
        })

    normalized_constraints = [
        str(item).strip() for item in constraints_payload if str(item).strip()
    ]

    with transaction.atomic():
        problem.title = title
        if problem.title != title or not problem.slug:
            problem.slug = _unique_problem_slug(title)
        problem.description = description or problem_statement
        problem.problem_statement = problem_statement or description
        problem.examples_json = normalized_examples
        problem.constraints_json = normalized_constraints
        problem.follow_up = (payload.get("follow_up") or "").strip()
        problem.difficulty = difficulty
        problem.time_limit_ms = time_limit_ms
        problem.memory_limit_mb = memory_limit_mb
        problem.is_active = is_active
        problem.save()

        # tags
        ProblemTag.objects.filter(problem=problem).delete()
        for tag_name in normalized_tags:
            tag_slug = slugify(tag_name)
            tag, _ = Tag.objects.get_or_create(slug=tag_slug, defaults={"name": tag_name})
            if tag.name != tag_name:
                tag.name = tag_name
                tag.save(update_fields=["name"])
            ProblemTag.objects.get_or_create(problem=problem, tag=tag)

        # test cases
        problem.test_cases.all().delete()
        for index, raw_case in enumerate(test_cases_payload):
            if not isinstance(raw_case, dict):
                continue
            input_data = str(raw_case.get("input_data") or "")
            expected_output = str(raw_case.get("expected_output") or "")
            if not input_data and not expected_output:
                continue
            order = raw_case.get("order", index)
            try:
                order = int(order)
            except (TypeError, ValueError):
                order = index
            TestCase.objects.create(
                problem=problem,
                input_data=input_data,
                expected_output=expected_output,
                is_sample=bool(raw_case.get("is_sample", False)),
                is_hidden=bool(raw_case.get("is_hidden", True)),
                order=order,
            )

        # solutions
        allowed_languages = {c[0] for c in Solution.LANGUAGE_CHOICES}
        problem.solutions.all().delete()
        for raw_solution in solutions_payload:
            if not isinstance(raw_solution, dict):
                continue
            language = (raw_solution.get("language") or "").strip().lower()
            code = raw_solution.get("code") or ""
            if language not in allowed_languages or not isinstance(code, str) or not code.strip():
                continue
            Solution.objects.create(problem=problem, language=language, code=code)

    problem = Problem.objects.prefetch_related("tags", "test_cases", "solutions").get(id=problem.id)
    return JsonResponse({
        "message": "Problem updated successfully.",
        "problem": _serialize_problem(problem),
    })
