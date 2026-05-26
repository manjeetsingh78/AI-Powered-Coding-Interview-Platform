# Quick Start: Deploy to AWS in 5 Steps

This guide provides copy-paste commands to deploy the platform to AWS EKS in under 30 minutes.

## Prerequisites

Ensure you have:
- AWS Account with admin permissions
- `aws-cli`, `terraform`, `kubectl`, `helm`, `docker` installed
- GitHub repository with Secrets configured

## Step 1: Set Environment Variables

```bash
# Set your AWS credentials
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="ap-south-1"
export AWS_ACCOUNT_ID="123456789012"  # Your 12-digit account ID

# Deployment configuration
export CLUSTER_NAME="interview-platform-eks"
export DB_PASSWORD="ChooseASecurePassword123!"  # Change this!
export DB_USERNAME="interview_admin"
```

Get your AWS Account ID:
```bash
aws sts get-caller-identity --query Account --output text
```

## Step 2: Bootstrap Terraform State (One-time)

```bash
cd infra/terraform

# Initialize Terraform (local state)
terraform init -backend=false

# Create S3 bucket and DynamoDB table for state
terraform apply -auto-approve \
  -var="backend_bucket=interview-platform-tfstate-${AWS_ACCOUNT_ID}" \
  -var="dynamodb_table=interview-platform-tfstate-locks" \
  -target=aws_s3_bucket.tfstate \
  -target=aws_dynamodb_table.tf_locks

# Note the S3 bucket name and DynamoDB table name
echo "Update backend.tf with these values"
```

### Enable Remote State Backend

Edit `infra/terraform/backend.tf`:

```hcl
backend "s3" {
  bucket         = "interview-platform-tfstate-123456789012"
  key            = "infra/terraform.tfstate"
  region         = "ap-south-1"
  dynamodb_table = "interview-platform-tfstate-locks"
  encrypt        = true
}
```

Reinitialize:
```bash
terraform init
# Answer "yes" when prompted to migrate state
```

## Step 3: Provision Infrastructure

```bash
# Create terraform.tfvars
cat > terraform.tfvars <<EOF
aws_region                = "${AWS_REGION}"
cluster_name              = "${CLUSTER_NAME}"
vpc_cidr                  = "10.0.0.0/16"
ecr_backend_repo          = "interview-platform-backend"
ecr_frontend_repo         = "interview-platform-frontend"
db_username               = "${DB_USERNAME}"
db_password               = "${DB_PASSWORD}"
db_name                   = "interview_platform"
create_rds                = true
create_elasticache        = true
create_s3                 = true
create_kms                = true
EOF

# Plan and apply
terraform plan -var-file=terraform.tfvars
terraform apply -auto-approve -var-file=terraform.tfvars

# Save outputs
terraform output -json > outputs.json

# Get key outputs
echo "EKS Cluster: $(terraform output -raw eks_cluster_id)"
echo "RDS Endpoint: $(terraform output -raw rds_endpoint 2>/dev/null || echo 'Not available')"
```

## Step 4: Build & Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build and push backend
docker build -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-backend:latest \
  -f backend/Dockerfile backend/
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-backend:latest

# Build and push frontend
docker build -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-frontend:latest \
  -f frontend/Dockerfile frontend/
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-frontend:latest

echo "Docker images pushed to ECR"
```

## Step 5: Deploy with Helm

```bash
# Configure kubectl
aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}

# Verify cluster access
kubectl get nodes

# Deploy Helm chart
helm upgrade --install interview-platform deploy/helm/interview-platform \
  --namespace production --create-namespace \
  --set backend.image=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-backend:latest \
  --set frontend.image=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/interview-platform-frontend:latest \
  --set replicaCount=3

# Wait for deployment
kubectl wait --for=condition=available --timeout=300s deployment/interview-platform-backend -n production
kubectl wait --for=condition=available --timeout=300s deployment/interview-platform-frontend -n production

# Get frontend URL
kubectl get svc -n production interview-platform-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

## Optional: Enable Observability (Monitoring)

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

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-stack-grafana 3000:80 &
echo "Grafana available at http://localhost:3000 (admin / prom-operator)"
```

## Verify Deployment

```bash
# Check pods
kubectl get pods -n production
kubectl get pods -n monitoring  # If monitoring installed

# Check services
kubectl get svc -n production

# Get frontend URL
export FRONTEND_URL=$(kubectl get svc -n production interview-platform-frontend \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Frontend URL: http://${FRONTEND_URL}"

# Run smoke tests
bash scripts/jenkins/smoke_test.sh "http://${FRONTEND_URL}"
```

## Configure GitHub Secrets for CI/CD

In your GitHub repository, go to Settings → Secrets and variables → Actions, and add:

```bash
# Click "New repository secret" and add these:
AWS_ACCESS_KEY_ID               = (your-access-key)
AWS_SECRET_ACCESS_KEY           = (your-secret-key)
AWS_REGION                      = ap-south-1
AWS_ACCOUNT_ID                  = 123456789012
ECR_BACKEND_REPO                = interview-platform-backend
ECR_FRONTEND_REPO               = interview-platform-frontend
EKS_CLUSTER_NAME                = interview-platform-eks
DB_PASSWORD                     = ChooseASecurePassword123!
CANARY_URL                      = http://FRONTEND_URL_FROM_ABOVE
INSTALL_MONITORING              = true
```

Once secrets are set, push to main to trigger automated deployment:

```bash
git add -A
git commit -m "Deploy to AWS EKS"
git push origin main
```

## Troubleshooting

### Check deployment logs
```bash
kubectl logs -n production deployment/interview-platform-backend -f
kubectl logs -n production deployment/interview-platform-frontend -f
```

### Check pod status
```bash
kubectl describe pod -n production -l app=backend
```

### Check RDS connectivity
```bash
kubectl run -it --rm debug --image=postgres:15 --restart=Never -n production -- \
  psql -h <RDS_ENDPOINT> -U interview_admin -d interview_platform
```

### View Terraform state
```bash
cd infra/terraform
terraform state list
terraform state show aws_eks_cluster.eks_cluster
```

### Cleanup (Destroy Everything)

⚠️ **WARNING**: This will delete all AWS resources!

```bash
cd infra/terraform
terraform destroy -auto-approve -var-file=terraform.tfvars

# Also delete the Helm releases
kubectl delete namespace production monitoring
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `Error: error authenticating to ECR` | Run `aws ecr get-login-password...` again |
| `kubectl: command not found` | Install kubectl: `aws eks update-kubeconfig --region ap-south-1 --name interview-platform-eks` |
| `Pods stuck in Pending` | Check node availability: `kubectl get nodes` |
| `CrashLoopBackOff` | Check logs: `kubectl logs <pod> -n production` |
| `LoadBalancer has no IP` | Wait 2-3 minutes for ALB provisioning, then run `kubectl get svc -n production` again |
| `Secret not found in Secrets Manager` | Verify pod IRSA role has Secrets Manager read permissions |

## What's Next?

✅ **Deployment complete!** Now:

1. **Add a custom domain**: Point your domain to the ALB
2. **Enable HTTPS**: Use AWS Certificate Manager (ACM) + ALB listeners
3. **Scale up**: Increase `replicaCount` in Helm values for load testing
4. **Set up alarms**: Configure CloudWatch alarms for business metrics
5. **Test failover**: Simulate pod/node failures to test recovery
6. **Review logs**: Check CloudWatch and Prometheus for insights
7. **Plan backups**: Test RDS restore procedures

## Get Help

- Check logs: `kubectl logs ... -n production -f`
- Describe resources: `kubectl describe pod ... -n production`
- Terraform outputs: `terraform output -json | jq`
- AWS Console: https://console.aws.amazon.com/
- Runbook: See `DEPLOYMENT_RUNBOOK.md`

---

**Total time**: ~30 minutes (including build/push time)
**Cost per month**: ~$500-1000 (varies by usage and region)
**Status**: Ready for staging/production ✅
