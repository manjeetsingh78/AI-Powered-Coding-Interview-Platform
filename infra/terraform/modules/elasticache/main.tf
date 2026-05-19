resource "aws_elasticache_subnet_group" "this" {
  count = var.create ? 1 : 0
  name = var.subnet_group_name
  subnet_ids = var.subnet_ids
}

resource "aws_elasticache_replication_group" "this" {
  count = var.create ? 1 : 0
  replication_group_id          = var.replication_group_id
  replication_group_description = "Redis for Interview Platform"
  node_type                     = var.node_type
  number_cache_clusters         = var.num_cache_clusters
  subnet_group_name             = var.subnet_group_name
  security_group_ids            = var.security_group_ids
  automatic_failover_enabled    = true
}
