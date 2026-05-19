output "primary_endpoint_address" {
  value = aws_elasticache_replication_group.this[0].primary_endpoint_address
  description = "ElastiCache primary endpoint"
}
