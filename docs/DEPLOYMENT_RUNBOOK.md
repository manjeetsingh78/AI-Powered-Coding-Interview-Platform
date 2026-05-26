# AWS Enterprise Deployment Runbook

This runbook provides step-by-step instructions to deploy the AI Powered Coding Interview Platform on AWS using Terraform and Helm.

## Prerequisites

1. AWS Account with appropriate permissions (IAM, EKS, RDS, ElastiCache, S3, etc.)
2. Tools installed locally:
   - `aws-cli` v2
   - `terraform` v1.5.7+
   - `kubectl` v1.27+
   - `helm` v3+
   - `docker`
3. GitHub repository with Secrets configured (see [GitHub Secrets Configuration](#github-secrets-configuration))

## Deployment Architecture

```
Internet → CloudFront/ALB (WAF enabled)
         ↓
         EKS Cluster (private subnets)
         ├── Backend Pods (Django + Gunicorn) — read DB secrets via IRSA
         ├── Frontend Pods (React + Nginx)
         ├── Prometheus & Grafana (monitoring)
         └── Fluent Bit (logs → CloudWatch)
         ↓
         RDS (PostgreSQL, Multi-AZ, automated backups)
         ElastiCache (Redis, automatic failover)
         S3 (static assets, backups, tfstate)
         Secrets Manager (DB credentials, API keys)
         KMS (encryption keys)
```

## Stage 1: Bootstrap Terraform Remote State (One-time)

This stage creates the S3 bucket and DynamoDB table needed to store and lock Terraform state.

### 1.1 Configure AWS credentials

```bash
export AWS_ACCESS_KEY_ID=<your-access-key>
export AWS_SECRET_ACCESS_KEY=<your-secret-key>
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=<your-12-digit-account-id>
```

### 1.2 Create Terraform state backend

```bash
cd infra/terraform

# Initialize Terraform (local state, no backend yet)
terraform init -backend=false

# Apply only the bootstrap resources to create S3 and DynamoDB
# Choose unique names for your bucket and table
TF_STATE_BUCKET="interview-platform-tfstate-${AWS_ACCOUNT_ID}"
TF_LOCKS_TABLE="interview-platform-tfstate-locks"

terraform apply -auto-approve \
  -var="backend_bucket=${TF_STATE_BUCKET}" \
  -var="dynamodb_table=${TF_LOCKS_TABLE}" \
  -target=aws_s3_bucket.tfstate \
  -target=aws_dynamodb_table.tf_locks \
  -var-file=bootstrap_backend.tf

echo "State bucket: ${TF_STATE_BUCKET}"
echo "Locks table: ${TF_LOCKS_TABLE}"
```

### 1.3 Enable Terraform backend

Update `infra/terraform/backend.tf` with your S3 bucket and DynamoDB table:

```hcl
backend "s3" {
  bucket         = "interview-platform-tfstate-<account-id>"
  key            = "infra/terraform.tfstate"
  region         = "us-east-1"
  dynamodb_table = "interview-platform-tfstate-locks"
  encrypt        = true
}
```

Then reinitialize Terraform:

```bash
terraform init
# When prompted, confirm migration of state to S3
```

## Stage 2: Prepare Configuration Values

Create and populate `infra/terraform/terraform.tfvars`:

```hcl
aws_region                = "us-east-1"
cluster_name              = "interview-platform-eks"
vpc_cidr                  = "10.0.0.0/16"
ecr_backend_repo          = "interview-platform-backend"
ecr_frontend_repo         = "interview-platform-frontend"
db_username               = "interview_admin"
db_password               = "postgres123"  # Use strong password; better: fetch from Secrets Manager
db_name                   = "interview_platform"
create_rds                = true
create_elasticache        = true
create_s3                 = true
create_kms                = true
```

**Security Note:** Store `db_password` in AWS Secrets Manager instead of terraform.tfvars for production.

## Stage 3: Provision AWS Infrastructure

```bash
cd infra/terraform

# Review the planned changes
terraform plan -var-file=terraform.tfvars

# Apply infrastructure (creates VPC, EKS, RDS, ElastiCache, S3, KMS, etc.)
terraform apply -auto-approve -var-file=terraform.tfvars

# Save outputs for later use
terraform output -json > outputs.json
echo "Terraform outputs saved to outputs.json"

# Extract key values
EKS_CLUSTER_NAME=$(jq -r '.eks.value.cluster_id' outputs.json 2>/dev/null || echo "interview-platform-eks")
RDS_ENDPOINT=$(jq -r '.rds.value.endpoint' outputs.json 2>/dev/null || echo "localhost")
REDIS_ENDPOINT=$(jq -r '.elasticache.value.primary_endpoint_address' outputs.json 2>/dev/null || echo "localhost")

echo "EKS Cluster: ${EKS_CLUSTER_NAME}"
echo "RDS Endpoint: ${RDS_ENDPOINT}"
echo "Redis Endpoint: ${REDIS_ENDPOINT}"
```

## Stage 4: Configure OIDC Provider & IRSA

After EKS is provisioned, manually enable OIDC and create the IRSA role.

### 4.1 Get EKS cluster OIDC issuer

```bash
OIDC_ISSUER=$(aws eks describe-cluster --name ${EKS_CLUSTER_NAME} --query 'cluster.identity.oidc.issuer' --output text)
echo "OIDC Issuer: ${OIDC_ISSUER}"

# Extract thumbprint (requires fetching the certificate)
THUMBPRINT=$(echo | openssl s_client -servername oidc.eks.${AWS_REGION}.amazonaws.com -showcerts -connect oidc.eks.${AWS_REGION}.amazonaws.com:443 2>&- | openssl x509 -fingerprint -noout | sed 's/://g' | awk '{print $NF}')
echo "OIDC Thumbprint: ${THUMBPRINT}"
```

### 4.2 Update Terraform with OIDC thumbprint

Edit `infra/terraform/main.tf` and replace `REPLACE_WITH_THUMBPRINT`:

```hcl
resource "aws_iam_openid_connect_provider" "eks" {
  url = data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = ["${THUMBPRINT}"]  # Replace with actual thumbprint
}
```

Then apply:

```bash
terraform apply -auto-approve -var-file=terraform.tfvars
```

### 4.3 Update backend service account name

Edit `infra/terraform/main.tf` and replace `{{REPLACEME}}` with your backend SA name:

```hcl
module "irsa_backend" {
  source = "./modules/irsa"
  create = true
  service_account_name = "interview-platform-backend"  # Change from {{REPLACEME}}
  ...
}
```

Apply again:

```bash
terraform apply -auto-approve -var-file=terraform.tfvars

# Get IRSA role ARN for Helm
IRSA_ROLE_ARN=$(terraform output -raw irsa_backend_role_arn 2>/dev/null || echo "")
echo "IRSA Role ARN: ${IRSA_ROLE_ARN}"
```

## Stage 5: Build & Push Docker Images

```bash
# Configure AWS credentials for ECR login
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Backend image
BACKEND_ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-backend"
docker build -t ${BACKEND_ECR_URI}:latest -f backend/Dockerfile backend/
docker push ${BACKEND_ECR_URI}:latest

# Frontend image
FRONTEND_ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-frontend"
docker build -t ${FRONTEND_ECR_URI}:latest -f frontend/Dockerfile frontend/
docker push ${FRONTEND_ECR_URI}:latest

echo "Backend image: ${BACKEND_ECR_URI}:latest"
echo "Frontend image: ${FRONTEND_ECR_URI}:latest"
```

## Stage 6: Configure kubectl for EKS

```bash
aws eks update-kubeconfig \
  --region ${AWS_REGION} \
  --name ${EKS_CLUSTER_NAME}

# Verify cluster access
kubectl get nodes
```

## Stage 7: Deploy Helm Chart

Create `deploy/helm/interview-platform/values-prod.yaml`:

```yaml
replicaCount: 3

backend:
  image: AWS_ACCOUNT_ID.dkr.ecr.AWS_REGION.amazonaws.com/interview-platform-backend:latest
  port: 8000
  serviceAccountRoleArn: "arn:aws:iam::AWS_ACCOUNT_ID:role/interview-platform-backend-sa-role"
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 2000m
      memory: 2048Mi

frontend:
  image: AWS_ACCOUNT_ID.dkr.ecr.AWS_REGION.amazonaws.com/interview-platform-frontend:latest
  port: 80

service:
  type: LoadBalancer
```

Deploy:

```bash
helm upgrade --install interview-platform deploy/helm/interview-platform \
  --namespace production --create-namespace \
  --values deploy/helm/interview-platform/values-prod.yaml
```

Verify deployment:

```bash
kubectl get pods -n production
kubectl get svc -n production
```

## Stage 8: Install Observability Stack (Optional)

```bash
# Add Helm repos
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add fluent https://fluent.github.io/helm-charts
helm repo update

# Install Prometheus + Grafana
helm upgrade --install prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# Install Fluent Bit for log forwarding
helm upgrade --install fluent-bit fluent/fluent-bit \
  --namespace monitoring

# Port-forward to access Grafana
kubectl port-forward -n monitoring svc/prometheus-stack-grafana 3000:80

# Grafana credentials: admin / prom-operator
echo "Grafana available at http://localhost:3000"
```

## Stage 9: Verify Deployment & Run Smoke Tests

```bash
# Check pod health
kubectl get pods -n production -w

# Check service endpoints
ALB_DNS=$(kubectl get svc -n production interview-platform-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Frontend available at: http://${ALB_DNS}"

# Run smoke tests
CANARY_URL="http://${ALB_DNS}" bash scripts/jenkins/smoke_test.sh
```

## Stage 10: Configure Jenkins Credentials

Add these credentials in Jenkins on the AWS EC2 controller:

| Credential ID | Type | Notes |
|---|---|---|
| `aws-creds` | AWS credentials or IAM role | Must allow ECR, EKS, RDS, ElastiCache, S3, IAM, SSM |
| `snyk-token` | Secret text | Optional SCA scanning |
| `sonarqube-token` | Secret text | Optional SAST scanning |
| `kubeconfig-production` | Secret file | kubeconfig for the target EKS cluster |
| `discord-webhook` | Secret text | Build notifications |

## Stage 11: Create the Jenkins Pipeline Job

Create a Pipeline job in Jenkins and point it at the repository root `Jenkinsfile`.

```groovy
Definition: Pipeline script from SCM
SCM: Git
Repository URL: https://github.com/<your-org>/<your-repo>.git
Branch Specifier: */main
Script Path: Jenkinsfile
Lightweight checkout: Enable
```

Enable the GitHub webhook trigger on the Jenkins job, then push to `main` to run the pipeline.

The Jenkins pipeline will:

1. Run backend and frontend checks.
2. Run SonarQube, Snyk, and Trivy scans when enabled.
3. Build and push backend and frontend Docker images to ECR.
4. Deploy the images to EKS with Helm.
5. Run smoke tests and send notifications.

## Rollback Procedure

If deployment fails:

### Helm rollback

```bash
# List releases
helm history interview-platform -n production

# Rollback to previous release
helm rollback interview-platform <REVISION_NUMBER> -n production
```

### Terraform rollback

```bash
cd infra/terraform

# Review what will be destroyed
terraform plan -destroy -var-file=terraform.tfvars

# Destroy (caution: destroys RDS, ElastiCache, etc.)
terraform destroy -auto-approve -var-file=terraform.tfvars
```

## Troubleshooting

### EKS pod fails to start

```bash
# Check pod events
kubectl describe pod <POD_NAME> -n production

# Check logs
kubectl logs <POD_NAME> -n production

# Check IRSA role is correctly attached
kubectl get sa -n production interview-platform-backend-sa -o yaml
```

### RDS connection issues

```bash
# Check security groups allow communication from EKS
aws ec2 describe-security-groups --query "SecurityGroups[?GroupName=='interview-platform-db-sg']"

# Test connectivity from EKS pod
kubectl run -it --rm debug --image=ubuntu --restart=Never -n production -- \
  apt-get update && apt-get install -y postgresql-client && \
  psql -h <RDS_ENDPOINT> -U interview_admin -d interview_platform
```

### Secrets Manager access denied

```bash
# Verify IRSA role has secrets-read policy
aws iam list-role-policies --role-name interview-platform-backend-sa-role

# Verify service account has correct annotation
kubectl get sa -n production interview-platform-backend-sa -o yaml | grep role-arn
```

## Monitoring & Maintenance

- **Prometheus**: `kubectl port-forward -n monitoring svc/prometheus-stack-prometheus 9090:9090`
- **Grafana**: `kubectl port-forward -n monitoring svc/prometheus-stack-grafana 3000:80`
- **CloudWatch Logs**: Search for `/aws/interview-platform/backend` and `/aws/interview-platform/frontend`
- **AWS GuardDuty**: Check AWS Console for security findings
- **RDS Backups**: Automated daily backups retained for 7 days (configurable)

## Next Steps

1. Configure custom domain via Route53
2. Set up ALB ingress controller for path-based routing
3. Enable WAF on CloudFront/ALB
4. Configure S3 cross-region replication for backups
5. Set up SNS alerts for critical CloudWatch alarms
6. Schedule regular DR drills (RDS point-in-time recovery, restore from S3)

---

For support or questions, refer to:
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest)
- [Helm Charts](https://artifacthub.io/)
