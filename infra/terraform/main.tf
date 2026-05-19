resource "aws_ecr_repository" "backend" {
  name                 = var.ecr_backend_repo
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = {
    ManagedBy = "terraform"
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = var.ecr_frontend_repo
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = {
    ManagedBy = "terraform"
  }
}

# EKS module will be created (if create_vpc true VPC module will run first)
## Optional production modules

module "kms" {
  source = "./modules/kms"
  create = var.create_kms
  alias_name = "alias/interview-platform"
}

module "s3_assets" {
  source = "./modules/s3"
  create = var.create_s3
  bucket_name = "${var.cluster_name}-assets"
  enable_versioning = true
  lifecycle_rules = []
}

module "rds" {
  source = "./modules/rds"
  create = var.create_rds
  db_name = var.db_name
  db_username = var.db_username
  # Prefer passing DB password via Secrets Manager; if provided, it's used directly.
  db_password = var.db_password
  db_instance_class = "db.t3.medium"
  private_subnet_ids = module.vpc.private_subnets
  security_group_ids = []
  backup_retention_period = 7
  deletion_protection = true
}

# Create a Secrets Manager secret for DB password if db_password is not provided.
module "db_secret" {
  source = "./modules/secretsmanager"
  create = true
  name = "${var.cluster_name}-db-password"
  secret_string = var.db_password != "" ? var.db_password : "REPLACE_WITH_SECURE_PASSWORD"
}

module "elasticache" {
  source = "./modules/elasticache"
  create = var.create_elasticache
  replication_group_id = "interview-platform-redis"
  node_type = "cache.t3.medium"
  num_cache_clusters = 1
  subnet_group_name = "${var.cluster_name}-redis-subnet-group"
  security_group_ids = []
  subnet_ids = module.vpc.private_subnets
}

module "guardduty" {
  source = "./modules/guardduty"
  create = true
}

module "waf" {
  source = "./modules/waf"
  create = true
}

module "cloudwatch_backend_logs" {
  source = "./modules/cloudwatch"
  create = true
  log_group_name = "/aws/interview-platform/backend"
  retention_in_days = 30
}

module "cloudwatch_frontend_logs" {
  source = "./modules/cloudwatch"
  create = true
  log_group_name = "/aws/interview-platform/frontend"
  retention_in_days = 30
}

module "irsa_backend" {
  source = "./modules/irsa"
  create = true
  service_account_name = "{{REPLACEME}}"
  namespace = "production"
  role_name = "interview-platform-backend-sa-role"
  oidc_provider_arn = aws_iam_openid_connect_provider.eks.arn
  oidc_provider_url = data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer
  policy_arns = [module.iam.secrets_policy_arn, module.iam.s3_policy_arn]
}

module "iam" {
  source = "./modules/iam"
  create = true
  name_prefix = var.cluster_name
}

data "aws_eks_cluster" "cluster" {
  name = module.eks.cluster_id
}

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_id
}

resource "aws_iam_openid_connect_provider" "eks" {
  url = data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = ["REPLACE_WITH_THUMBPRINT"]
}

 

