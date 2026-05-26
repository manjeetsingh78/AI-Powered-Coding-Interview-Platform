output "endpoint" {
  value       = try(aws_db_instance.this[0].address, null)
  description = "RDS endpoint address"
  depends_on  = [aws_db_instance.this]
}

output "port" {
  value = try(aws_db_instance.this[0].port, null)
}
