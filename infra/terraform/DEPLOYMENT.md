Terraform deployment checklist

Preconditions:
- Set AWS credentials in your environment (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, optional `AWS_SESSION_TOKEN`).
- Create an S3 bucket and DynamoDB table for Terraform remote state, or use local state for tests.

Steps:

1. Initialize Terraform

```bash
cd infra/terraform
terraform init
```

2. (Optional) If using remote backend, configure `backend.tf` with your bucket and DynamoDB name, then re-run `terraform init`.

3. Plan

```bash
terraform plan -var-file=terraform.tfvars -out plan.tfplan
```

4. Apply

```bash
terraform apply plan.tfplan
```

5. After apply, get outputs (ECR repository URLs) and update your CI/CD with the repository URLs or image push script arguments.

Notes:
- Terraform will create ECR repos automatically per `main.tf`.
- EKS cluster creation is optional and can take 15-30 minutes.
