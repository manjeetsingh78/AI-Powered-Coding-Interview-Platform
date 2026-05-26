#!/usr/bin/env bash
set -euo pipefail

# Usage:
# upload_reports_to_s3.sh <bucket> <prefix> <deploy-env> <job-name> <build-number> <region>

BUCKET=${1:-}
PREFIX=${2:-reports}
DEPLOY_ENV=${3:-unknown}
JOB_NAME=${4:-unknown-job}
BUILD_NUMBER=${5:-0}
REGION=${6:-ap-south-1}

if [ -z "${BUCKET}" ]; then
  echo "S3 bucket is required" >&2
  exit 1
fi

TIMESTAMP_UTC=$(date -u +"%Y%m%dT%H%M%SZ")
SAFE_JOB_NAME=$(echo "${JOB_NAME}" | tr '/ ' '__')
BASE_DIR="reports/${DEPLOY_ENV}/${SAFE_JOB_NAME}/build-${BUILD_NUMBER}/${TIMESTAMP_UTC}"
WORK_DIR=$(mktemp -d)
REPORT_DIR="${WORK_DIR}/${BASE_DIR}"

mkdir -p "${REPORT_DIR}/backend" "${REPORT_DIR}/frontend" "${REPORT_DIR}/security" "${REPORT_DIR}/meta"

# Backend reports
for file in backend/junit.xml backend/coverage.xml backend/safety-report.json backend/bandit-report.json; do
  if [ -f "${file}" ]; then
    cp "${file}" "${REPORT_DIR}/backend/"
  fi
done

if [ -d backend/htmlcov ]; then
  cp -R backend/htmlcov "${REPORT_DIR}/backend/"
fi

# Frontend reports
if [ -d frontend/coverage ]; then
  cp -R frontend/coverage "${REPORT_DIR}/frontend/"
fi

# Security and scan reports
for file in frontend/snyk-report.json backend/snyk-report.json backend-trivy-report.json frontend-trivy-report.json zap-report.html; do
  if [ -f "${file}" ]; then
    cp "${file}" "${REPORT_DIR}/security/"
  fi
done

# Build metadata
if [ -f build-info.json ]; then
  cp build-info.json "${REPORT_DIR}/meta/"
fi

cat > "${REPORT_DIR}/meta/report-manifest.json" <<EOF
{
  "bucket": "${BUCKET}",
  "prefix": "${PREFIX}",
  "deploy_env": "${DEPLOY_ENV}",
  "job_name": "${JOB_NAME}",
  "build_number": "${BUILD_NUMBER}",
  "timestamp_utc": "${TIMESTAMP_UTC}",
  "region": "${REGION}"
}
EOF

echo "Uploading reports to s3://${BUCKET}/${PREFIX}/${BASE_DIR}/"
aws s3 cp "${REPORT_DIR}/" "s3://${BUCKET}/${PREFIX}/${BASE_DIR}/" --recursive --region "${REGION}"

echo "Reports uploaded successfully"
