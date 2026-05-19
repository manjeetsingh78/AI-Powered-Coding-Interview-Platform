output "log_group_name" {
  value = aws_cloudwatch_log_group.this[0].name
}
