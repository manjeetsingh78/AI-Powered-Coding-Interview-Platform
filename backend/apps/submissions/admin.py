from django.contrib import admin

from apps.submissions.models import ExecutionResult, Submission


class ExecutionResultInline(admin.TabularInline):
    model = ExecutionResult
    extra = 0
    readonly_fields = ("passed", "actual_output", "stderr", "execution_time_ms")


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "problem", "language", "status", "score", "run_mode", "submitted_at")
    list_filter = ("status", "language", "run_mode", "submitted_at")
    search_fields = ("user__email", "problem__title", "problem__slug")
    inlines = [ExecutionResultInline]


@admin.register(ExecutionResult)
class ExecutionResultAdmin(admin.ModelAdmin):
    list_display = ("id", "submission", "test_case", "passed", "execution_time_ms")
    list_filter = ("passed",)
