from django.contrib import admin

from apps.problems.models import Problem, ProblemTag, Tag, TestCase


class ProblemTagInline(admin.TabularInline):
    model = ProblemTag
    extra = 1


class TestCaseInline(admin.TabularInline):
    model = TestCase
    extra = 1


@admin.register(Problem)
class ProblemAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "difficulty", "is_active", "created_at")
    list_filter = ("difficulty", "is_active")
    search_fields = ("title", "slug")
    inlines = (ProblemTagInline, TestCaseInline)


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug")
    search_fields = ("name", "slug")


@admin.register(TestCase)
class TestCaseAdmin(admin.ModelAdmin):
    list_display = ("id", "problem", "order", "is_sample", "is_hidden")
    list_filter = ("is_sample", "is_hidden")


@admin.register(ProblemTag)
class ProblemTagAdmin(admin.ModelAdmin):
    list_display = ("id", "problem", "tag")
