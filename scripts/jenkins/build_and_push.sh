#!/usr/bin/env bash
set -euo pipefail

# Usage: build_and_push.sh <aws-region> <ecr-account> <backend-repo> <frontend-repo> <image-tag>
REGION=${1:-us-east-1}
ECR_ACCOUNT=${2:-}
BACKEND_REPO=${3:-backend-repo}
FRONTEND_REPO=${4:-frontend-repo}
IMAGE_TAG=${5:-latest}

if [ -z "${ECR_ACCOUNT}" ]; then
  echo "ECR account not provided. Set ECR_ACCOUNT or pass as second arg." >&2
  exit 1
fi

echo "Logging in to ECR ${ECR_ACCOUNT} in ${REGION}"
aws ecr get-login-password --region "${REGION}" | docker login --username AWS --password-stdin "${ECR_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"

BACKEND_IMAGE="${ECR_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${BACKEND_REPO}:${IMAGE_TAG}"
FRONTEND_IMAGE="${ECR_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${FRONTEND_REPO}:${IMAGE_TAG}"

for repo in "${BACKEND_REPO}" "${FRONTEND_REPO}"; do
  if ! aws ecr describe-repositories --repository-names "${repo}" --region "${REGION}" >/dev/null 2>&1; then
    echo "Creating ECR repository: ${repo}"
    aws ecr create-repository --repository-name "${repo}" --region "${REGION}" || true
  fi
done

echo "Building backend image: ${BACKEND_IMAGE}"
docker build -t "${BACKEND_IMAGE}" -f backend/Dockerfile .
docker push "${BACKEND_IMAGE}"

echo "Building frontend image: ${FRONTEND_IMAGE}"
docker build -t "${FRONTEND_IMAGE}" -f frontend/Dockerfile .
docker push "${FRONTEND_IMAGE}"

echo "Images pushed:"
echo " - ${BACKEND_IMAGE}"
echo " - ${FRONTEND_IMAGE}"
