#!/bin/bash
#
# AWS Deployment Automation Script
# This script automates the deployment of the Interview Platform on AWS.
#
# Usage: ./scripts/deploy/aws-deploy.sh [OPTIONS]
#
# Options:
#   --stage STAGE              Deployment stage: bootstrap, infra, docker, helm, all (default: all)
#   --aws-region REGION        AWS region (default: us-east-1)
#   --cluster-name NAME        EKS cluster name (default: interview-platform-eks)
#   --db-password PASSWORD     RDS database password (required for infra stage)
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
AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="${CLUSTER_NAME:-interview-platform-eks}"
DB_PASSWORD="${DB_PASSWORD:-}"
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
    
    for cmd in aws terraform kubectl helm docker jq; do
        if ! command -v $cmd &> /dev/null; then
            missing+=("$cmd")
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing prerequisites: ${missing[*]}"
        log_info "Please install the missing tools and try again."
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
    
    # Initialize Terraform locally
    log_info "Initializing Terraform (local backend)..."
    terraform init -backend=false -upgrade 2>/dev/null || true
    
    # Apply bootstrap resources
    log_info "Creating S3 bucket and DynamoDB table for state..."
    terraform apply -auto-approve \
        -var="backend_bucket=${TF_STATE_BUCKET}" \
        -var="dynamodb_table=${TF_LOCKS_TABLE}" \
        -target=aws_s3_bucket.tfstate \
        -target=aws_dynamodb_table.tf_locks \
        2>/dev/null || true
    
    log_success "Remote state backend created"
    log_warn "Please update infra/terraform/backend.tf with:"
    log_warn "  bucket = \"${TF_STATE_BUCKET}\""
    log_warn "  dynamodb_table = \"${TF_LOCKS_TABLE}\""
    log_warn "Then run: cd infra/terraform && terraform init"
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
    terraform init -upgrade
    
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

# Build and push Docker images
build_and_push_images() {
    log_info "=== Docker Stage: Building and Pushing Images to ECR ==="
    
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    BACKEND_ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-backend"
    FRONTEND_ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-frontend"
    
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
    BACKEND_ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-backend"
    FRONTEND_ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-frontend"
    
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
