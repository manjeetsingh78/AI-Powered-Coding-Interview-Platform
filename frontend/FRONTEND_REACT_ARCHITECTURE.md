# Frontend — React + Vite Full Directory Architecture
# CI/CD: Jenkins | Scripting: Python

```
frontend/
│
├── public/
│   ├── index.html                              # HTML shell — Vite injects bundle here
│   ├── favicon.ico
│   └── robots.txt
│
├── src/
│   │
│   ├── main.tsx                                # React root mount — BrowserRouter + Providers
│   ├── App.tsx                                 # Top-level router: public / candidate / recruiter / admin
│   │
│   ├── pages/                                  # One folder per role, one file per route
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx                   # Email + password, stores JWT
│   │   │   ├── RegisterPage.tsx                # Role selector + registration form
│   │   │   └── ForgotPasswordPage.tsx
│   │   │
│   │   ├── candidate/
│   │   │   ├── DashboardPage.tsx               # List of invited assessments
│   │   │   ├── TestPage.tsx                    # Problem list + countdown timer
│   │   │   ├── SolvePage.tsx                   # Monaco Editor + run/submit UI
│   │   │   ├── ResultsPage.tsx                 # Score breakdown + AI feedback panel
│   │   │   └── SchedulePage.tsx                # Book an interview slot
│   │   │
│   │   ├── recruiter/
│   │   │   ├── DashboardPage.tsx               # Tests list + candidate pipeline
│   │   │   ├── CreateTestPage.tsx              # Multi-step test builder wizard
│   │   │   ├── TestDetailPage.tsx              # Test submissions + leaderboard
│   │   │   ├── CandidateReportPage.tsx         # Full candidate report: code + AI + video
│   │   │   └── SchedulePage.tsx                # Calendar view + manage slots
│   │   │
│   │   └── admin/
│   │       ├── DashboardPage.tsx               # Platform-wide stats
│   │       ├── UsersPage.tsx                   # User management table
│   │       └── CompaniesPage.tsx               # Company + plan management
│   │
│   ├── components/                             # Reusable UI components
│   │   │
│   │   ├── editor/
│   │   │   ├── CodeEditor.tsx                  # Monaco Editor wrapper (theme, keybindings)
│   │   │   ├── LanguageSelector.tsx            # Python / Java / C++ dropdown
│   │   │   ├── RunButton.tsx                   # Run + loading spinner state
│   │   │   └── OutputPanel.tsx                 # Tabs: stdout | stderr | test results
│   │   │
│   │   ├── feedback/
│   │   │   ├── AIFeedbackCard.tsx              # Quality score, complexity, style tips
│   │   │   ├── PlagiarismBadge.tsx             # Similarity % with color threshold indicator
│   │   │   └── VerdictBadge.tsx                # Hire / Maybe / Reject chip
│   │   │
│   │   ├── leaderboard/
│   │   │   ├── LeaderboardTable.tsx            # Rank, name, score, time, language columns
│   │   │   └── ScoreChart.tsx                  # Recharts score distribution histogram
│   │   │
│   │   ├── scheduling/
│   │   │   ├── SlotPicker.tsx                  # Calendar day picker + time grid
│   │   │   └── VideoJoinButton.tsx             # Daily.co / Jitsi join link button
│   │   │
│   │   ├── layout/
│   │   │   ├── CandidateLayout.tsx             # Sidebar + topbar for candidate role
│   │   │   ├── RecruiterLayout.tsx             # Sidebar + topbar for recruiter role
│   │   │   ├── AdminLayout.tsx                 # Sidebar + topbar for admin role
│   │   │   ├── Sidebar.tsx                     # Collapsible nav sidebar
│   │   │   └── Topbar.tsx                      # Top nav with user avatar + logout
│   │   │
│   │   └── ui/                                 # Atomic design system primitives
│   │       ├── Button.tsx                      # Variants: primary, ghost, danger, loading
│   │       ├── Badge.tsx                       # Status badges: pass / fail / pending
│   │       ├── Modal.tsx                       # Accessible dialog (focus trap)
│   │       ├── Spinner.tsx                     # SVG loading indicator
│   │       ├── Toast.tsx                       # react-hot-toast wrapper
│   │       ├── Input.tsx                       # Controlled text input with error state
│   │       ├── Select.tsx                      # Styled select dropdown
│   │       ├── Table.tsx                       # Sortable, paginated data table
│   │       ├── Card.tsx                        # Content card container
│   │       └── ProgressBar.tsx                 # Score / completion progress bar
│   │
│   ├── hooks/                                  # Custom React hooks
│   │   ├── useSubmission.ts                    # Submit code, poll WS for result
│   │   ├── useLeaderboard.ts                   # Fetch + auto-refresh leaderboard every 30s
│   │   ├── useAuth.ts                          # JWT store, auto-refresh, redirect on expire
│   │   ├── useTimer.ts                         # Countdown timer, emit event at zero
│   │   ├── useWebSocket.ts                     # WS connect/reconnect, message dispatch
│   │   └── useToast.ts                         # Convenience wrapper for toast notifications
│   │
│   ├── store/                                  # Zustand global state
│   │   ├── authStore.ts                        # user, role, accessToken, refreshToken
│   │   ├── editorStore.ts                      # code, language, isRunning, lastResult
│   │   └── notificationStore.ts                # unread count, notification list
│   │
│   ├── api/                                    # All API communication
│   │   ├── client.ts                           # Axios instance: baseURL, JWT interceptor, refresh
│   │   ├── auth.api.ts                         # register(), login(), refreshToken(), me()
│   │   ├── problems.api.ts                     # listProblems(), getProblem(), createProblem()
│   │   ├── submissions.api.ts                  # submitCode(), getResult(), getHistory()
│   │   ├── assessments.api.ts                  # createAssessment(), inviteCandidate()
│   │   ├── feedback.api.ts                     # getFeedback(), getPlagiarismReport()
│   │   ├── scheduling.api.ts                   # getSlots(), bookSlot(), cancelSlot()
│   │   └── analytics.api.ts                    # getLeaderboard(), getStats(), getFunnel()
│   │
│   ├── utils/                                  # Pure utility functions
│   │   ├── formatters.ts                       # formatDate, formatScore, formatDuration
│   │   ├── validators.ts                       # validateEmail, validatePassword
│   │   ├── constants.ts                        # LANGUAGES, API_BASE_URL, WS_BASE_URL
│   │   └── errorHandler.ts                     # Axios error → user-friendly message
│   │
│   ├── types/                                  # TypeScript type definitions
│   │   ├── api.types.ts                        # All API request/response interfaces
│   │   ├── models.types.ts                     # Problem, Submission, AIFeedback, Slot, User
│   │   └── enums.ts                            # Role, Language, SubmissionStatus, Difficulty
│   │
│   ├── router/
│   │   ├── index.tsx                           # createBrowserRouter with all routes
│   │   ├── PrivateRoute.tsx                    # Auth guard — redirect to /login if no token
│   │   └── RoleRoute.tsx                       # Role guard — redirect if wrong role
│   │
│   └── assets/
│       ├── logo.svg
│       └── styles/
│           ├── index.css                       # Tailwind directives + CSS variables
│           └── editor.css                      # Monaco Editor theme overrides
│
├── jenkins/                                    # Jenkins CI/CD for frontend
│   ├── Jenkinsfile                             # Main declarative pipeline (frontend)
│   └── scripts/
│       ├── install_deps.py                     # npm ci with cache check
│       ├── run_lint.py                         # eslint + prettier --check
│       ├── run_tests.py                        # vitest run with coverage
│       ├── build_app.py                        # npm run build → dist/
│       ├── build_docker.py                     # docker build frontend image
│       ├── push_docker.py                      # docker push to registry
│       ├── deploy_staging.py                   # kubectl set image → staging
│       ├── deploy_production.py                # kubectl set image → production
│       ├── run_smoke_tests.py                  # Playwright E2E smoke tests
│       └── send_notification.py                # Slack/email build status
│
├── tests/                                      # Frontend tests
│   ├── unit/
│   │   ├── components/
│   │   │   ├── CodeEditor.test.tsx             # Monaco render, language switch
│   │   │   ├── AIFeedbackCard.test.tsx         # Score display, verdict chips
│   │   │   └── LeaderboardTable.test.tsx       # Sort, rank display
│   │   ├── hooks/
│   │   │   ├── useAuth.test.ts                 # Token refresh, logout logic
│   │   │   └── useTimer.test.ts                # Countdown accuracy
│   │   └── utils/
│   │       ├── formatters.test.ts
│   │       └── validators.test.ts
│   ├── integration/
│   │   ├── LoginFlow.test.tsx                  # Login → role redirect
│   │   ├── SubmitCode.test.tsx                 # Editor → submit → result
│   │   └── Leaderboard.test.tsx                # Fetch + render leaderboard
│   └── e2e/
│       ├── playwright.config.ts
│       ├── auth.spec.ts                        # Register + login E2E
│       ├── candidate_flow.spec.ts              # Join test → solve → submit → result
│       └── recruiter_flow.spec.ts              # Create test → invite → review
│
├── vite.config.ts                              # Vite: proxy /api → backend, aliases
├── tailwind.config.ts                          # Design tokens, custom colors, font
├── tsconfig.json                               # Strict TS, @ alias → src/
├── tsconfig.node.json                          # For vite.config.ts
├── vitest.config.ts                            # Vitest: jsdom, coverage thresholds
├── eslint.config.js                            # ESLint: react, typescript, import rules
├── .prettierrc                                 # Prettier: single quotes, trailing commas
├── .env.example                                # VITE_API_URL, VITE_WS_URL, VITE_DAILY_DOMAIN
├── Dockerfile                                  # Multi-stage: node build → nginx serve
└── nginx.conf                                  # SPA fallback: try_files $uri /index.html
```

---

## Key files content

### `jenkins/Jenkinsfile` (Frontend)
```groovy
pipeline {
    agent any

    environment {
        IMAGE_NAME     = "your-registry/interview-frontend"
        IMAGE_TAG      = "${GIT_COMMIT[0..7]}"
        REGISTRY_CREDS = credentials('docker-registry-creds')
        KUBECONFIG     = credentials('kubeconfig-prod')
        VITE_API_URL   = credentials('vite-api-url-prod')
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install') {
            steps { sh 'python jenkins/scripts/install_deps.py' }
        }

        stage('Lint') {
            steps { sh 'python jenkins/scripts/run_lint.py' }
        }

        stage('Unit tests') {
            steps { sh 'python jenkins/scripts/run_tests.py' }
            post {
                always {
                    junit 'reports/junit.xml'
                }
            }
        }

        stage('Build') {
            steps { sh 'python jenkins/scripts/build_app.py' }
        }

        stage('Docker build & push') {
            steps {
                sh 'python jenkins/scripts/build_docker.py'
                sh 'python jenkins/scripts/push_docker.py'
            }
        }

        stage('Deploy staging') {
            when { branch 'develop' }
            steps {
                sh 'python jenkins/scripts/deploy_staging.py'
                sh 'python jenkins/scripts/run_smoke_tests.py --env staging'
            }
        }

        stage('Approval') {
            when { branch 'main' }
            steps {
                input message: 'Ship frontend to production?', ok: 'Deploy'
            }
        }

        stage('Deploy production') {
            when { branch 'main' }
            steps {
                sh 'python jenkins/scripts/deploy_production.py'
                sh 'python jenkins/scripts/run_smoke_tests.py --env production'
            }
        }
    }

    post {
        success { sh 'python jenkins/scripts/send_notification.py --status success --service frontend' }
        failure { sh 'python jenkins/scripts/send_notification.py --status failure --service frontend' }
    }
}
```

### `jenkins/scripts/install_deps.py`
```python
import subprocess, sys, os

def main():
    # Use npm ci for deterministic installs from package-lock.json
    result = subprocess.run(
        ["npm", "ci", "--prefer-offline"],
        check=False
    )
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
```

### `jenkins/scripts/run_lint.py`
```python
import subprocess, sys

def main():
    failed = False

    # ESLint
    r1 = subprocess.run(["npx", "eslint", "src/", "--ext", ".ts,.tsx"], check=False)
    if r1.returncode != 0:
        failed = True
        print("ESLint FAILED")

    # Prettier
    r2 = subprocess.run(["npx", "prettier", "--check", "src/"], check=False)
    if r2.returncode != 0:
        failed = True
        print("Prettier FAILED")

    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
```

### `jenkins/scripts/run_tests.py`
```python
import subprocess, sys

def main():
    result = subprocess.run(
        ["npx", "vitest", "run", "--reporter=junit", "--outputFile=reports/junit.xml"],
        check=False
    )
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
```

### `jenkins/scripts/build_app.py`
```python
import subprocess, sys, os

def main():
    env = {**os.environ, "NODE_ENV": "production"}
    result = subprocess.run(["npm", "run", "build"], env=env, check=False)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
```

### `jenkins/scripts/run_smoke_tests.py`
```python
import argparse, subprocess, sys

ENVS = {
    "staging":    "https://staging.yourdomain.com",
    "production": "https://yourdomain.com",
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", choices=ENVS.keys(), required=True)
    args = parser.parse_args()

    base_url = ENVS[args.env]
    result = subprocess.run(
        ["npx", "playwright", "test", "tests/e2e/",
         "--reporter=list", f"--project=chromium"],
        env={**__import__("os").environ, "BASE_URL": base_url},
        check=False
    )
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
```

### `jenkins/scripts/send_notification.py`
```python
import argparse, os, requests

SLACK_WEBHOOK = os.environ.get("SLACK_WEBHOOK_URL", "")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--status", choices=["success", "failure"], required=True)
    parser.add_argument("--service", default="backend")
    args = parser.parse_args()

    branch  = os.environ.get("GIT_BRANCH", "unknown")
    commit  = os.environ.get("GIT_COMMIT", "")[:8]
    job     = os.environ.get("JOB_NAME", "")
    build   = os.environ.get("BUILD_NUMBER", "")
    url     = os.environ.get("BUILD_URL", "")

    emoji   = ":white_check_mark:" if args.status == "success" else ":x:"
    color   = "good" if args.status == "success" else "danger"
    text    = (
        f"{emoji} *{args.service}* build *{args.status.upper()}*\n"
        f"Branch: `{branch}` | Commit: `{commit}`\n"
        f"Job: <{url}|{job} #{build}>"
    )

    if SLACK_WEBHOOK:
        requests.post(SLACK_WEBHOOK, json={"text": text, "color": color}, timeout=10)
    else:
        print(text)

if __name__ == "__main__":
    main()
```

### `Dockerfile` (Frontend — multi-stage)
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline
COPY . .
ARG VITE_API_URL
ARG VITE_WS_URL
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### `nginx.conf`
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

### `vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws':  { target: 'ws://localhost:8000',   ws: true }
    }
  }
})
```

### `.env.example`
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_DAILY_CO_DOMAIN=your-domain.daily.co
```
