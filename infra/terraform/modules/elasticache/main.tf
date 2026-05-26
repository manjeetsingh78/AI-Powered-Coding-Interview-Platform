resource "aws_elasticache_subnet_group" "this" {
  count      = var.create ? 1 : 0
  name       = var.subnet_group_name
  subnet_ids = var.subnet_ids
}

resource "aws_elasticache_cluster" "this" {
  count                = var.create ? 1 : 0
  cluster_id           = var.replication_group_id
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.node_type
  num_cache_nodes      = var.num_cache_clusters
  parameter_group_name = "default.redis7"
  subnet_group_name    = var.subnet_group_name
  security_group_ids   = var.security_group_ids

  depends_on = [aws_elasticache_subnet_group.this]
}
