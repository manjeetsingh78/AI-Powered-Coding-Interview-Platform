output "primary_endpoint_address" {
  value       = try(aws_elasticache_cluster.this[0].cache_nodes[0].address, null)
  description = "ElastiCache primary endpoint"
}
