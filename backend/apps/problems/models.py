from django.db import models


class Tag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)

    def __str__(self):
        return self.name


class Problem(models.Model):
    DIFFICULTY_EASY = "easy"
    DIFFICULTY_MEDIUM = "medium"
    DIFFICULTY_HARD = "hard"

    DIFFICULTY_CHOICES = (
        (DIFFICULTY_EASY, "Easy"),
        (DIFFICULTY_MEDIUM, "Medium"),
        (DIFFICULTY_HARD, "Hard"),
    )

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField()
    problem_statement = models.TextField(blank=True, default="")
    examples_json = models.JSONField(blank=True, default=list)
    constraints_json = models.JSONField(blank=True, default=list)
    follow_up = models.TextField(blank=True, default="")
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    time_limit_ms = models.IntegerField(default=1000)
    memory_limit_mb = models.IntegerField(default=128)
    accepted_count = models.IntegerField(default=0)
    submission_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    tags = models.ManyToManyField(Tag, through="ProblemTag", related_name="problems")

    def __str__(self):
        return self.title


class ProblemTag(models.Model):
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE)
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("problem", "tag")

    def __str__(self):
        return f"{self.problem_id}:{self.tag_id}"


class TestCase(models.Model):
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="test_cases")
    input_data = models.TextField()
    expected_output = models.TextField()
    is_sample = models.BooleanField(default=False)
    is_hidden = models.BooleanField(default=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ("order",)
        unique_together = ("problem", "order")

    def __str__(self):
        return f"{self.problem.title}#{self.order}"


class Solution(models.Model):
    LANG_CPP = "cpp"
    LANG_JAVA = "java"
    LANG_PYTHON = "python"
    LANG_JS = "javascript"

    LANGUAGE_CHOICES = (
        (LANG_CPP, "C++"),
        (LANG_JAVA, "Java"),
        (LANG_PYTHON, "Python"),
        (LANG_JS, "JavaScript"),
    )

    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name="solutions")
    language = models.CharField(max_length=32, choices=LANGUAGE_CHOICES)
    code = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("problem", "language")

    def __str__(self):
        return f"{self.problem.title}:{self.language}"
