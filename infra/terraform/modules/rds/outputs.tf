output "endpoint" {
  value = aws_db_instance.this[0].address
  description = "RDS endpoint address"
  depends_on = [aws_db_instance.this]
}

output "port" {
  value = aws_db_instance.this[0].port
}
