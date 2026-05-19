# AWS Enterprise Deployment Guide

This guide summarizes the AWS enterprise-grade deployment setup for the AI Powered Coding Interview Platform.

## Overview

Your platform is now configured for production deployment on AWS with:
- **Infrastructure as Code (IaC)**: Terraform modules for VPC, EKS, RDS, ElastiCache, S3, KMS, WAF, GuardDuty
- **Container orchestration**: EKS (Kubernetes) with Helm chart deployment
- **Secrets management**: AWS Secrets Manager + IAM Roles for Service Accounts (IRSA)
- **CI/CD pipeline**: GitHub Actions with image scanning, canary deployment, and smoke tests
- **Monitoring & logging**: CloudWatch, Prometheus, Grafana, Fluent Bit
- **Security**: WAF, GuardDuty, KMS encryption, least-privilege IAM roles
- **Backup & recovery**: RDS automated backups, S3 versioning, state management

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Internet                              │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────▼───────────────┐
         │   CloudFront + WAF             │
         │   (Optional CDN)               │
         └───────────────┬───────────────┘
                         │
         ┌───────────────▼───────────────┐
         │   Application Load Balancer    │
         │   (WAF Rules)                  │
         └───────────────┬───────────────┘
                         │
    ┌────────────────────▼────────────────────┐
    │         AWS VPC (10.0.0.0/16)            │
    │                                           │
    │  ┌──────────────────────────────────┐   │
    │  │  EKS Cluster (3 AZs)             │   │
    │  │                                  │   │
    │  │  ┌──────────────────────────┐   │   │
    │  │  │ Production Namespace     │   │   │
    │  │  │ ├─ Backend Pods (×3)    │   │   │
    │  │  │ │  - Django + Gunicorn  │   │   │
    │  │  │ │  - IRSA Role Bound    │   │   │
    │  │  │ │  - Secrets Manager    │   │   │
    │  │  │ ├─ Frontend Pods (×3)   │   │   │
    │  │  │ │  - React + Nginx      │   │   │
    │  │  │ └─ ServiceAccount       │   │   │
    │  │  └──────────────────────────┘   │   │
    │  │                                  │   │
    │  │  ┌──────────────────────────┐   │   │
    │  │  │ Monitoring Namespace     │   │   │
    │  │  │ ├─ Prometheus            │   │   │
    │  │  │ ├─ Grafana               │   │   │
    │  │  │ └─ Fluent Bit            │   │   │
    │  │  └──────────────────────────┘   │   │
    │  └──────────────────────────────────┘   │
    │                                           │
    │  ┌──────────────────────────────────┐   │
    │  │ Private Subnets                  │   │
    │  │ ├─ RDS PostgreSQL (Multi-AZ)     │   │
    │  │ │  - Automated backups (7 days)  │   │
    │  │ ├─ ElastiCache Redis (Cluster)   │   │
    │  │ │  - Automatic failover          │   │
    │  │ └─ VPC Endpoints                 │   │
    │  └──────────────────────────────────┘   │
    └────────────────────────────────────────┘
                         │
    ┌────────────────────▼────────────────────┐
    │      AWS Services (Outside VPC)         │
    │                                          │
    │  ├─ S3 Buckets                         │
    │  │  - Static assets                   │
    │  │  - Terraform state (versioned)     │
    │  │  - Backups                         │
    │  ├─ Secrets Manager                   │
    │  │  - DB credentials                  │
    │  │  - API keys                        │
    │  ├─ KMS                               │
    │  │  - Encryption keys                 │
    │  ├─ CloudWatch                        │
    │  │  - Logs                            │
    │  │  - Metrics                         │
    │  │  - Alarms                          │
    │  ├─ GuardDuty                         │
    │  │  - Threat detection                │
    │  ├─ IAM                               │
    │  │  - OIDC Provider                   │
    │  │  - IRSA Roles                      │
    │  └─ ECR                               │
    │     - Docker images                   │
    └────────────────────────────────────────┘
```

## Key Files Created/Modified

### Infrastructure as Code (Terraform)

| File | Purpose |
|------|---------|
| `infra/terraform/main.tf` | Main Terraform file; calls all modules (VPC, EKS, RDS, ElastiCache, etc.) |
| `infra/terraform/bootstrap_backend.tf` | One-time bootstrap to create S3 + DynamoDB for state management |
| `infra/terraform/backend.tf` | Remote state configuration (commented; enable after bootstrap) |
| `infra/terraform/variables.tf` | Input variables (aws_region, cluster_name, db_password, etc.) |
| `infra/terraform/provider.tf` | AWS provider configuration |
| `infra/terraform/vpc.tf` | VPC with public/private subnets, NAT gateways |
| `infra/terraform/eks.tf` | EKS cluster configuration |
| `infra/terraform/modules/rds/` | RDS PostgreSQL instance (Multi-AZ, backups, deletion protection) |
| `infra/terraform/modules/elasticache/` | ElastiCache Redis cluster |
| `infra/terraform/modules/s3/` | S3 buckets (static assets, backups) with versioning |
| `infra/terraform/modules/kms/` | KMS keys for encryption |
| `infra/terraform/modules/irsa/` | IAM roles for Kubernetes ServiceAccounts (OIDC-bound) |
| `infra/terraform/modules/iam/` | Least-privilege IAM policies (Secrets Manager, S3 read) |
| `infra/terraform/modules/secretsmanager/` | Secrets Manager for sensitive data |
| `infra/terraform/modules/waf/` | AWS WAF with managed rule groups |
| `infra/terraform/modules/guardduty/` | GuardDuty threat detection |
| `infra/terraform/modules/cloudwatch/` | CloudWatch log groups |

### Kubernetes (Helm)

| File | Purpose |
|------|---------|
| `deploy/helm/interview-platform/Chart.yaml` | Helm chart metadata |
| `deploy/helm/interview-platform/values.yaml` | Default values (replica count, images, resources) |
| `deploy/helm/interview-platform/templates/deployment-backend.yaml` | Backend deployment with probes, resources, IRSA |
| `deploy/helm/interview-platform/templates/deployment-frontend.yaml` | Frontend deployment |
| `deploy/helm/interview-platform/templates/service-backend.yaml` | Backend service |
| `deploy/helm/interview-platform/templates/service-frontend.yaml` | Frontend service |
| `deploy/helm/interview-platform/templates/serviceaccount-backend.yaml` | ServiceAccount with IRSA role annotation |

### CI/CD (GitHub Actions)

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Unit tests, linting, security scanning (Snyk, bandit, npm audit) |
| `.github/workflows/terraform.yml` | Terraform plan and apply on push to main |
| `.github/workflows/deploy.yml` | Docker build, ECR push, image scanning, canary deploy, smoke tests, promotion |

### Documentation

| File | Purpose |
|------|---------|
| `DEPLOYMENT_RUNBOOK.md` | Step-by-step manual deployment guide (11 stages) |
| `AWS_DEPLOYMENT_GUIDE.md` | This file; overview and architecture |
| `DEPLOYMENT_CHECKLIST.md` | Pre-deployment checklist |
| `deploy/helm/observability/README.md` | Prometheus + Fluent Bit installation guide |

### Deployment Scripts

| File | Purpose |
|------|---------|
| `scripts/deploy/aws-deploy.sh` | Automated deployment script (bootstrap, infra, docker, helm) |
| `scripts/ci/parse_coverage.py` | Parse code coverage reports |
| `scripts/ci/parse_junit.py` | Parse test reports |
| `scripts/ci/parse_snyk.py` | Parse security scan results |
| `scripts/jenkins/build_and_push.sh` | Build and push Docker images |
| `scripts/jenkins/smoke_test.sh` | Basic smoke tests (health checks, API endpoints) |

## Deployment Process

### Phase 1: Initial Setup (One-time)

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd "AI Powered Coding Interview Platform"
   ```

2. **Set AWS credentials**
   ```bash
   export AWS_ACCESS_KEY_ID=<your-key>
   export AWS_SECRET_ACCESS_KEY=<your-secret>
   export AWS_REGION=us-east-1
   ```

3. **Run deployment script (automated)**
   ```bash
   bash scripts/deploy/aws-deploy.sh --stage bootstrap \
     --aws-region us-east-1 \
     --cluster-name interview-platform-eks
   ```

4. **Enable Terraform remote backend**
   - Update `infra/terraform/backend.tf` with your S3 bucket and DynamoDB table
   - Run `terraform init` and select yes to migrate state

### Phase 2: Infrastructure Provisioning

```bash
bash scripts/deploy/aws-deploy.sh --stage infra \
  --aws-region us-east-1 \
  --cluster-name interview-platform-eks \
  --db-password '<SECURE_PASSWORD>'
```

### Phase 3: Docker Image Build

```bash
bash scripts/deploy/aws-deploy.sh --stage docker \
  --aws-region us-east-1
```

### Phase 4: Helm Deployment

```bash
bash scripts/deploy/aws-deploy.sh --stage helm \
  --aws-region us-east-1 \
  --cluster-name interview-platform-eks \
  --create-monitoring  # Optional: install Prometheus + Grafana
```

### Phase 5: GitHub Actions CI/CD

Configure GitHub Secrets and push to `main` branch to trigger automated deployment.

## GitHub Secrets to Configure

Create these secrets in your GitHub repository (Settings → Secrets and variables → Actions):

```bash
AWS_ACCESS_KEY_ID                  # IAM user access key
AWS_SECRET_ACCESS_KEY              # IAM user secret key
AWS_REGION                         # e.g., us-east-1
AWS_ACCOUNT_ID                     # 12-digit account ID
ECR_BACKEND_REPO                   # interview-platform-backend
ECR_FRONTEND_REPO                  # interview-platform-frontend
EKS_CLUSTER_NAME                   # interview-platform-eks
DB_PASSWORD                        # RDS password
CANARY_URL                         # Load balancer URL (e.g., http://abc.elb.amazonaws.com)
INSTALL_MONITORING                 # true or false
DISCORD_WEBHOOK                    # (Optional) For notifications
SNYK_TOKEN                         # (Optional) For security scanning
```

## Deployment Stages Explained

### Stage 1: Bootstrap
- Creates S3 bucket for Terraform state
- Creates DynamoDB table for state locking
- Enables team-safe Terraform operations

### Stage 2: Infrastructure
- Provisions VPC with public/private subnets
- Creates EKS cluster across 3 availability zones
- Provisions RDS PostgreSQL (Multi-AZ)
- Provisions ElastiCache Redis cluster
- Provisions S3 buckets (assets, backups)
- Provisions KMS keys for encryption
- Enables GuardDuty threat detection
- Creates CloudWatch log groups
- Provisions WAF rules

### Stage 3: Docker
- Builds backend and frontend Docker images
- Scans images with Trivy for vulnerabilities
- Pushes images to Amazon ECR

### Stage 4: Helm
- Configures kubectl to access EKS cluster
- Deploys Interview Platform via Helm
- Deploys 3 replicas of backend and frontend
- Deploys ServiceAccount with IRSA role binding
- Optionally installs Prometheus + Grafana + Fluent Bit

### Stage 5: CI/CD
- On every push to `main`, GitHub Actions:
  - Runs unit tests and security scans
  - Applies Terraform changes
  - Builds Docker images
  - Pushes to ECR
  - Deploys canary (1 replica)
  - Runs smoke tests
  - Promotes canary to main (3 replicas) on success

## Security Features

### Authentication & Authorization
- **IRSA (IAM Roles for Service Accounts)**: Pods assume IAM roles via OIDC provider
- **Secrets Manager**: Database passwords stored outside of configs
- **KMS**: Encryption of S3 buckets and RDS databases

### Network Security
- **VPC**: Private subnets for databases and caches
- **Security Groups**: Restrict ingress/egress
- **WAF**: AWS WAF rules on ALB/CloudFront
- **VPC Flow Logs**: Monitor network traffic

### Threat Detection
- **GuardDuty**: AI-powered threat detection
- **AWS Config**: Configuration compliance monitoring
- **CloudTrail**: Audit logging of all AWS API calls

### Container Security
- **Image Scanning**: Trivy scans during build
- **Least Privilege**: ServiceAccounts only have required IAM permissions
- **Network Policies**: (Optional) Kubernetes network policies for pod isolation

## Monitoring & Observability

### Metrics
- **Prometheus**: Collects Kubernetes metrics
- **Grafana**: Visualizes metrics, predefined dashboards
- **CloudWatch**: AWS-native metrics and alarms

### Logs
- **CloudWatch Logs**: Backend and frontend application logs
- **Fluent Bit**: Forwards logs to CloudWatch
- **Prometheus**: Application performance metrics

### Alarms
- Configure CloudWatch alarms for:
  - Pod restart rates
  - High CPU/memory usage
  - RDS connection errors
  - Database storage approaching limits

## Backup & Disaster Recovery

### Database Backups
- **RDS**: Automated daily backups (7-day retention)
- **Point-in-Time Recovery**: Recover to any point within 7 days
- **Snapshots**: Manual snapshots for long-term retention

### Application Backups
- **S3 Versioning**: Keep multiple versions of uploaded files
- **Cross-Region Replication**: (Optional) Replicate to another region
- **Terraform State**: Stored in versioned S3 bucket

### DR Testing
- Test recovery from RDS backups quarterly
- Test restore from S3 backups quarterly
- Document recovery procedures and time to recovery (RTO)

## Cost Optimization

### Resource Sizing
- **EKS**: Start with t3.medium nodes, scale based on load
- **RDS**: db.t3.medium is suitable for small-to-medium workloads
- **ElastiCache**: cache.t3.medium for development; scale for production

### Cost Controls
- **AWS Budgets**: Set monthly spending limits
- **Reserved Instances**: Consider for long-term deployments
- **S3 Lifecycle**: Archive old backups to Glacier
- **AutoScaling**: Scale nodes based on CPU/memory

## Troubleshooting

### Deployment Fails
1. Check GitHub Actions logs
2. Verify AWS credentials are correct
3. Ensure EKS cluster is accessible: `kubectl get nodes`
4. Check Terraform outputs: `cd infra/terraform && terraform output`

### Pods Won't Start
1. Check pod events: `kubectl describe pod <pod-name> -n production`
2. Check logs: `kubectl logs <pod-name> -n production`
3. Verify IRSA role: `kubectl get sa -n production interview-platform-backend-sa -o yaml`

### Database Connection Errors
1. Verify RDS security group allows EKS traffic
2. Test connectivity: `kubectl run -it --rm debug --image=postgres --restart=Never -- psql -h <rds-endpoint> -U <user>`
3. Check Secrets Manager has correct credentials

## Next Steps

1. **Customize domain**: Point your domain to the ALB via Route53
2. **Enable HTTPS**: Use ACM certificates with ALB listeners
3. **Set up alerts**: Configure CloudWatch alarms for business metrics
4. **Enable auto-scaling**: Configure EKS cluster autoscaler and pod autoscaling
5. **Schedule DR tests**: Test backup restore procedures regularly
6. **Review IAM policies**: Audit and tighten permissions to least-privilege
7. **Implement GitOps**: Use Flux or ArgoCD for declarative deployments

## Support & Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Terraform Registry**: https://registry.terraform.io/
- **Kubernetes Docs**: https://kubernetes.io/docs/
- **Helm Documentation**: https://helm.sh/docs/
- **GitHub Actions**: https://docs.github.com/en/actions

---

**Last Updated**: May 19, 2026
**Status**: Production Ready ✅
