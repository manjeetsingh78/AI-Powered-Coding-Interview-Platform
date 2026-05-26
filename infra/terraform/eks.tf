module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name                             = var.cluster_name
  cluster_version                          = var.eks_cluster_version
  enable_cluster_creator_admin_permissions = true
  cluster_endpoint_public_access           = true
  cluster_endpoint_private_access          = true
  cluster_endpoint_public_access_cidrs     = var.eks_cluster_endpoint_public_access_cidrs

  subnet_ids = var.eks_use_private_subnets ? module.vpc.private_subnets : module.vpc.public_subnets
  vpc_id     = module.vpc.vpc_id

  eks_managed_node_groups = {
    default = {
      desired_size    = var.eks_node_desired_size
      max_size        = var.eks_node_max_size
      min_size        = var.eks_node_min_size
      instance_types  = [var.eks_node_instance_type]
      cluster_version = var.eks_node_version
    }
  }

  tags = {
    ManagedBy = "terraform"
  }
}
