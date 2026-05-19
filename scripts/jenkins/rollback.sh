#!/usr/bin/env bash
set -euo pipefail

ENV=${1:-staging}
RELEASE_NAME=${2:-interview-platform-backend-${ENV}}

echo "Rolling back Helm release ${RELEASE_NAME} in namespace ${ENV}"

# get previous revision
REV=$(helm history ${RELEASE_NAME} -n ${ENV} --max=5 -o json | jq -r '.[-2].revision')
if [ -z "${REV}" ]; then
  echo "No previous revision found for ${RELEASE_NAME}" >&2
  exit 1
fi

echo "Rolling back to revision ${REV}"
helm rollback ${RELEASE_NAME} ${REV} -n ${ENV}

echo "Rollback complete"
