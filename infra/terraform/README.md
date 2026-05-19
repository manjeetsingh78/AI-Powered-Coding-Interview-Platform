Terraform skeleton for provisioning AWS resources used by the platform.

Usage (example):

1. Install Terraform >= 1.5
2. Configure AWS credentials in environment variables or shared credentials file:

   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - optionally `AWS_SESSION_TOKEN`

3. Initialize and apply:

```
cd infra/terraform
terraform init
terraform plan -out plan.tfplan
terraform apply plan.tfplan
```

Notes:
- The provider uses `var.aws_region` (defaults to `us-east-1`).
- This skeleton creates ECR repositories for backend/frontend; uncomment and configure the EKS module to create an EKS cluster.
- Do NOT commit Terraform state files (`*.tfstate`) to git. Add them to `.gitignore`.
