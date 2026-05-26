from django.core.management.base import BaseCommand

from apps.problems.models import Problem, ProblemTag, Tag, TestCase
from apps.problems.seed_data import PROBLEM_SEEDS, seed_problem_catalog


class Command(BaseCommand):
    help = "Seed the interview problem catalog with a curated enterprise dataset."

    def handle(self, *args, **options):
        result = seed_problem_catalog(Problem, Tag, ProblemTag, TestCase, PROBLEM_SEEDS)
        self.stdout.write(
            self.style.SUCCESS(
                "Seeded {total} problems ({created} created, {updated} updated).".format(
                    **result,
                )
            )
        )
