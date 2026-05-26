resource "aws_ecr_repository" "backend" {
  name = var.ecr_backend_repo
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = {
    ManagedBy = "terraform"
  }
}

resource "aws_ecr_repository" "frontend" {
  name = var.ecr_frontend_repo
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = {
    ManagedBy = "terraform"
  }
}

resource "random_password" "db_generated" {
  count            = var.db_password == "" ? 1 : 0
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_id" "secret_suffix" {
  byte_length = 4
}

locals {
  db_password = var.db_password != "" ? var.db_password : random_password.db_generated[0].result
}

module "kms" {
  source     = "./modules/kms"
  create     = var.create_kms
  alias_name = "alias/interview-platform"
}

module "s3_assets" {
  source            = "./modules/s3"
  create            = var.create_s3
  bucket_name       = "${var.cluster_name}-assets"
  enable_versioning = true
  lifecycle_rules   = []
}

module "rds" {
  source      = "./modules/rds"
  create      = var.create_rds
  db_name     = var.db_name
  db_username = var.db_username
  # Prefer passing DB password via Secrets Manager; if provided, it's used directly.
  db_password             = local.db_password
  db_instance_class       = var.rds_instance_class
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnets
  security_group_ids      = var.create_rds ? [aws_security_group.rds[0].id] : []
  backup_retention_period = 1
  deletion_protection     = false
  skip_final_snapshot     = true
  db_engine_version       = "15"
}

# Create a Secrets Manager secret for DB password if db_password is not provided.
module "db_secret" {
  source        = "./modules/secretsmanager"
  create        = true
  name          = "${var.cluster_name}-db-password-${random_id.secret_suffix.hex}"
  secret_string = local.db_password
}

module "elasticache" {
  source               = "./modules/elasticache"
  create               = var.create_elasticache
  replication_group_id = "interview-platform-redis"
  node_type            = var.elasticache_node_type
  num_cache_clusters   = 1
  subnet_group_name    = "${var.cluster_name}-redis-subnet-group"
  security_group_ids   = var.create_elasticache ? [aws_security_group.redis[0].id] : []
  subnet_ids           = module.vpc.private_subnets
}

module "guardduty" {
  source = "./modules/guardduty"
  create = false
}

module "waf" {
  source = "./modules/waf"
  create = true
}

module "cloudwatch_backend_logs" {
  source            = "./modules/cloudwatch"
  create            = true
  log_group_name    = "/aws/interview-platform/backend"
  retention_in_days = 30
}

module "cloudwatch_frontend_logs" {
  source            = "./modules/cloudwatch"
  create            = true
  log_group_name    = "/aws/interview-platform/frontend"
  retention_in_days = 30
}

module "irsa_backend" {
  source               = "./modules/irsa"
  create               = true
  service_account_name = "interview-platform-backend-sa"
  namespace            = "production"
  role_name            = "interview-platform-backend-sa-role"
  oidc_provider_arn    = module.eks.oidc_provider_arn
  oidc_provider_url    = module.eks.cluster_oidc_issuer_url
  policy_arns          = [module.iam.secrets_policy_arn, module.iam.s3_policy_arn]
}

module "iam" {
  source      = "./modules/iam"
  create      = true
  name_prefix = var.cluster_name
}

/* OIDC provider is managed by the EKS module; do not create a second provider here. */
