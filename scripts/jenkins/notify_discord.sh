#!/usr/bin/env bash
set -euo pipefail

STATUS=${1:-unknown}
BUILD_URL=${2:-}
JOB_NAME=${3:-}
BRANCH=${4:-}
COMMIT=${5:-}
IMAGE_TAG=${6:-}

WEBHOOK=${DISCORD_WEBHOOK:-}
if [ -z "${WEBHOOK}" ]; then
  echo "DISCORD_WEBHOOK not set; skipping notification"
  exit 0
fi

COLOR=3066993
if [ "${STATUS}" = "failure" ]; then
  COLOR=15158332
elif [ "${STATUS}" = "success" ]; then
  COLOR=3066993
else
  COLOR=9807270
fi

# Optional additional fields
FIELDS=""
if [ ! -z "${TEST_TOTAL:-}" ]; then
  FIELDS+="{\"name\": \"Tests\", \"value\": \"${TEST_TOTAL} total, ${TEST_FAILED} failed\", \"inline\": true},"
fi
if [ ! -z "${COVERAGE_PERCENT:-}" ]; then
  FIELDS+="{\"name\": \"Coverage\", \"value\": \"${COVERAGE_PERCENT}%\", \"inline\": true},"
fi
if [ ! -z "${SNYK_HIGH:-}" ]; then
  FIELDS+="{\"name\": \"Snyk high\", \"value\": \"${SNYK_HIGH}\", \"inline\": true},"
fi

PAYLOAD=$(cat <<EOF
{
  "username": "CI Bot",
  "embeds": [
    {
      "title": "${JOB_NAME} - ${STATUS}",
      "url": "${BUILD_URL}",
      "color": ${COLOR},
      "fields": [
        {"name": "Branch", "value": "${BRANCH}", "inline": true},
        {"name": "Commit", "value": "${COMMIT}", "inline": true},
        {"name": "Image Tag", "value": "${IMAGE_TAG}", "inline": false},
        ${FIELDS}
        {"name": "Details", "value": "<${BUILD_URL}|View build details>", "inline": false}
      ]
    }
  ]
}
EOF
)

curl -s -H "Content-Type: application/json" -d "${PAYLOAD}" "${WEBHOOK}" || true
