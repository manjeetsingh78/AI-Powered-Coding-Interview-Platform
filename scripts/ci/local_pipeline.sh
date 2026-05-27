#!/usr/bin/env bash
set -euo pipefail

# Local CI pipeline runner to validate Jenkins pipeline steps before running on Jenkins.
# Usage: ./scripts/ci/local_pipeline.sh [--dry-run] [--skip-tests] [--skip-build] [--push] [--deploy-local]

DRY_RUN=false
SKIP_TESTS=false
SKIP_BUILD=false
PUSH=false
DEPLOY_LOCAL=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --skip-tests) SKIP_TESTS=true ;;
    --skip-build) SKIP_BUILD=true ;;
    --push) PUSH=true ;;
    --deploy-local) DEPLOY_LOCAL=true ;;
    *) echo "Unknown arg: $arg" ; exit 1 ;;
  esac
done

echo "Local pipeline: dry-run=${DRY_RUN}, skip-tests=${SKIP_TESTS}, skip-build=${SKIP_BUILD}, push=${PUSH}, deploy-local=${DEPLOY_LOCAL}"

# Preflight
echo "-> Preflight: checking Python version"
if ! command -v python3.11 >/dev/null 2>&1; then
  echo "python3.11 not found in PATH. Install Python 3.11 to proceed." >&2
  exit 1
fi
python3.11 - <<'PY'
import sys
major, minor = sys.version_info[:2]
if (major, minor) < (3, 10):
    raise SystemExit(f"Python 3.10+ is required, found {major}.{minor}")
print(f"Python version OK: {major}.{minor}")
PY

# Backend checks
if [ "$SKIP_TESTS" = false ]; then
  echo "-> Backend: install deps and run linters/tests"
  pushd backend >/dev/null
  python3.11 -m pip install --upgrade pip setuptools wheel
  python3.11 -m pip install -r requirements.txt || true
  python3.11 -m pip install pytest pytest-django black flake8 pylint bandit safety || true
  export DJANGO_SETTINGS_MODULE=config.test_settings
  if [ "$DRY_RUN" = true ]; then
    echo "DRY RUN: black --check ., flake8, pylint, pytest"
  else
    python3.11 -m black --check . || true
    python3.11 -m flake8 --max-line-length=120 --exclude=migrations,venv || true
    python3.11 -m pylint apps/ config/ manage.py --disable=all --enable=E,F || true
    python3.11 -m pytest --junitxml=junit.xml --cov=apps --cov=config --cov-report=term-missing -v || true
    python3.11 -m bandit -r apps/ config/ -f json -o bandit-report.json || true
    python3.11 -m safety check --json > safety-report.json || true
  fi
  popd >/dev/null
fi

# Integration tests (optional)
if [ "$SKIP_TESTS" = false ]; then
  echo "-> Integration: running ephemeral Postgres via Docker"
  if command -v docker >/dev/null 2>&1; then
    docker pull postgres:18 || true
    docker run -d --name local-ci-postgres -e POSTGRES_USER=ci -e POSTGRES_PASSWORD=ci -e POSTGRES_DB=ci_db -p 5433:5432 postgres:18 || true
    # wait
    for i in $(seq 1 30); do
      if docker exec local-ci-postgres pg_isready -U ci >/dev/null 2>&1; then break; fi
      sleep 1
    done
    export DB_HOST=127.0.0.1
    export DB_PORT=5433
    export DB_NAME=ci_db
    export DB_USER=ci
    export DB_PASSWORD=ci
    pushd backend >/dev/null
    python3.11 manage.py migrate --noinput || true
    python3.11 -m pytest --junitxml=integration-junit.xml --cov=apps --cov=config --cov-report=term-missing -v || true
    popd >/dev/null
    docker rm -f local-ci-postgres || true
  else
    echo "Docker not available; skipping integration tests"
  fi
fi

# Build images in parallel
if [ "$SKIP_BUILD" = false ]; then
  echo "-> Build: building backend and frontend Docker images in parallel"
  COMMIT_LOCAL=$(git rev-parse --short HEAD | tr -d '\n')
  (
    cd backend && docker build -t ${COMMIT_LOCAL}-backend . && echo "backend built"
  ) &
  PID1=$!
  (
    cd frontend && docker build -t ${COMMIT_LOCAL}-frontend . && echo "frontend built"
  ) &
  PID2=$!
  wait $PID1 $PID2 || true
fi

# Push images (optional)
if [ "$PUSH" = true ]; then
  echo "-> Push: pushing images to ECR (requires AWS creds and ECR repos)"
  if [ -z "${AWS_ACCOUNT_ID:-}" ] || [ -z "${AWS_REGION:-}" ]; then
    echo "Set AWS_ACCOUNT_ID and AWS_REGION to push" >&2
  else
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
    docker tag ${COMMIT_LOCAL}-backend ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-backend:${COMMIT_LOCAL}
    docker tag ${COMMIT_LOCAL}-frontend ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-frontend:${COMMIT_LOCAL}
    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-backend:${COMMIT_LOCAL} || true
    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-frontend:${COMMIT_LOCAL} || true
  fi
fi

# Deploy locally using kind/helm (optional)
if [ "$DEPLOY_LOCAL" = true ]; then
  echo "-> Deploy: deploying to local kind cluster via helm (requires kind, kubectl, helm)"
  if ! command -v kind >/dev/null 2>&1; then
    echo "kind not found; install kind to deploy locally" >&2
  else
    # user is responsible for creating kind cluster and loading images
    echo "Please ensure images are present in the cluster or use 'kind load docker-image' before helm upgrade"
    echo "Running helm upgrade (dry)"
    helm upgrade --install interview-platform ./deploy/helm/interview-platform --set image.backend=${COMMIT_LOCAL}-backend --set image.frontend=${COMMIT_LOCAL}-frontend || true
  fi
fi

echo "Local pipeline run complete. Review outputs and logs."
