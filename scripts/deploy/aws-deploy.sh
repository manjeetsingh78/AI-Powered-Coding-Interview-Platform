#!/bin/bash
#
# AWS Deployment Automation Script
# This script automates the deployment of the Interview Platform on AWS.
#
# Usage: ./scripts/deploy/aws-deploy.sh [OPTIONS]
#
# Options:
#   --stage STAGE              Deployment stage: bootstrap, destroy, infra, docker, helm, all, rebuild (default: all)
#   --aws-region REGION        AWS region (default: ap-south-1)
#   --cluster-name NAME        EKS cluster name (default: interview-platform-eks)
#   --db-password PASSWORD     RDS database password (required for infra stage)
#   --secret-key SECRET        Django SECRET_KEY for the backend (required for helm/all)
#   --create-monitoring        Install Prometheus and Fluent Bit
#   --help                     Show this help message

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGE="${STAGE:-all}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
CLUSTER_NAME="${CLUSTER_NAME:-interview-platform-eks}"
DB_PASSWORD="${DB_PASSWORD:-}"
SECRET_KEY="${SECRET_KEY:-}"
CREATE_MONITORING="${CREATE_MONITORING:-false}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

terraform_init_with_retry() {
    local attempts=3
    local delay=20

    for attempt in $(seq 1 "$attempts"); do
        if terraform init; then
            return 0
        fi

        if [ "$attempt" -lt "$attempts" ]; then
            log_warn "terraform init failed; retrying in ${delay}s (${attempt}/${attempts})..."
            sleep "$delay"
        fi
    done

    return 1
}

# Parse command-line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --stage)
                STAGE="$2"
                shift 2
                ;;
            --aws-region)
                AWS_REGION="$2"
                shift 2
                ;;
            --cluster-name)
                CLUSTER_NAME="$2"
                shift 2
                ;;
            --db-password)
                DB_PASSWORD="$2"
                shift 2
                ;;
            --secret-key)
                SECRET_KEY="$2"
                shift 2
                ;;
            --create-monitoring)
                CREATE_MONITORING="true"
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    grep '^#' "${BASH_SOURCE[0]}" | head -20
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing=()
    
    for cmd in aws terraform kubectl helm docker; do
        if ! command -v $cmd &> /dev/null; then
            missing+=("$cmd")
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing prerequisites: ${missing[*]}"
        log_info "Please install the missing tools and try again."
        exit 1
    fi

    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is installed but the daemon is not reachable."
        log_info "Start Docker Desktop or point DOCKER_HOST at a running Docker engine, then rerun the deploy."
        exit 1
    fi
    
    log_success "All prerequisites found"
}

# Bootstrap Terraform remote state
bootstrap_terraform_state() {
    log_info "=== Bootstrap Stage: Creating Terraform State Backend ==="
    
    cd "${PROJECT_ROOT}/infra/terraform"
    
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    TF_STATE_BUCKET="interview-platform-tfstate-${AWS_ACCOUNT_ID}"
    TF_LOCKS_TABLE="interview-platform-tfstate-locks"
    
    log_info "AWS Account ID: ${AWS_ACCOUNT_ID}"
    log_info "State bucket: ${TF_STATE_BUCKET}"
    log_info "Locks table: ${TF_LOCKS_TABLE}"

    log_info "Creating S3 bucket for Terraform state if needed..."
    if aws s3api head-bucket --bucket "${TF_STATE_BUCKET}" 2>/dev/null; then
        log_info "State bucket already exists"
    else
        if [ "${AWS_REGION}" = "us-east-1" ]; then
            aws s3api create-bucket \
                --bucket "${TF_STATE_BUCKET}" \
                --region "${AWS_REGION}"
        else
            aws s3api create-bucket \
                --bucket "${TF_STATE_BUCKET}" \
                --region "${AWS_REGION}" \
                --create-bucket-configuration LocationConstraint="${AWS_REGION}"
        fi
    fi

    log_info "Waiting for state bucket to become available..."
    aws s3api wait bucket-exists --bucket "${TF_STATE_BUCKET}"

    log_info "Enabling state bucket versioning and encryption..."
    aws s3api put-bucket-versioning \
        --bucket "${TF_STATE_BUCKET}" \
        --versioning-configuration Status=Enabled
    aws s3api put-bucket-encryption \
        --bucket "${TF_STATE_BUCKET}" \
        --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

    log_info "Creating DynamoDB lock table if needed..."
    if aws dynamodb describe-table --table-name "${TF_LOCKS_TABLE}" --region "${AWS_REGION}" >/dev/null 2>&1; then
        log_info "Lock table already exists"
    else
        aws dynamodb create-table \
            --table-name "${TF_LOCKS_TABLE}" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region "${AWS_REGION}"
        aws dynamodb wait table-exists --table-name "${TF_LOCKS_TABLE}" --region "${AWS_REGION}"
    fi
    
    log_success "Remote state backend created"
    log_info "Configuring backend.tf automatically..."
    cat > backend.tf <<EOF
terraform {
  backend "s3" {
    bucket         = "${TF_STATE_BUCKET}"
    key            = "infra/terraform.tfstate"
    region         = "${AWS_REGION}"
    dynamodb_table = "${TF_LOCKS_TABLE}"
    encrypt        = true
  }
}
EOF
    log_info "Migrating state to S3 backend..."
    terraform init -force-copy
}

# Provision AWS infrastructure
provision_infrastructure() {
    log_info "=== Infrastructure Stage: Provisioning AWS Resources ==="
    
    if [ -z "$DB_PASSWORD" ]; then
        log_error "DB_PASSWORD is required for infrastructure provisioning"
        log_info "Usage: --db-password <password>"
        exit 1
    fi
    
    cd "${PROJECT_ROOT}/infra/terraform"
    
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Create terraform.tfvars if it doesn't exist
    if [ ! -f terraform.tfvars ]; then
        log_info "Creating terraform.tfvars..."
        cat > terraform.tfvars <<EOF
aws_region        = "${AWS_REGION}"
cluster_name      = "${CLUSTER_NAME}"
vpc_cidr          = "10.0.0.0/16"
ecr_backend_repo  = "interview-platform-backend"
ecr_frontend_repo = "interview-platform-frontend"
db_username       = "interview_admin"
db_password       = "${DB_PASSWORD}"
db_name           = "interview_platform"
create_rds        = true
create_elasticache = true
create_s3         = true
create_kms        = true
EOF
    fi
    
    log_info "Initializing Terraform..."
    terraform_init_with_retry

    if grep -Eq '^[[:space:]]*deploy_k8s_from_local[[:space:]]*=[[:space:]]*false' terraform.tfvars; then
        log_info "Removing old Kubernetes/Helm resources from Terraform state; Helm deploy manages them separately."
        terraform state rm 'kubernetes_namespace_v1.monitoring[0]' >/dev/null 2>&1 || true
        terraform state rm 'kubernetes_secret_v1.datadog_api[0]' >/dev/null 2>&1 || true
        terraform state rm 'helm_release.prometheus_stack[0]' >/dev/null 2>&1 || true
        terraform state rm 'helm_release.datadog[0]' >/dev/null 2>&1 || true
    fi
    
    log_info "Planning infrastructure changes..."
    terraform plan -var-file=terraform.tfvars -out=tfplan
    
    log_info "Applying Terraform configuration..."
    terraform apply tfplan
    
    log_success "Infrastructure provisioned"
    
    # Save outputs
    log_info "Saving Terraform outputs..."
    terraform output -json > outputs.json
    
    cd "${PROJECT_ROOT}"
}

destroy_infrastructure() {
    log_warn "=== Destroy Stage: Removing AWS Infrastructure Managed by Terraform ==="
    log_warn "This will delete EKS, Jenkins EC2, RDS, Redis, ECR, S3 assets, IAM, WAF, and related resources in the current Terraform state."

    cd "${PROJECT_ROOT}/infra/terraform"

    log_info "Initializing Terraform..."
    terraform_init_with_retry

    log_info "Cleaning up any EKS node groups still attached to ${CLUSTER_NAME}..."
    local nodegroups
    nodegroups=$(aws eks list-nodegroups \
        --region "${AWS_REGION}" \
        --cluster-name "${CLUSTER_NAME}" \
        --query 'nodegroups[]' \
        --output text 2>/dev/null || true)

    if [ -n "$nodegroups" ]; then
        for nodegroup in $nodegroups; do
            log_warn "Deleting EKS node group: ${nodegroup}"
            aws eks delete-nodegroup \
                --region "${AWS_REGION}" \
                --cluster-name "${CLUSTER_NAME}" \
                --nodegroup-name "${nodegroup}" >/dev/null 2>&1 || true
        done

        for nodegroup in $nodegroups; do
            log_info "Waiting for EKS node group to delete: ${nodegroup}"
            aws eks wait nodegroup-deleted \
                --region "${AWS_REGION}" \
                --cluster-name "${CLUSTER_NAME}" \
                --nodegroup-name "${nodegroup}" || true
        done
    else
        log_info "No EKS node groups found or cluster already deleted"
    fi

    log_info "Making sure RDS destroy skips the final snapshot for this teardown..."
    terraform apply \
        -target=module.rds.aws_db_instance.this \
        -var-file=terraform.tfvars \
        -var='create_rds=true' \
        -auto-approve >/dev/null 2>&1 || true

    if grep -Eq '^[[:space:]]*deploy_k8s_from_local[[:space:]]*=[[:space:]]*false' terraform.tfvars; then
        log_info "Removing old Kubernetes/Helm resources from Terraform state before destroy."
        terraform state rm 'kubernetes_namespace_v1.monitoring[0]' >/dev/null 2>&1 || true
        terraform state rm 'kubernetes_secret_v1.datadog_api[0]' >/dev/null 2>&1 || true
        terraform state rm 'helm_release.prometheus_stack[0]' >/dev/null 2>&1 || true
        terraform state rm 'helm_release.datadog[0]' >/dev/null 2>&1 || true
    fi

    log_warn "Destroying Terraform-managed infrastructure..."
    terraform destroy -var-file=terraform.tfvars -auto-approve

    log_success "Terraform-managed infrastructure destroyed"
    cd "${PROJECT_ROOT}"
}

# Build and push Docker images
build_and_push_images() {
    log_info "=== Docker Stage: Building and Pushing Images to ECR ==="
    
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    BACKEND_ECR_URI=$(cd "${PROJECT_ROOT}/infra/terraform" && terraform output -raw ecr_backend_repository_url 2>/dev/null || echo "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-backend")
    FRONTEND_ECR_URI=$(cd "${PROJECT_ROOT}/infra/terraform" && terraform output -raw ecr_frontend_repository_url 2>/dev/null || echo "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-frontend")

    log_info "Backend ECR URI: ${BACKEND_ECR_URI}"
    log_info "Frontend ECR URI: ${FRONTEND_ECR_URI}"
    
    # ECR login
    log_info "Logging into Amazon ECR..."
    aws ecr get-login-password --region ${AWS_REGION} | \
        docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    # Backend image
    log_info "Building backend image..."
    docker build -t "${BACKEND_ECR_URI}:latest" -f backend/Dockerfile backend/
    
    log_info "Scanning backend image for vulnerabilities (Trivy)..."
    trivy image --severity CRITICAL,HIGH "${BACKEND_ECR_URI}:latest" || log_warn "Trivy scan found issues (non-blocking)"
    
    log_info "Pushing backend image..."
    docker push "${BACKEND_ECR_URI}:latest"
    
    # Frontend image
    log_info "Building frontend image..."
    docker build -t "${FRONTEND_ECR_URI}:latest" -f frontend/Dockerfile frontend/
    
    log_info "Scanning frontend image for vulnerabilities (Trivy)..."
    trivy image --severity CRITICAL,HIGH "${FRONTEND_ECR_URI}:latest" || log_warn "Trivy scan found issues (non-blocking)"
    
    log_info "Pushing frontend image..."
    docker push "${FRONTEND_ECR_URI}:latest"
    
    log_success "Docker images built and pushed"
}

# Deploy Helm chart
deploy_helm_chart() {
    log_info "=== Helm Stage: Deploying Application via Helm ==="
    
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    local terraform_dir="${PROJECT_ROOT}/infra/terraform"
    BACKEND_ECR_URI=$(cd "${terraform_dir}" && terraform output -raw ecr_backend_repository_url 2>/dev/null || echo "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-backend")
    FRONTEND_ECR_URI=$(cd "${terraform_dir}" && terraform output -raw ecr_frontend_repository_url 2>/dev/null || echo "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-frontend")
    local db_host=""
    local db_port="5432"
    local redis_host=""
    local reports_bucket=""
    local backend_role_arn=""

    if [ -z "$DB_PASSWORD" ]; then
        log_error "DB_PASSWORD is required for Helm deployment so the backend can connect to RDS"
        log_info "Usage: --db-password <password>"
        exit 1
    fi

    if [ -z "$SECRET_KEY" ]; then
        log_error "SECRET_KEY is required for the Django backend in production"
        log_info "Usage: --secret-key <strong-random-secret>"
        exit 1
    fi

    if [ -d "$terraform_dir" ]; then
        db_host=$(cd "$terraform_dir" && terraform output -raw rds_endpoint 2>/dev/null || true)
        db_port=$(cd "$terraform_dir" && terraform output -raw rds_port 2>/dev/null || echo "5432")
        redis_host=$(cd "$terraform_dir" && terraform output -raw redis_endpoint 2>/dev/null || true)
        reports_bucket=$(cd "$terraform_dir" && terraform output -raw reports_s3_bucket 2>/dev/null || true)
        backend_role_arn=$(cd "$terraform_dir" && terraform output -raw backend_service_account_role_arn 2>/dev/null || true)
    fi
    
    # Update kubeconfig
    log_info "Configuring kubectl for EKS cluster: ${CLUSTER_NAME}..."
    aws eks update-kubeconfig \
        --region ${AWS_REGION} \
        --name ${CLUSTER_NAME}
    
    # Verify cluster access
    log_info "Verifying EKS cluster access..."
    kubectl get nodes
    
    # Deploy Helm chart
    log_info "Deploying Helm chart..."
    helm upgrade --install interview-platform "${PROJECT_ROOT}/deploy/helm/interview-platform" \
        --namespace production --create-namespace \
        --set backend.image="${BACKEND_ECR_URI}:latest" \
        --set frontend.image="${FRONTEND_ECR_URI}:latest" \
        --set backend.serviceAccountRoleArn="${backend_role_arn}" \
        --set-string backend.env.SECRET_KEY="${SECRET_KEY}" \
        --set-string backend.env.DB_NAME="interview_platform" \
        --set-string backend.env.DB_USER="interview_admin" \
        --set-string backend.env.DB_PASSWORD="${DB_PASSWORD}" \
        --set-string backend.env.DB_HOST="${db_host}" \
        --set-string backend.env.DB_PORT="${db_port}" \
        --set-string backend.env.REDIS_HOST="${redis_host}" \
        --set-string backend.env.AWS_STORAGE_BUCKET_NAME="${reports_bucket}" \
        --set-string backend.env.AWS_S3_REGION_NAME="${AWS_REGION}" \
        --set replicaCount=3
    
    # Wait for deployment to be ready
    log_info "Waiting for deployment to be ready (this may take a few minutes)..."
    kubectl rollout status deployment/interview-platform-backend -n production --timeout=5m
    kubectl rollout status deployment/interview-platform-frontend -n production --timeout=5m
    
    log_success "Helm chart deployed"
    
    # Display service info
    log_info "Getting service details..."
    kubectl get svc -n production
    
    local frontend_service=$(kubectl get svc -n production interview-platform-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
    log_info "Frontend service: ${frontend_service}"
}

# Install monitoring stack
install_monitoring() {
    if [ "$CREATE_MONITORING" != "true" ]; then
        log_info "Skipping monitoring installation (use --create-monitoring to enable)"
        return
    fi
    
    log_info "=== Installing Monitoring Stack ==="
    
    log_info "Adding Helm repositories..."
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add fluent https://fluent.github.io/helm-charts
    helm repo update
    
    log_info "Installing Prometheus and Grafana..."
    helm upgrade --install prometheus-stack prometheus-community/kube-prometheus-stack \
        --namespace monitoring --create-namespace
    
    log_info "Installing Fluent Bit..."
    helm upgrade --install fluent-bit fluent/fluent-bit \
        --namespace monitoring
    
    log_success "Monitoring stack installed"
    log_info "Access Grafana with: kubectl port-forward -n monitoring svc/prometheus-stack-grafana 3000:80"
    log_info "Grafana credentials: admin / prom-operator"
}

# Main orchestration
main() {
    log_info "=== Interview Platform AWS Deployment ==="
    log_info "Stage: ${STAGE}"
    log_info "AWS Region: ${AWS_REGION}"
    log_info "EKS Cluster: ${CLUSTER_NAME}"
    
    parse_args "$@"
    
    check_prerequisites
    
    case "${STAGE}" in
        bootstrap)
            bootstrap_terraform_state
            ;;
        destroy)
            destroy_infrastructure
            ;;
        infra)
            provision_infrastructure
            ;;
        docker)
            build_and_push_images
            ;;
        helm)
            deploy_helm_chart
            install_monitoring
            ;;
        all)
            log_warn "Running all stages in sequence..."
            bootstrap_terraform_state
            provision_infrastructure
            build_and_push_images
            deploy_helm_chart
            install_monitoring
            ;;
        rebuild)
            log_warn "Rebuilding from scratch: bootstrap, destroy, infra, docker, helm..."
            bootstrap_terraform_state
            destroy_infrastructure
            provision_infrastructure
            build_and_push_images
            deploy_helm_chart
            install_monitoring
            ;;
        *)
            log_error "Unknown stage: ${STAGE}"
            exit 1
            ;;
    esac
    
    log_success "Deployment stage '${STAGE}' completed"
}

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
