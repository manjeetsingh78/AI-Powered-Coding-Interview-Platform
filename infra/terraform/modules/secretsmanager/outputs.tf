output "secret_arn" {
  value = aws_secretsmanager_secret.this[0].arn
}

output "secret_id" {
  value = aws_secretsmanager_secret.this[0].id
}
