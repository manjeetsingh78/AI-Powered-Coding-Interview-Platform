Deployment checklist for the full platform

1) Build & push images to ECR

```bash
# Example (replace with your values)
./scripts/jenkins/build_and_push.sh us-east-1 123456789012 my-backend-repo my-frontend-repo latest
```

2) Provision infra (ECR already created by script if you pushed). If you want EKS, run Terraform:

```bash
cd infra/terraform
terraform init
terraform apply -var-file=terraform.tfvars -auto-approve
```

Remote state bootstrap
- Create an S3 bucket and DynamoDB table for remote state and locking. See `infra/terraform/bootstrap_backend.tf` for a bootstrap example.
- Uncomment and configure the backend block in `infra/terraform/backend.tf` and re-run `terraform init`.

IRSA & IAM policies
- After provisioning EKS, ensure the OIDC provider exists (the `infra/terraform` plan creates an OIDC provider). Replace `REPLACE_WITH_THUMBPRINT` with the cluster's OIDC thumbprint.
- The repo includes `infra/terraform/modules/iam` with recommended policies (`secrets-read`, `s3-read`). Adjust policy scope and attach only necessary resources.
- Update `infra/terraform/main.tf` to set `service_account_name` in the `irsa_backend` module (replace `{{REPLACEME}}`).

Observability
- Install Prometheus + Grafana and Fluent Bit using Helm. See `deploy/helm/observability/README.md`.

3) Install Helm chart and dashboards

```bash
chmod +x scripts/deploy/helm_install.sh
./scripts/deploy/helm_install.sh interview-platform
```

4) Verify

- `kubectl get pods -n interview-platform`
- Check Grafana (port-forward or ingress) and Prometheus targets
