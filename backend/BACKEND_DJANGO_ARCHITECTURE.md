# Backend — Django + DRF Full Directory Architecture
# CI/CD: Jenkins | Scripting: Python

```
backend/
│
├── config/                                     # Django project core
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py                             # Shared settings: apps, middleware, DRF, JWT
│   │   ├── development.py                      # DEBUG=True, SQLite fallback, console email
│   │   ├── production.py                       # S3, Sentry, Redis cache, SECURE_* headers
│   │   └── testing.py                          # In-memory DB, fast hasher, no Celery
│   ├── urls.py                                 # Root URL conf — delegates to each app
│   ├── wsgi.py                                 # Gunicorn WSGI entry point
│   ├── asgi.py                                 # Django Channels ASGI (WebSocket support)
│   └── celery.py                               # Celery app + autodiscover_tasks()
│
├── apps/                                       # All Django application modules
│   │
│   ├── authentication/
│   │   ├── __init__.py
│   │   ├── models.py                           # CustomUser, UserProfile, Role (enum)
│   │   ├── managers.py                         # CustomUserManager (email-based auth)
│   │   ├── serializers.py                      # RegisterSerializer, LoginSerializer, MeSerializer
│   │   ├── views.py                            # RegisterView, LoginView, LogoutView, MeView
│   │   ├── urls.py                             # /api/auth/register/, /api/auth/token/, /api/auth/me/
│   │   ├── permissions.py                      # IsCandidate, IsRecruiter, IsAdmin
│   │   ├── backends.py                         # EmailAuthBackend
│   │   ├── signals.py                          # post_save → auto-create UserProfile
│   │   ├── admin.py                            # CustomUser registered in Django Admin
│   │   ├── apps.py
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── factories.py                    # factory_boy: UserFactory, RecruiterFactory
│   │       ├── test_register.py
│   │       ├── test_login.py
│   │       └── test_permissions.py
│   │
│   ├── problems/
│   │   ├── __init__.py
│   │   ├── models.py                           # Problem, TestCase, Tag, DifficultyLevel
│   │   ├── serializers.py                      # ProblemSerializer, TestCaseSerializer
│   │   ├── views.py                            # ProblemListView, ProblemDetailView, CreateView
│   │   ├── urls.py                             # /api/problems/
│   │   ├── filters.py                          # DjangoFilterBackend: tag, difficulty, language
│   │   ├── admin.py                            # Problem admin + inline TestCases
│   │   ├── apps.py
│   │   ├── management/
│   │   │   └── commands/
│   │   │       └── seed_problems.py            # python manage.py seed_problems
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── factories.py                    # ProblemFactory, TestCaseFactory
│   │       ├── test_problem_crud.py
│   │       └── test_testcase_validation.py
│   │
│   ├── submissions/
│   │   ├── __init__.py
│   │   ├── models.py                           # Submission, ExecutionResult, SubmissionStatus
│   │   ├── serializers.py                      # SubmissionSerializer, ResultSerializer
│   │   ├── views.py                            # SubmitView, ResultView, HistoryView
│   │   ├── urls.py                             # /api/submissions/
│   │   ├── tasks.py                            # run_code_task, evaluate_tests_task (Celery)
│   │   ├── executor.py                         # Adapter: Docker / Judge0 / Piston
│   │   ├── evaluator.py                        # Compare stdout vs expected, compute score
│   │   ├── constants.py                        # LANGUAGE_IDS, TIMEOUT_SECS, MEMORY_MB
│   │   ├── exceptions.py                       # ExecutionTimeout, SandboxError, CompileError
│   │   ├── apps.py
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── factories.py
│   │       ├── test_submit_flow.py
│   │       ├── test_executor.py                # Mocked Docker SDK
│   │       └── test_evaluator.py
│   │
│   ├── assessments/
│   │   ├── __init__.py
│   │   ├── models.py                           # Assessment, AssessmentProblem, Invite, InviteStatus
│   │   ├── serializers.py                      # AssessmentSerializer, InviteSerializer
│   │   ├── views.py                            # CreateAssessment, PublishAssessment, InviteView
│   │   ├── urls.py                             # /api/assessments/
│   │   ├── tasks.py                            # send_invite_email_task, expire_assessments_task
│   │   ├── apps.py
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── factories.py
│   │       ├── test_assessment_crud.py
│   │       └── test_invite_flow.py
│   │
│   ├── ai_feedback/
│   │   ├── __init__.py
│   │   ├── models.py                           # AIFeedback, PlagiarismReport, FeedbackStatus
│   │   ├── serializers.py                      # AIFeedbackSerializer, PlagiarismSerializer
│   │   ├── views.py                            # FeedbackDetailView
│   │   ├── urls.py                             # /api/feedback/
│   │   ├── tasks.py                            # generate_ai_feedback_task, check_plagiarism_task
│   │   ├── prompt_builder.py                   # Build structured LLM prompt from context
│   │   ├── response_parser.py                  # Parse + validate AI JSON response
│   │   ├── apps.py
│   │   ├── providers/
│   │   │   ├── __init__.py
│   │   │   ├── base.py                         # Abstract AIProvider interface
│   │   │   ├── claude.py                       # Anthropic claude-sonnet-4-6 with retry
│   │   │   ├── openai_provider.py              # GPT-4o with JSON response_format
│   │   │   └── gemini.py                       # Google Gemini 1.5 Pro
│   │   ├── plagiarism/
│   │   │   ├── __init__.py
│   │   │   ├── moss_client.py                  # MOSS API wrapper
│   │   │   └── ast_differ.py                   # AST fingerprint + cosine similarity
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── test_prompt_builder.py
│   │       ├── test_response_parser.py
│   │       └── test_plagiarism.py
│   │
│   ├── scheduling/
│   │   ├── __init__.py
│   │   ├── models.py                           # Interview, Slot, SlotStatus, VideoSession
│   │   ├── serializers.py                      # SlotSerializer, InterviewSerializer
│   │   ├── views.py                            # CreateSlot, BookSlot, CancelSlot, ListSlots
│   │   ├── urls.py                             # /api/schedule/
│   │   ├── tasks.py                            # send_reminder_task, expire_slots_task
│   │   ├── apps.py
│   │   ├── video/
│   │   │   ├── __init__.py
│   │   │   ├── daily_co.py                     # Daily.co REST API: create/delete rooms
│   │   │   └── jitsi.py                        # Jitsi JWT token generator
│   │   └── tests/
│   │       ├── __init__.py
│   │       └── test_scheduling.py
│   │
│   ├── analytics/
│   │   ├── __init__.py
│   │   ├── models.py                           # LeaderboardEntry, CandidateMetric, TestStat
│   │   ├── serializers.py                      # LeaderboardSerializer, StatSerializer
│   │   ├── views.py                            # LeaderboardView, TestStatsView, FunnelView
│   │   ├── urls.py                             # /api/analytics/
│   │   ├── tasks.py                            # update_leaderboard_task (Celery beat, 5 min)
│   │   └── apps.py
│   │
│   └── notifications/
│       ├── __init__.py
│       ├── email.py                            # SendGrid adapter + HTML template renderer
│       ├── consumers.py                        # Django Channels async WebSocket consumer
│       ├── routing.py                          # ws/results/{submission_id}/
│       ├── apps.py
│       └── templates/
│           ├── invite_email.html
│           ├── reminder_email.html
│           └── result_email.html
│
├── sandbox/                                    # Docker images for code execution
│   ├── Dockerfile.python                       # python:3.11-slim, no net, read-only FS
│   ├── Dockerfile.java                         # openjdk:17-slim, sandboxed
│   ├── Dockerfile.cpp                          # gcc:12-slim, sandboxed
│   ├── runner.sh                               # Entrypoint: compile → run → capture output
│   └── limits.conf                             # ulimit rules + cgroup memory/CPU caps
│
├── scripts/                                    # Python utility scripts (not Django mgmt commands)
│   ├── seed_problems.py                        # Load 50 starter problems from JSON into DB
│   ├── create_admin.py                         # Bootstrap first superuser from env vars
│   ├── health_check.py                         # HTTP health probe for Jenkins pipeline
│   ├── run_migrations.py                       # Run migrations + check for unapplied
│   ├── backup_db.py                            # pg_dump → S3 upload
│   ├── rollback_deploy.py                      # Roll back K8s deployment to previous image
│   ├── smoke_test.py                           # Post-deploy API smoke tests via requests
│   └── notify_slack.py                         # Send build status to Slack webhook
│
├── jenkins/                                    # All Jenkins CI/CD configuration
│   ├── Jenkinsfile                             # Main declarative pipeline (backend)
│   ├── Jenkinsfile.hotfix                      # Fast-path pipeline for hotfix branches
│   ├── scripts/
│   │   ├── install_deps.py                     # pip install + cache check
│   │   ├── run_lint.py                         # flake8 + black --check + isort --check
│   │   ├── run_tests.py                        # pytest with coverage, output JUnit XML
│   │   ├── build_docker.py                     # docker build + tag with commit SHA
│   │   ├── push_docker.py                      # docker push to registry
│   │   ├── deploy_staging.py                   # kubectl set image → staging namespace
│   │   ├── deploy_production.py                # kubectl set image → production namespace
│   │   ├── run_smoke_tests.py                  # Call smoke_test.py against deployed env
│   │   └── send_notification.py                # Slack/email on success or failure
│   └── shared/
│       ├── __init__.py
│       ├── docker_utils.py                     # Shared Docker build/push helpers
│       ├── k8s_utils.py                        # Shared kubectl wrapper functions
│       └── env_utils.py                        # Load Jenkins credentials into env
│
├── requirements/
│   ├── base.txt                                # Django, DRF, Celery, Channels, psycopg2
│   ├── development.txt                         # pytest, factory-boy, faker, black, isort, flake8
│   └── production.txt                          # gunicorn, sentry-sdk, boto3, django-storages
│
├── fixtures/
│   └── initial_problems.json                   # 50 starter problems for seeding
│
├── manage.py
├── pytest.ini                                  # testpaths, cov settings, JUnit XML output
├── setup.cfg                                   # flake8, isort, black config
├── .env.example                                # All env vars documented
└── Dockerfile                                  # Multi-stage production backend image
```

---

## Key files content

### `pytest.ini`
```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.testing
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    --cov=apps
    --cov-report=xml:coverage.xml
    --cov-report=term-missing
    --junitxml=reports/junit.xml
    -v
```

### `setup.cfg`
```ini
[flake8]
max-line-length = 88
exclude = migrations, __pycache__, .git
extend-ignore = E203, W503

[isort]
profile = black
known_django = django
known_first_party = apps, config

[tool:black]
line-length = 88
target-version = ['py311']
```

### `jenkins/Jenkinsfile`
```groovy
pipeline {
    agent any

    environment {
        IMAGE_NAME     = "your-registry/interview-backend"
        IMAGE_TAG      = "${GIT_COMMIT[0..7]}"
        REGISTRY_CREDS = credentials('docker-registry-creds')
        KUBECONFIG     = credentials('kubeconfig-prod')
        DJANGO_ENV     = credentials('django-env-production')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install dependencies') {
            steps {
                sh 'python jenkins/scripts/install_deps.py'
            }
        }

        stage('Lint') {
            steps {
                sh 'python jenkins/scripts/run_lint.py'
            }
        }

        stage('Test') {
            steps {
                sh 'python jenkins/scripts/run_tests.py'
            }
            post {
                always {
                    junit 'reports/junit.xml'
                    publishCoverage adapters: [coberturaAdapter('coverage.xml')]
                }
            }
        }

        stage('Build Docker image') {
            steps {
                sh 'python jenkins/scripts/build_docker.py'
            }
        }

        stage('Push to registry') {
            steps {
                sh 'python jenkins/scripts/push_docker.py'
            }
        }

        stage('Deploy to staging') {
            when { branch 'develop' }
            steps {
                sh 'python jenkins/scripts/deploy_staging.py'
                sh 'python jenkins/scripts/run_smoke_tests.py --env staging'
            }
        }

        stage('Approval gate') {
            when { branch 'main' }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
            }
        }

        stage('Deploy to production') {
            when { branch 'main' }
            steps {
                sh 'python jenkins/scripts/deploy_production.py'
                sh 'python jenkins/scripts/run_smoke_tests.py --env production'
            }
        }
    }

    post {
        success {
            sh 'python jenkins/scripts/send_notification.py --status success'
        }
        failure {
            sh 'python jenkins/scripts/send_notification.py --status failure'
        }
    }
}
```

### `jenkins/scripts/run_tests.py`
```python
import subprocess
import sys

def main():
    result = subprocess.run(
        ["python", "-m", "pytest", "--tb=short"],
        check=False
    )
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
```

### `jenkins/scripts/build_docker.py`
```python
import os
import subprocess
import sys

IMAGE_NAME = os.environ["IMAGE_NAME"]
IMAGE_TAG  = os.environ["IMAGE_TAG"]

def main():
    tag = f"{IMAGE_NAME}:{IMAGE_TAG}"
    subprocess.run(
        ["docker", "build", "-t", tag, "-f", "Dockerfile", "."],
        check=True
    )
    subprocess.run(
        ["docker", "tag", tag, f"{IMAGE_NAME}:latest"],
        check=True
    )
    print(f"Built {tag}")

if __name__ == "__main__":
    main()
```

### `jenkins/scripts/deploy_production.py`
```python
import os
import subprocess

IMAGE_NAME = os.environ["IMAGE_NAME"]
IMAGE_TAG  = os.environ["IMAGE_TAG"]
NAMESPACE  = "production"

def main():
    subprocess.run([
        "kubectl", "set", "image",
        "deployment/backend",
        f"backend={IMAGE_NAME}:{IMAGE_TAG}",
        "-n", NAMESPACE,
        "--record"
    ], check=True)

    subprocess.run([
        "kubectl", "rollout", "status",
        "deployment/backend",
        "-n", NAMESPACE,
        "--timeout=300s"
    ], check=True)

    print(f"Deployed {IMAGE_NAME}:{IMAGE_TAG} to {NAMESPACE}")

if __name__ == "__main__":
    main()
```

### `scripts/smoke_test.py`
```python
import argparse
import sys
import requests

ENVS = {
    "staging":    "https://staging-api.yourdomain.com",
    "production": "https://api.yourdomain.com",
}

CHECKS = [
    ("GET",  "/api/health/",       200),
    ("POST", "/api/auth/token/",   400),   # 400 = endpoint exists, bad creds expected
    ("GET",  "/api/problems/",     401),   # 401 = auth required = endpoint is live
]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", choices=ENVS.keys(), required=True)
    args = parser.parse_args()

    base = ENVS[args.env]
    failed = False

    for method, path, expected in CHECKS:
        url = base + path
        resp = requests.request(method, url, timeout=10)
        status = "PASS" if resp.status_code == expected else "FAIL"
        if status == "FAIL":
            failed = True
        print(f"[{status}] {method} {url} → {resp.status_code} (expected {expected})")

    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
```
