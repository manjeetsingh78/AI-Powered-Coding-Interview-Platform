resource "aws_kms_key" "this" {
  count = var.create ? 1 : 0
  description = "KMS key for Interview Platform"
  deletion_window_in_days = 30
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Sid = "Enable IAM User Permissions",
      Effect = "Allow",
      Principal = { AWS = "*" },
      Action = "kms:*",
      Resource = "*"
    }]
  })
}

resource "aws_kms_alias" "this" {
  count = var.create ? 1 : 0
  name = var.alias_name
  target_key_id = aws_kms_key.this[0].key_id
}
