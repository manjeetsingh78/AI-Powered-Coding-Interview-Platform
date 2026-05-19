variable "create" {
  type    = bool
  default = true
}

variable "service_account_name" {
  type = string
}

variable "namespace" {
  type    = string
  default = "default"
}

variable "role_name" {
  type = string
}

variable "policy_arns" {
  type    = list(string)
  default = []
}

variable "oidc_provider_arn" {
  type = string
}

variable "oidc_provider_url" {
  type = string
}

resource "aws_iam_role" "this" {
  count = var.create ? 1 : 0
  name = var.role_name
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Federated = var.oidc_provider_arn },
      Action = "sts:AssumeRoleWithWebIdentity",
      Condition = {
        StringEquals = {
          "${replace(var.oidc_provider_url, "https://", "")}:sub" = "system:serviceaccount:${var.namespace}:${var.service_account_name}"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "this" {
  count = var.create ? length(var.policy_arns) : 0
  role = aws_iam_role.this[0].name
  policy_arn = var.policy_arns[count.index]
}

output "role_arn" {
  value = aws_iam_role.this[0].arn
}
