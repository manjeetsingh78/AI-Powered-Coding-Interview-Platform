from django.contrib import admin

from apps.workflows.models import CandidateReport, InterviewSlot, RecruiterTestDraft, RecruiterTestDraftProblem


admin.site.register(RecruiterTestDraft)
admin.site.register(RecruiterTestDraftProblem)
admin.site.register(InterviewSlot)
admin.site.register(CandidateReport)
