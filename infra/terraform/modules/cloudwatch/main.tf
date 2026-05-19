resource "aws_cloudwatch_log_group" "this" {
  count = var.create ? 1 : 0
  name = var.log_group_name
  retention_in_days = var.retention_in_days
  tags = { ManagedBy = "terraform" }
}
