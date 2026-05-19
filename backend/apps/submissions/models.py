from django.conf import settings
from django.db import models

from apps.problems.models import Problem, TestCase


class Submission(models.Model):
    STATUS_PENDING = "Pending"
    STATUS_ACCEPTED = "Accepted"
    STATUS_WRONG_ANSWER = "Wrong Answer"
    STATUS_RUNTIME_ERROR = "Runtime Error"
    STATUS_COMPILE_ERROR = "Compile Error"
    STATUS_TIME_LIMIT = "Time Limit Exceeded"
    STATUS_CUSTOM_RUN = "Custom Run"

    RUN_SUBMIT = "submit"
    RUN_CUSTOM = "custom"

    LANGUAGE_PYTHON = "python"
    LANGUAGE_JAVASCRIPT = "javascript"
    LANGUAGE_CPP = "cpp"
    LANGUAGE_JAVA = "java"
    LANGUAGE_GO = "go"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_WRONG_ANSWER, "Wrong Answer"),
        (STATUS_RUNTIME_ERROR, "Runtime Error"),
        (STATUS_COMPILE_ERROR, "Compile Error"),
        (STATUS_TIME_LIMIT, "Time Limit Exceeded"),
        (STATUS_CUSTOM_RUN, "Custom Run"),
    )

    RUN_MODE_CHOICES = (
        (RUN_SUBMIT, "Submit"),
        (RUN_CUSTOM, "Custom Run"),
    )

    LANGUAGE_CHOICES = (
        (LANGUAGE_PYTHON, "Python"),
        (LANGUAGE_JAVASCRIPT, "JavaScript"),
        (LANGUAGE_CPP, "C++"),
        (LANGUAGE_JAVA, "Java"),
        (LANGUAGE_GO, "Go"),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="submissions")
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="submissions")
    language = models.CharField(max_length=32, choices=LANGUAGE_CHOICES)
    code = models.TextField()
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_PENDING)
    score = models.PositiveIntegerField(default=0)
    run_mode = models.CharField(max_length=16, choices=RUN_MODE_CHOICES, default=RUN_SUBMIT)
    stdout = models.TextField(blank=True)
    stderr = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-submitted_at",)

    def __str__(self):
        return f"{self.user_id}:{self.problem_id}:{self.status}"


class ExecutionResult(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name="execution_results")
    test_case = models.ForeignKey(TestCase, on_delete=models.SET_NULL, null=True, blank=True)
    input_data = models.TextField(blank=True)
    expected_output = models.TextField(blank=True)
    actual_output = models.TextField(blank=True)
    stderr = models.TextField(blank=True)
    passed = models.BooleanField(null=True, blank=True)
    execution_time_ms = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("order", "id")

    def __str__(self):
        return f"{self.submission_id}:{self.order}:{self.passed}"
