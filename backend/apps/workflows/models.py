from django.conf import settings
from django.db import models

from apps.problems.models import Problem


class RecruiterTestDraft(models.Model):
    recruiter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="test_drafts")
    title = models.CharField(max_length=255)
    duration_minutes = models.PositiveIntegerField(default=60)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.recruiter_id})"


class RecruiterTestDraftProblem(models.Model):
    draft = models.ForeignKey(RecruiterTestDraft, on_delete=models.CASCADE, related_name="draft_problems")
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("draft", "problem")
        ordering = ("order", "id")


class InterviewSlot(models.Model):
    recruiter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_slots")
    label = models.CharField(max_length=255)
    booked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="booked_slots",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)


class CandidateReport(models.Model):
    recruiter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="candidate_reports")
    candidate_name = models.CharField(max_length=255)
    score = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=64, blank=True)
    verdict = models.CharField(max_length=32, blank=True)
    notes = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("recruiter", "candidate_name")
        ordering = ("candidate_name",)
