IRSA (IAM Roles for Service Accounts) scaffold

This module shows how to enable the EKS OIDC provider and create an IAM role bound to a Kubernetes ServiceAccount.

High level steps:
1. Ensure `module.eks` creates outputs for `cluster_oidc_issuer` or configure the OIDC provider separately.
2. Create an `aws_iam_openid_connect_provider` pointing at the EKS OIDC issuer.
3. Create `aws_iam_role` with an `aws_iam_policy` granting access to Secrets Manager / S3 as needed.
4. Annotate your Kubernetes ServiceAccount (via Helm values or manifest) with `eks.amazonaws.com/role-arn`.

Example (conceptual):

```hcl
data "aws_eks_cluster" "cluster" {
  name = module.eks.cluster_id
}

resource "aws_iam_openid_connect_provider" "eks" {
  url = data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = ["REPLACE_WITH_THUMBPRINT"]
}

resource "aws_iam_role" "sa_role" {
  name = "example-sa-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Federated = aws_iam_openid_connect_provider.eks.arn },
      Action = "sts:AssumeRoleWithWebIdentity",
      Condition = {
        StringEquals = {
          "${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:default:my-service-account"
        }
      }
    }]
  })
}
```

Use this scaffold to create fine-grained IAM roles for pods that need access to Secrets Manager, S3, or other AWS services.
