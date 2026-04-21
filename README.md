# AI-Powered Coding Interview Platform

> A full-stack web application that enables companies to conduct, automate, and evaluate technical coding interviews at scale — powered by real-time code execution, AI-driven feedback, and structured recruiter analytics.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [System Architecture](#4-system-architecture)
5. [Tech Stack](#5-tech-stack)
6. [Database Schema](#6-database-schema)
7. [Core Features](#7-core-features)
8. [User Roles](#8-user-roles)
9. [API Reference](#9-api-reference)
10. [Module Breakdown](#10-module-breakdown)
11. [AI Integration](#11-ai-integration)
12. [Code Execution Engine](#12-code-execution-engine)
13. [Real-Time Communication](#13-real-time-communication)
14. [CI/CD Pipeline](#14-cicd-pipeline)
15. [Security](#15-security)
16. [Project Structure](#16-project-structure)
17. [Setup and Installation](#17-setup-and-installation)
18. [Environment Variables](#18-environment-variables)
19. [Future Scope](#19-future-scope)
20. [Team and Acknowledgements](#20-team-and-acknowledgements)

---

## 1. Project Overview

The AI-Powered Coding Interview Platform is an end-to-end technical hiring solution built to replace fragmented, manual interview workflows. Recruiters create timed coding assessments, invite candidates via secure tokenised links, and receive AI-generated code quality reports — all without leaving the platform. Candidates get a professional interview experience with a VSCode-quality Monaco editor, multi-language support, and instant feedback on their submissions.

The platform operates as a three-tier web application: a React + Vite frontend served over Nginx, a Django REST Framework backend with Celery for async task processing, and a PostgreSQL database with Redis for caching and message brokering. Code submissions are sandboxed and executed through the Piston API (or Judge0 as an alternative), returning per-test-case verdicts in real time over WebSocket connections.

---

## 2. Problem Statement

Technical hiring is broken in three ways:

**For companies:** Coordinating take-home tests, grading code manually, scheduling video interviews, and comparing candidates across different problem sets is time-consuming and inconsistent. Small engineering teams spend 20–30% of their time on hiring administration rather than product work.

**For candidates:** Disconnected tools — HackerRank for tests, Calendly for scheduling, Zoom for video, email for results — create a fragmented experience. Candidates rarely get structured feedback, making it impossible to improve.

**For fairness:** Without standardised problems, time limits, and automated evaluation, hiring decisions rely heavily on interviewer subjectivity. The same candidate evaluated by two different interviewers at the same company can receive opposite verdicts.

This platform addresses all three by consolidating the entire hiring funnel — assessment creation, candidate invites, code execution, AI review, video interviews, and recruiter analytics — into a single cohesive system.

---

## 3. Objectives

### Primary objectives

- Build a production-grade coding assessment platform with real-time code execution in Python, Java, C++, JavaScript, and Go.
- Implement role-based access control separating candidates, recruiters, and platform administrators.
- Integrate AI code review using the Anthropic Claude API to provide quality scores, complexity analysis, and improvement suggestions automatically after each submission.
- Enable recruiters to create assessments, invite candidates via tokenised email links, and view a ranked leaderboard of results.
- Support video interviews through Daily.co room creation linked directly to scheduled interview slots.

### Secondary objectives

- Achieve sub-3-second code execution feedback for 95% of submissions using the Piston API.
- Push real-time submission results to the browser over WebSocket without requiring the candidate to refresh.
- Provide a Jenkins CI/CD pipeline with automated lint, test, Docker build, and deploy stages.
- Maintain zero-downtime deployments to staging and production environments using Kubernetes rolling updates.

### Academic objectives

- Demonstrate full-stack software engineering across frontend, backend, database, DevOps, and AI integration layers.
- Apply software engineering principles: separation of concerns, 12-factor app configuration, test-driven development, and interface-based AI provider abstraction.

---

## 4. System Architecture

The platform follows a clean separation between the presentation layer, the application layer, and the data layer.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│         React 18 + Vite · TypeScript · Tailwind CSS v4          │
│         Zustand state · React Router · Axios + JWT              │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS / WSS
┌───────────────────────────▼─────────────────────────────────────┐
│                     NGINX (Reverse Proxy)                        │
│     /api/* → Django · /ws/* → Channels · /* → React SPA         │
└──────────────┬────────────────────────────────┬─────────────────┘
               │ HTTP                            │ WebSocket
┌──────────────▼──────────────┐  ┌──────────────▼──────────────┐
│   Django REST Framework      │  │   Django Channels (ASGI)    │
│   Gunicorn · 4 workers       │  │   Daphne · async consumers  │
│   JWT authentication         │  │   Real-time result push     │
│   DRF Spectacular (Swagger)  │  └──────────────┬──────────────┘
└──────────────┬──────────────┘                  │
               │                                  │
┌──────────────▼──────────────┐  ┌───────────────▼─────────────┐
│        Celery Worker         │  │           Redis              │
│   Code execution tasks       │  │   Celery broker + results   │
│   AI feedback generation     │  │   Channel layer (WebSocket) │
│   Email notifications        │  │   Session caching           │
└──────────────┬──────────────┘  └─────────────────────────────┘
               │
┌──────────────▼──────────────┐  ┌─────────────────────────────┐
│        PostgreSQL 15         │  │     External APIs           │
│   Primary application DB     │  │   Piston  — code execution  │
│   15 normalised tables       │  │   Claude  — AI feedback     │
│   Full ACID compliance       │  │   Daily.co — video rooms    │
└─────────────────────────────┘  │   SendGrid — email delivery │
                                  └─────────────────────────────┘
```

### Request lifecycle — code submission

1. Candidate clicks **Submit** in the Monaco editor.
2. React calls `POST /api/submissions/` with code, language, and problem ID.
3. Django creates a `Submission` row with `status = pending` and returns `202 Accepted` with the submission ID.
4. Django enqueues a `run_code_task` Celery job.
5. The frontend opens a WebSocket connection to `ws://domain/ws/results/{submission_id}/`.
6. Celery picks up the job, sets `status = running`, calls the Piston API with the code.
7. Piston executes the code in a sandboxed container and returns stdout/stderr.
8. The evaluator compares output against all test cases, writes `ExecutionResult` rows, and updates the `Submission` with the final status and score.
9. Django Channels pushes the result JSON over the WebSocket.
10. React updates the output panel instantly — no polling, no refresh.

---

## 5. Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11 | Primary backend language |
| Django | 4.2 LTS | Web framework, ORM, admin panel |
| Django REST Framework | 3.15 | REST API construction, serialisation |
| SimpleJWT | 5.3 | JWT access + refresh token authentication |
| Django Channels | 4.1 | WebSocket support via ASGI |
| Celery | 5.4 | Distributed async task queue |
| Redis | 7 | Celery broker, Channel layer, caching |
| PostgreSQL | 15 | Primary relational database |
| Gunicorn | 23 | WSGI production server |
| drf-spectacular | 0.27 | OpenAPI 3.0 / Swagger documentation |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI component framework |
| Vite | 5.4 | Build tool and dev server |
| TypeScript | 5.6 | Static type safety |
| Tailwind CSS | 4.0 | Utility-first styling |
| Zustand | 5.0 | Lightweight global state management |
| React Router DOM | 6.26 | Client-side routing |
| Axios | 1.7 | HTTP client with JWT interceptors |
| Monaco Editor | 4.6 | VSCode-quality in-browser code editor |
| Recharts | 2.12 | Leaderboard and analytics charts |
| react-hot-toast | 2.4 | Notification toasts |

### DevOps and Infrastructure

| Technology | Purpose |
|---|---|
| Docker | Containerisation of all services |
| Docker Compose | Local multi-service orchestration |
| Nginx | Reverse proxy, SSL termination, static serving |
| Jenkins | CI/CD pipeline orchestration |
| GitHub Actions | Automated lint, test, and build on push |
| Kubernetes | Production container orchestration |
| pytest + Vitest | Backend and frontend test runners |
| Playwright | End-to-end browser automation tests |

---

## 6. Database Schema

The database consists of 15 normalised tables across four logical domains.

### Domain 1 — Identity

| Table | Key fields | Purpose |
|---|---|---|
| `users` | `id`, `email` (UK), `username` (UK), `role`, `is_verified` | Core user account, email-based login |
| `companies` | `id`, `name` (UK), `domain`, `is_active` | Company entities recruiters belong to |
| `user_profiles` | `id`, `user_id` (FK), `company_id` (FK), `bio`, `skills` (JSON) | Extended profile, one-to-one with user |
| `email_verification_tokens` | `token` (UK), `expires_at` | Email verification flow |
| `password_reset_tokens` | `token` (UK), `used`, `expires_at` | Password reset flow |

### Domain 2 — Problem bank

| Table | Key fields | Purpose |
|---|---|---|
| `problems` | `id`, `slug` (UK), `difficulty`, `time_limit_ms`, `accepted_count` | Coding problems |
| `test_cases` | `id`, `problem_id` (FK), `is_sample`, `is_hidden`, `order` | Input/output pairs per problem |
| `problem_tags` | `problem_id`, `tag_id` | Many-to-many join table |
| `tags` | `id`, `name` (UK), `slug` (UK) | Taxonomy labels |
| `problem_constraints` | `id`, `problem_id` (FK), `expression` | Structured constraints list |

### Domain 3 — Submissions

| Table | Key fields | Purpose |
|---|---|---|
| `submissions` | `id`, `user_id` (FK), `problem_id` (FK), `language`, `status`, `score` | One row per code submit |
| `execution_results` | `id`, `submission_id` (FK), `test_case_id` (FK), `passed`, `actual_output` | One row per test case per submission |
| `assessments` | `id`, `created_by_id` (FK), `status`, `duration_minutes`, `starts_at` | Recruiter-created timed tests |
| `invites` | `id`, `assessment_id` (FK), `email`, `token` (UK), `status`, `expires_at` | Secure candidate invite links |
| `candidate_attempts` | `id`, `invite_id` (FK), `candidate_id` (FK), `total_score`, `is_submitted` | Tracks a candidate's active attempt |

### Domain 4 — Interviews and scheduling

| Table | Key fields | Purpose |
|---|---|---|
| `slots` | `id`, `recruiter_id` (FK), `starts_at`, `ends_at`, `status` | Recruiter availability windows |
| `interviews` | `id`, `slot_id` (FK, 1:1), `recruiter_id`, `candidate_id`, `verdict` | Booked interview instances |
| `video_sessions` | `id`, `interview_id` (FK, 1:1), `room_url`, `host_token`, `guest_token` | Daily.co video room per interview |

---

## 7. Core Features

### For candidates

**Problem solving environment**
A split-panel interface with the problem description, constraints, and sample test cases on the left, and a Monaco code editor on the right. Candidates switch between Python, Java, C++, JavaScript, and Go using a language dropdown. Starter templates are pre-loaded for each language. The editor supports syntax highlighting, bracket matching, and auto-indentation identical to VSCode.

**Real-time submission results**
On submit, a WebSocket connection immediately relays the execution verdict — Accepted, Wrong Answer, Time Limit Exceeded, Compile Error, or Runtime Error — along with a per-test-case breakdown and a percentage score. No page reload required.

**Submission history**
A paginated table of all past submissions per problem showing language, status badge, score, and timestamp. Candidates can review the code they submitted for any previous attempt.

**Assessment mode**
When invited to a timed test, candidates see a countdown timer and a list of problems to solve within the assessment window. Submitting after time expiry is locked. Results are visible immediately after the assessment ends if the recruiter has enabled result visibility.

**Interview scheduling**
Candidates browse available recruiter slots and book an interview. On booking, a Daily.co video room is created and both parties receive the join link.

### For recruiters

**Assessment builder**
A multi-field form to create a named assessment with a description, candidate instructions, duration, and optional start/end window. Problems are added from the platform's problem bank. Each problem can be assigned a point value and ordering.

**Candidate invite flow**
Recruiters enter one or more candidate email addresses. The platform generates a unique token per invite with a 7-day expiry and sends an email. Candidates click the link to accept and begin the assessment.

**Leaderboard and analytics**
An auto-updating ranked table of candidates sorted by score, problems solved, average execution time, and preferred language. Score distribution histograms are rendered with Recharts.

**Slot management**
A calendar view for creating and managing available interview slots. Recruiters set the interview type (technical, behavioural, system design, or HR) and duration. Booked slots show the candidate's name and assessment results.

**Candidate report**
A full per-candidate page showing their code for each problem, the AI-generated quality review, plagiarism similarity score, execution results, and the interviewer's verdict (Hire / Maybe / No Hire).

### For administrators

**User management** — view, activate, or deactivate any user account across all roles.

**Company management** — create and manage company entities that recruiters are associated with.

**Platform statistics** — total submissions, acceptance rates by problem, active assessments, and system health indicators.

**Django admin panel** — full ORM-level access to every model via Django's built-in admin at `/admin/`.

---

## 8. User Roles

The platform uses a single `role` column on the `CustomUser` model. Permission classes on every API view enforce role-based access at the request level.

| Role | Login | What they can do |
|---|---|---|
| `candidate` | Email + password | Solve problems, submit code, view results, book interview slots, take assessments |
| `recruiter` | Email + password | Create assessments, invite candidates, view leaderboard, manage slots, read AI reports |
| `admin` | Email + password | Everything recruiters can do, plus user management, company management, platform stats |

Permission classes implemented:

- `IsCandidate` — candidate-only endpoints (submit code, book slot)
- `IsRecruiter` — recruiter-only endpoints (create assessment, invite)
- `IsAdmin` — admin-only endpoints (user management)
- `IsRecruiterOrAdmin` — shared recruiter and admin access
- `IsOwnerOrAdmin` — object-level permission, allows owner or any admin

---

## 9. API Reference

All endpoints are prefixed with `/api/`. Full interactive documentation is available at `/api/docs/` (Swagger UI) and `/api/redoc/` (ReDoc).

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register/` | Create a new account (candidate or recruiter) |
| `POST` | `/api/auth/token/` | Login — returns access and refresh JWT pair |
| `POST` | `/api/auth/token/refresh/` | Refresh an expired access token |
| `POST` | `/api/auth/logout/` | Blacklist the refresh token |
| `GET` | `/api/auth/me/` | Get current user profile |
| `PATCH` | `/api/auth/me/` | Update name, username |
| `GET/PATCH` | `/api/auth/profile/` | Extended profile: bio, avatar, skills, links |
| `POST` | `/api/auth/change-password/` | Change password with old password verification |
| `GET` | `/api/health/` | Service health check |

### Problems

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/problems/` | List problems with filters: difficulty, tag, search |
| `POST` | `/api/problems/create/` | Create a problem (recruiter / admin only) |
| `GET` | `/api/problems/{slug}/` | Problem detail with sample test cases |
| `PATCH` | `/api/problems/{slug}/` | Update problem |
| `DELETE` | `/api/problems/{slug}/` | Soft-delete (sets `is_active = False`) |
| `GET` | `/api/problems/tags/` | List all tags |

### Submissions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/submissions/` | Submit code — returns `202 Accepted` immediately |
| `GET` | `/api/submissions/{id}/` | Get submission result with per-test breakdown |
| `GET` | `/api/submissions/history/` | Paginated submission history for current user |

### Assessments

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/assessments/` | List assessments created by the logged-in recruiter |
| `POST` | `/api/assessments/` | Create a new assessment |
| `GET` | `/api/assessments/{id}/` | Assessment detail |
| `PATCH` | `/api/assessments/{id}/` | Update assessment |
| `DELETE` | `/api/assessments/{id}/` | Delete assessment |
| `POST` | `/api/assessments/{id}/invite/` | Send invites to a list of email addresses |

### Scheduling

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/schedule/slots/` | List slots (available slots for candidates, own slots for recruiters) |
| `POST` | `/api/schedule/slots/` | Create an availability slot (recruiter only) |
| `GET` | `/api/schedule/interviews/` | List interviews for the current user |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/leaderboard/` | Top 50 candidates ranked by problems solved and score |
| `GET` | `/api/analytics/my-stats/` | Current candidate's personal statistics |

### WebSocket

| Endpoint | Description |
|---|---|
| `ws://domain/ws/results/{submission_id}/` | Real-time submission result push |

---

## 10. Module Breakdown

### Backend apps (`backend/apps/`)

**`authentication`** — Custom user model with email-based login, UserProfile, Company, role-based permissions, JWT token customisation, signals for auto-creating profiles, health check endpoint.

**`problems`** — Problem, TestCase, Tag models. CRUD views with DjangoFilterBackend for difficulty and tag filtering. `seed_problems` management command that populates 5 starter problems on first setup.

**`submissions`** — Submission and ExecutionResult models. Submit view queues a Celery task and returns immediately. Executor adapter routes to Piston or Judge0. Evaluator compares stdout against expected output per test case and computes a percentage score.

**`assessments`** — Assessment, AssessmentProblem (through model), Invite, CandidateAssessmentAttempt. Token generation for secure invite links. Invite status tracking through the full lifecycle.

**`ai_feedback`** — Provider abstraction with `base.py` abstract class and concrete `claude.py`, `openai_provider.py`, `gemini.py` implementations. Switched via `AI_PROVIDER` environment variable. Prompt builder constructs structured LLM prompts from submission context. Response parser validates and normalises the AI JSON output.

**`scheduling`** — Slot and Interview models with status state machines. VideoSession linked one-to-one with each Interview. Daily.co adapter creates and deletes rooms via their REST API.

**`analytics`** — LeaderboardEntry and CandidateMetric models. Aggregation views using Django ORM `annotate`. Celery beat task refreshes the leaderboard cache every 5 minutes.

**`notifications`** — Django Channels async WebSocket consumer. Routing configuration. Email templates for invite, reminder, and result notifications.

### Frontend modules (`frontend/src/`)

**`api/`** — One file per domain: `auth.api.ts`, `problems.api.ts`, `submissions.api.ts`, `assessments.api.ts`, `analytics.api.ts`, `scheduling.api.ts`. Central `client.ts` handles Axios configuration, JWT attachment, 401 interception, and token refresh with a concurrent request queue.

**`store/`** — Three Zustand stores: `authStore` (user, isAuthenticated, persisted), `editorStore` (code, language, lastResult), `notificationStore` (unread count and notification list).

**`hooks/`** — `useAuth` hydrates the user on mount and provides login/logout. `useWebSocket` manages connection lifecycle with auto-reconnect. `useSubmission` orchestrates the submit → WebSocket → result flow. `useTimer` drives the assessment countdown.

**`router/`** — `PrivateRoute` redirects unauthenticated users to `/login` preserving the intended destination. `RoleRoute` redirects to `/unauthorized` if the user's role is not in the allowed list.

**`components/`** — Organised by concern: `ui/` for atomic components (Button, Input, Badge, Card, Spinner, Select, ProgressBar), `editor/` for Monaco integration (CodeEditor, LanguageSelector, OutputPanel, RunButton), `layout/` for page shells (Sidebar, Topbar, CandidateLayout, RecruiterLayout).

---

## 11. AI Integration

The platform generates automated code quality reports after every accepted submission. The AI layer is implemented with a provider abstraction so the underlying model can be switched without changing any business logic.

### Provider abstraction

```
apps/ai_feedback/providers/
├── base.py              ← Abstract AIProvider: get_feedback(code, problem, language) → dict
├── claude.py            ← Anthropic claude-sonnet-4-6 with exponential backoff retry
├── openai_provider.py   ← GPT-4o with JSON response_format mode
└── gemini.py            ← Google Gemini 1.5 Pro
```

The active provider is selected at startup via the `AI_PROVIDER` environment variable (`claude`, `openai`, or `gemini`). Switching providers requires changing one variable with no code changes.

### Feedback schema

The AI is prompted to return a structured JSON object with the following fields:

```json
{
  "quality_score": 82,
  "time_complexity": "O(n)",
  "space_complexity": "O(n)",
  "strengths": ["Efficient use of hash map", "Clean variable naming"],
  "improvements": ["Could use early return to reduce nesting"],
  "overall_comment": "Solid solution with good readability."
}
```

### Plagiarism detection

The platform includes two plagiarism signals. AST-based fingerprinting compares the abstract syntax tree of each submission against other submissions for the same problem and computes a pairwise cosine similarity score. MOSS (Measure Of Software Similarity) integration submits code files to Stanford's MOSS service for cross-submission similarity analysis. Results are stored in `PlagiarismReport` and surfaced on the recruiter's candidate report page.

---

## 12. Code Execution Engine

All submitted code runs in an isolated execution environment with strict resource limits. The default executor is the Piston API which requires no API key and supports 50+ languages.

### Piston API (default)

Piston is a free, open-source code execution API operated at `emkc.org`. It runs each submission in a Docker container with no network access, a read-only filesystem, memory limits, and CPU time limits. The platform sends the source code and language, and Piston returns stdout, stderr, exit code, and execution time.

### Judge0 (alternative)

Judge0 CE is available via RapidAPI as a more feature-complete alternative, providing per-language compilation options, memory usage reporting, and a wider range of status codes. Enabled by setting `CODE_EXECUTOR=judge0` and providing a `JUDGE0_API_KEY`.

### Evaluation logic

The evaluator in `submissions/evaluator.py` runs each test case through the executor, trims whitespace from actual and expected output, performs an exact string comparison, and records a pass or fail. The submission score is `(passed / total) × 100`. If all test cases pass, status is set to `accepted`. Partial credit is recorded via the `score` field.

---

## 13. Real-Time Communication

The platform uses Django Channels to add WebSocket support to the Django application without replacing the existing WSGI stack. The ASGI application wraps both the HTTP and WebSocket protocol handlers.

### Channel layer

Redis is used as the channel layer backend, enabling message passing between the Celery worker process (which completes the code execution) and the Channels consumer (which holds the WebSocket connection to the browser).

### Flow

```
Celery worker
    │ evaluator writes result to DB
    │ channel_layer.group_send("result_{id}", payload)
    ↓
Redis channel layer
    │ routes to correct consumer group
    ↓
ResultConsumer (async WebSocket consumer)
    │ receives group message
    │ self.send(text_data=json.dumps(payload))
    ↓
Browser (React useWebSocket hook)
    │ onmessage fires
    │ editorStore.setResult(data)
    ↓
OutputPanel re-renders with verdict
```

---

## 14. CI/CD Pipeline

### GitHub Actions

Two workflow files live in `.github/workflows/`:

**`ci.yml`** runs on every push and pull request to `main` and `develop`:
- Spins up PostgreSQL 15 and Redis 7 as service containers.
- Installs Python dependencies and runs `flake8`, `black --check`, `isort --check`.
- Runs the full pytest suite with coverage reporting to Codecov.
- Installs Node dependencies, runs TypeScript type-check and ESLint.
- Runs Vitest for frontend unit tests.
- Builds the React production bundle to catch any build-time errors.
- Builds both Docker images using BuildKit cache.

**`cd.yml`** runs on push to `main` (production) and `develop` (staging):
- Builds and pushes backend and frontend Docker images to GitHub Container Registry tagged with the commit SHA.
- SSHs into the target server and runs `docker-compose pull` + `up -d` + `migrate`.

### Jenkins pipeline

The `backend/jenkins/Jenkinsfile` defines a nine-stage declarative pipeline. Each stage delegates to a Python script in `jenkins/scripts/` keeping the Jenkinsfile itself clean. Stages: Checkout → Install → Lint → Test → Build Docker → Push Docker → Deploy Staging → Approval Gate → Deploy Production. Slack notifications are sent on success or failure via a webhook.

---

## 15. Security

### Authentication and authorisation

- JWT tokens are short-lived (60-minute access, 7-day refresh).
- Refresh tokens are blacklisted on logout using `rest_framework_simplejwt.token_blacklist`.
- Token rotation is enabled — every refresh issues a new refresh token and invalidates the old one.
- All API endpoints require `IsAuthenticated` by default; public endpoints explicitly set `AllowAny`.
- Role checks are enforced at the view level using custom DRF permission classes.

### Input validation

- Django ORM parameterised queries prevent SQL injection.
- DRF serialisers validate all input fields before they reach business logic.
- File uploads (avatars, logos) are restricted by type and size via Pillow validation.

### Code execution sandboxing

- All user code runs inside Piston's Docker container with no network access and a read-only filesystem.
- CPU time and memory limits are enforced at the container level.
- Neither the Django process nor the Celery worker executes user code directly.

### Production hardening

- `SECURE_HSTS_SECONDS`, `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` are all enabled in `production.py`.
- `X_FRAME_OPTIONS = "DENY"` prevents clickjacking.
- CORS is restricted to the known frontend origin in production.
- Secrets are injected via environment variables — no hardcoded credentials in the codebase.

---

## 16. Project Structure

```
ai-coding-interview-platform/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                   # Lint, test, build on every push
│       └── cd.yml                   # Deploy to staging/production on merge
│
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py              # Shared settings
│   │   │   ├── development.py       # SQLite, eager Celery, CORS open
│   │   │   ├── production.py        # PostgreSQL, S3, Sentry, HTTPS
│   │   │   └── testing.py           # In-memory DB, fast hasher
│   │   ├── urls.py                  # Root URL config
│   │   ├── asgi.py                  # Channels ASGI entry point
│   │   ├── wsgi.py                  # Gunicorn WSGI entry point
│   │   └── celery.py                # Celery app config
│   │
│   ├── apps/
│   │   ├── authentication/          # Users, roles, JWT, profiles, companies
│   │   ├── problems/                # Problems, test cases, tags, seed command
│   │   ├── submissions/             # Submit, execute, evaluate, results
│   │   ├── assessments/             # Timed tests, invites, attempts
│   │   ├── ai_feedback/             # Claude / OpenAI / Gemini integration
│   │   ├── scheduling/              # Slots, interviews, video sessions
│   │   ├── analytics/               # Leaderboard, candidate metrics
│   │   └── notifications/           # WebSocket consumers, email templates
│   │
│   ├── requirements/
│   │   ├── base.txt                 # Core dependencies
│   │   ├── development.txt          # Dev tools: pytest, black, isort
│   │   └── production.txt           # Prod tools: gunicorn, sentry, boto3
│   │
│   ├── Dockerfile                   # Multi-stage backend image
│   ├── pytest.ini                   # Test configuration
│   ├── setup.cfg                    # Flake8, isort, black config
│   └── manage.py
│
├── frontend/
│   ├── src/
│   │   ├── api/                     # Axios API modules per domain
│   │   ├── components/
│   │   │   ├── editor/              # Monaco editor, language selector, output
│   │   │   ├── layout/              # Sidebar, topbar, page layouts
│   │   │   └── ui/                  # Button, Input, Badge, Card, Spinner
│   │   ├── hooks/                   # useAuth, useWebSocket, useSubmission, useTimer
│   │   ├── pages/
│   │   │   ├── auth/                # Login, Register, Unauthorized
│   │   │   ├── candidate/           # Dashboard, SolvePage, HistoryPage
│   │   │   └── recruiter/           # Dashboard, CreateTestPage
│   │   ├── router/                  # PrivateRoute, RoleRoute, index
│   │   ├── store/                   # Zustand: auth, editor, notifications
│   │   ├── types/                   # TypeScript interfaces and enums
│   │   └── utils/                   # Constants, formatters, error handler
│   │
│   ├── Dockerfile                   # Multi-stage frontend image
│   ├── nginx.conf                   # SPA routing, API proxy, WebSocket
│   ├── vite.config.ts               # Vite + Tailwind plugin + proxy
│   └── package.json
│
├── infrastructure/
│   └── docker/
│       ├── docker-compose.yml       # Full local dev stack
│       └── nginx/nginx.conf         # Nginx reverse proxy config
│
├── Makefile                         # Developer shortcuts
└── README.md                        # This file
```

---

## 17. Setup and Installation

### Prerequisites

- Python 3.11 or higher
- Node.js 20 or higher
- PostgreSQL 15 or higher (local install or Docker)
- Redis 7 (local install or Docker)
- Docker Desktop (optional but recommended)

### Option A — Docker Compose (recommended)

```bash
git clone https://github.com/your-org/ai-interview-platform.git
cd ai-interview-platform

# Start the full stack (PostgreSQL, Redis, Django, Celery, React)
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# Watch the logs
docker-compose -f infrastructure/docker/docker-compose.yml logs -f backend
```

Visit `http://localhost:5173` for the frontend and `http://localhost:8000/api/docs/` for the API documentation.

### Option B — Local development

```bash
# 1. Clone the repository
git clone https://github.com/your-org/ai-interview-platform.git
cd ai-interview-platform

# 2. Backend setup
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS / Linux

pip install -r requirements/development.txt
cp .env.example .env           # Edit .env with your database credentials

python manage.py migrate
python manage.py seed_problems
python manage.py createsuperuser
python manage.py runserver

# 3. Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev

# 4. Celery worker (new terminal, optional)
cd backend
celery -A config.celery worker --loglevel=info
```

### Makefile shortcuts

```bash
make setup            # Full backend + frontend setup in one command
make dev-backend      # Start Django dev server
make dev-frontend     # Start Vite dev server
make migrate          # Run pending migrations
make seed             # Seed starter problems
make test             # Run all backend and frontend tests
make lint             # Lint all code
make docker-up        # Start Docker Compose stack
make docker-down      # Stop Docker Compose stack
```

---

## 18. Environment Variables

### Backend (`backend/.env`)

```env
# Django
SECRET_KEY=your-50-character-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_SETTINGS_MODULE=config.settings.development

# Database
DB_NAME=interview_db
DB_USER=interview_user
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Code execution
CODE_EXECUTOR=piston
JUDGE0_API_KEY=your-rapidapi-key
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com

# AI providers
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-your-key
GEMINI_API_KEY=AIza-your-key

# Email
SENDGRID_API_KEY=SG.your-key
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# Video
DAILY_CO_API_KEY=your-daily-co-key

# AWS S3 (production only)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=interview-platform-media
AWS_S3_REGION_NAME=ap-south-1

# Monitoring (production only)
SENTRY_DSN=
SLACK_WEBHOOK_URL=
```

### Frontend (`frontend/.env.local`)

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_DAILY_CO_DOMAIN=your-domain.daily.co
```

---

## 19. Future Scope

### Phase 2 — AI and plagiarism

- Complete the AI feedback pipeline: trigger `generate_ai_feedback_task` after every accepted submission, store results in `AIFeedback`, and surface the quality score, complexity analysis, and improvement suggestions on the candidate results page.
- Activate the MOSS plagiarism checker with file submission and result URL parsing.
- Add AST similarity scoring for Python, Java, and C++ using `ast` (Python), `javalang` (Java), and `libclang` (C++).
- AI-powered problem generation from a topic prompt.

### Phase 3 — Video and collaboration

- Complete the Daily.co integration: create rooms on interview booking, embed the video player in the scheduling page, handle room expiry.
- Add a collaborative code editor for live pair-programming during video interviews using Yjs CRDT.
- Real-time interviewer annotations on candidate code during video sessions.

### Phase 4 — Scale and enterprise

- Multi-tenancy: isolate each company's data behind a subdomain (`company.platform.com`).
- Custom branding: recruiters upload a company logo and colour scheme applied to candidate-facing pages.
- ATS integrations: Greenhouse, Lever, and Workday webhook adapters.
- Proctoring: webcam monitoring, tab-switch detection, and copy-paste prevention in assessment mode.
- Custom judge: deploy a self-hosted execution cluster using Docker-in-Docker for organisations requiring data residency.

### Phase 5 — Analytics and ML

- Predict candidate success from code patterns and submission behaviour.
- Identify optimal problem difficulty distribution for specific engineering roles.
- Interviewer calibration tool comparing verdict rates across recruiters at the same company.

---

## 20. Team and Acknowledgements

**Project type:** Academic final year project / industry capstone

**Domain:** Software Engineering — Full-Stack Web Development with AI Integration

**Guided by:** [Supervisor / Faculty Name]

**Institution:** [College / University Name]

**Academic year:** 2025–2026

### Technologies and services acknowledged

- [Anthropic](https://anthropic.com) — Claude AI API for code quality feedback
- [Piston](https://github.com/engineer-man/piston) — Open-source sandboxed code execution engine
- [Daily.co](https://daily.co) — Video room API
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — Microsoft's browser-based code editor
- [Django Software Foundation](https://www.djangoproject.com/) — Django web framework
- [Vite](https://vitejs.dev/) — Frontend build tooling

---

*This document serves as the project synopsis and technical reference for the AI-Powered Coding Interview Platform. For questions regarding setup, architecture decisions, or contribution, open an issue on the project repository.*




