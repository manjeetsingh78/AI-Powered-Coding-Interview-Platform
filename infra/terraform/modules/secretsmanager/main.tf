resource "aws_secretsmanager_secret" "this" {
  count = var.create ? 1 : 0
  name = var.name
  description = "Secret for ${var.name}"
  tags = { ManagedBy = "terraform" }
}

resource "aws_secretsmanager_secret_version" "this" {
  count = var.create ? 1 : 0
  secret_id     = aws_secretsmanager_secret.this[0].id
  secret_string = var.secret_string
}
