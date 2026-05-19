#!/bin/bash
#
# Pre-Deployment Verification Script
# This script checks that all required files, tools, and configurations are in place
# before attempting to deploy to AWS.
#
# Usage: bash scripts/deploy/verify_deployment_readiness.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0

# Logging functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

check_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo "================================================"
echo "Pre-Deployment Verification"
echo "================================================"
echo

# 1. Check tools
echo "Checking required tools..."
for tool in aws terraform kubectl helm docker jq git; do
    if command -v $tool &> /dev/null; then
        version=$($tool --version 2>/dev/null | head -n1 || echo "")
        check_pass "Tool: $tool ($version)"
    else
        check_fail "Tool: $tool (NOT FOUND)"
    fi
done
echo

# 2. Check AWS credentials
echo "Checking AWS credentials..."
if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    USER=$(aws sts get-caller-identity --query Arn --output text)
    check_pass "AWS credentials configured (Account: $ACCOUNT)"
    check_info "User/Role: $USER"
else
    check_fail "AWS credentials NOT configured"
    check_info "Run: export AWS_ACCESS_KEY_ID=<key> && export AWS_SECRET_ACCESS_KEY=<secret>"
fi
echo

# 3. Check repository structure
echo "Checking repository structure..."
REPO_FILES=(
    "backend/Dockerfile"
    "frontend/Dockerfile"
    "backend/config/settings.py"
    "frontend/src/App.jsx"
    "infra/terraform/main.tf"
    "infra/terraform/variables.tf"
    "infra/terraform/eks.tf"
    "deploy/helm/interview-platform/Chart.yaml"
    ".github/workflows/ci.yml"
    ".github/workflows/terraform.yml"
    ".github/workflows/deploy.yml"
)

for file in "${REPO_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "File: $file"
    else
        check_fail "File: $file (NOT FOUND)"
    fi
done
echo

# 4. Check Terraform modules
echo "Checking Terraform modules..."
TF_MODULES=(
    "infra/terraform/modules/rds"
    "infra/terraform/modules/elasticache"
    "infra/terraform/modules/s3"
    "infra/terraform/modules/kms"
    "infra/terraform/modules/irsa"
    "infra/terraform/modules/secretsmanager"
    "infra/terraform/modules/iam"
    "infra/terraform/modules/waf"
    "infra/terraform/modules/guardduty"
    "infra/terraform/modules/cloudwatch"
)

for module in "${TF_MODULES[@]}"; do
    if [ -d "$module" ]; then
        check_pass "Terraform module: $module"
    else
        check_fail "Terraform module: $module (NOT FOUND)"
    fi
done
echo

# 5. Check Helm chart
echo "Checking Helm chart..."
HELM_FILES=(
    "deploy/helm/interview-platform/Chart.yaml"
    "deploy/helm/interview-platform/values.yaml"
    "deploy/helm/interview-platform/templates/deployment-backend.yaml"
    "deploy/helm/interview-platform/templates/deployment-frontend.yaml"
    "deploy/helm/interview-platform/templates/serviceaccount-backend.yaml"
)

for file in "${HELM_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "Helm file: $file"
    else
        check_fail "Helm file: $file (NOT FOUND)"
    fi
done
echo

# 6. Check documentation
echo "Checking documentation..."
DOCS=(
    "DEPLOYMENT_RUNBOOK.md"
    "AWS_DEPLOYMENT_GUIDE.md"
    "QUICK_START_AWS.md"
    "IMPLEMENTATION_SUMMARY.md"
    "DEPLOYMENT_CHECKLIST.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        check_pass "Documentation: $doc"
    else
        check_fail "Documentation: $doc (NOT FOUND)"
    fi
done
echo

# 7. Check scripts
echo "Checking scripts..."
SCRIPTS=(
    "scripts/deploy/aws-deploy.sh"
    "scripts/deploy/helm_install.sh"
    "scripts/jenkins/build_and_push.sh"
    "scripts/jenkins/smoke_test.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            check_pass "Script: $script (executable)"
        else
            check_warn "Script: $script (not executable) - Run: chmod +x $script"
        fi
    else
        check_fail "Script: $script (NOT FOUND)"
    fi
done
echo

# 8. Check Docker images can build
echo "Checking Docker configuration..."
if [ -f "backend/Dockerfile" ] && [ -f "backend/requirements.txt" ]; then
    check_pass "Backend Docker setup OK"
else
    check_fail "Backend Docker setup INCOMPLETE"
fi

if [ -f "frontend/Dockerfile" ] && [ -f "frontend/package.json" ]; then
    check_pass "Frontend Docker setup OK"
else
    check_fail "Frontend Docker setup INCOMPLETE"
fi
echo

# 9. Check GitHub Actions workflows
echo "Checking GitHub Actions workflows..."
if [ -d ".github/workflows" ]; then
    WORKFLOWS=$(ls .github/workflows/*.yml 2>/dev/null | wc -l)
    if [ "$WORKFLOWS" -ge 3 ]; then
        check_pass "GitHub Actions: $WORKFLOWS workflows found"
    else
        check_fail "GitHub Actions: Expected at least 3 workflows, found $WORKFLOWS"
    fi
else
    check_fail "GitHub Actions: .github/workflows directory not found"
fi
echo

# 10. Check environment setup
echo "Checking environment setup..."
if [ -z "${AWS_REGION:-}" ]; then
    check_warn "Environment: AWS_REGION not set (default: us-east-1)"
else
    check_pass "Environment: AWS_REGION=$AWS_REGION"
fi

if [ -z "${AWS_ACCOUNT_ID:-}" ]; then
    check_warn "Environment: AWS_ACCOUNT_ID not set"
    check_info "Get your account ID: aws sts get-caller-identity --query Account --output text"
else
    check_pass "Environment: AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID"
fi

if [ -z "${CLUSTER_NAME:-}" ]; then
    check_warn "Environment: CLUSTER_NAME not set (default: interview-platform-eks)"
else
    check_pass "Environment: CLUSTER_NAME=$CLUSTER_NAME"
fi
echo

# 11. Check terraform.tfvars (if terraform has been run)
echo "Checking Terraform configuration..."
if [ -f "infra/terraform/terraform.tfvars" ]; then
    check_pass "Terraform: terraform.tfvars exists"
else
    check_warn "Terraform: terraform.tfvars not found (will be created during deployment)"
fi
echo

# 12. Check backend.tf
echo "Checking Terraform backend configuration..."
if grep -q "backend \"s3\"" infra/terraform/backend.tf 2>/dev/null; then
    if grep -q "REPLACE_WITH" infra/terraform/backend.tf 2>/dev/null; then
        check_warn "Terraform backend: Configuration incomplete (REPLACE_WITH values found)"
    else
        check_pass "Terraform backend: Configured"
    fi
else
    check_warn "Terraform backend: Not enabled (commented out - will be enabled after bootstrap)"
fi
echo

# Summary
echo "================================================"
echo "Summary"
echo "================================================"
echo -e "${GREEN}Checks passed: $CHECKS_PASSED${NC}"
echo -e "${RED}Checks failed: $CHECKS_FAILED${NC}"
echo

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready for deployment.${NC}"
    echo
    echo "Next steps:"
    echo "1. Set environment variables:"
    echo "   export AWS_REGION=us-east-1"
    echo "   export AWS_ACCOUNT_ID=\$(aws sts get-caller-identity --query Account --output text)"
    echo "   export CLUSTER_NAME=interview-platform-eks"
    echo "   export DB_PASSWORD=<secure-password>"
    echo
    echo "2. Run deployment:"
    echo "   bash scripts/deploy/aws-deploy.sh --stage bootstrap"
    echo
    echo "3. See QUICK_START_AWS.md for complete deployment guide"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the errors above.${NC}"
    echo
    echo "Resolution steps:"
    echo "1. Ensure all required tools are installed"
    echo "2. Check repository structure matches expected layout"
    echo "3. Verify AWS credentials are configured"
    echo "4. See DEPLOYMENT_CHECKLIST.md for pre-deployment requirements"
    exit 1
fi
