#!/usr/bin/env bash
set -euo pipefail

ENV=${1:-staging}
echo "Running smoke tests for ${ENV}"

# Simple check: endpoint health
BACKEND_URL=${BACKEND_URL:-"http://backend.${ENV}.svc.cluster.local:8000/health"}

echo "Checking ${BACKEND_URL}"
if curl -fsS ${BACKEND_URL}; then
  echo "Smoke test passed"
  exit 0
else
  echo "Smoke test failed" >&2
  exit 2
fi
