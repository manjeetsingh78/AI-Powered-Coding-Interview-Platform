#!/usr/bin/env bash
set -euo pipefail

AWS_REGION=${1:-us-east-1}
ECR_BACKEND=${2:-interview-backend}
ECR_FRONTEND=${3:-interview-frontend}

echo "Creating ECR repos in ${AWS_REGION}: ${ECR_BACKEND}, ${ECR_FRONTEND}"
aws ecr create-repository --repository-name "${ECR_BACKEND}" --region "${AWS_REGION}" || true
aws ecr create-repository --repository-name "${ECR_FRONTEND}" --region "${AWS_REGION}" || true

echo "Done."
