import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.problems.models import Problem, TestCase as ProblemTestCase
from apps.submissions.models import Submission


class SubmissionApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="candidate",
            email="candidate@example.com",
            password="StrongPass123!",
            role="candidate",
            is_verified=True,
        )
        self.problem = Problem.objects.create(
            title="Echo",
            slug="echo",
            description="Print input.",
            difficulty=Problem.DIFFICULTY_EASY,
            is_active=True,
        )
        ProblemTestCase.objects.create(
            problem=self.problem,
            input_data="hello",
            expected_output="hello",
            order=0,
        )
        self.client.force_login(self.user)

    def _payload(self):
        return {
            "problem_slug": self.problem.slug,
            "language": Submission.LANGUAGE_PYTHON,
            "code": "print(input())",
            "run_mode": Submission.RUN_SUBMIT,
        }

    @override_settings(CODE_EXECUTION_BACKEND="disabled", ALLOWED_HOSTS=["testserver"], SECURE_SSL_REDIRECT=False)
    def test_submit_fails_closed_without_executor_backend(self):
        response = self.client.post(
            "/api/submissions/submit/",
            data=json.dumps(self._payload()),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(Submission.objects.count(), 0)

    @override_settings(CODE_EXECUTION_BACKEND="piston", ALLOWED_HOSTS=["testserver"], SECURE_SSL_REDIRECT=False)
    @patch("apps.submissions.views.execute_code")
    def test_submit_records_result_from_configured_executor(self, execute_code):
        execute_code.return_value = {
            "returncode": 0,
            "stdout": "hello\n",
            "stderr": "",
            "elapsed_ms": 3,
            "timed_out": False,
            "compile_error": False,
        }

        response = self.client.post(
            "/api/submissions/submit/",
            data=json.dumps(self._payload()),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        submission = Submission.objects.get()
        self.assertEqual(submission.status, Submission.STATUS_ACCEPTED)
        self.assertEqual(submission.score, 100)
        self.assertEqual(submission.execution_results.count(), 1)
