variable "create" {
  type    = bool
  default = true
}

variable "name_prefix" {
  type    = string
  default = "interview-platform"
}

resource "aws_iam_policy" "secrets_read" {
  count = var.create ? 1 : 0
  name = "${var.name_prefix}-secrets-read"
  description = "Allow read access to Secrets Manager secrets used by the platform"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ],
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_policy" "s3_read" {
  count = var.create ? 1 : 0
  name = "${var.name_prefix}-s3-read"
  description = "Allow read access to S3 buckets for static assets and config"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = ["s3:GetObject", "s3:ListBucket"],
        Resource = ["arn:aws:s3:::*"]
      }
    ]
  })
}

output "secrets_policy_arn" { value = aws_iam_policy.secrets_read[0].arn }
output "s3_policy_arn" { value = aws_iam_policy.s3_read[0].arn }
