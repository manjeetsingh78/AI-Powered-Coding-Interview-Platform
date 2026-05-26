from django.db import migrations


def seed_problem_catalog(apps, schema_editor):
    from apps.problems.seed_data import PROBLEM_SEEDS, seed_problem_catalog as seed_catalog

    Problem = apps.get_model("problems", "Problem")
    Tag = apps.get_model("problems", "Tag")
    ProblemTag = apps.get_model("problems", "ProblemTag")
    TestCase = apps.get_model("problems", "TestCase")

    seed_catalog(Problem, Tag, ProblemTag, TestCase, PROBLEM_SEEDS)


def unseed_problem_catalog(apps, schema_editor):
    from apps.problems.seed_data import PROBLEM_SEEDS, remove_seed_problem_catalog

    Problem = apps.get_model("problems", "Problem")
    remove_seed_problem_catalog(Problem, PROBLEM_SEEDS)


class Migration(migrations.Migration):

    dependencies = [
        ("problems", "0003_solution"),
    ]

    operations = [
        migrations.RunPython(seed_problem_catalog, unseed_problem_catalog),
    ]
