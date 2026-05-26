terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_eks_cluster" "cluster" {
  count = var.deploy_k8s_from_local ? 1 : 0
  name  = module.eks.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  count = var.deploy_k8s_from_local ? 1 : 0
  name  = module.eks.cluster_name
}

provider "kubernetes" {
  host                   = var.deploy_k8s_from_local ? data.aws_eks_cluster.cluster[0].endpoint : ""
  cluster_ca_certificate = var.deploy_k8s_from_local ? base64decode(data.aws_eks_cluster.cluster[0].certificate_authority[0].data) : ""
  token                  = var.deploy_k8s_from_local ? data.aws_eks_cluster_auth.cluster[0].token : ""
}

provider "helm" {
  kubernetes {
    host                   = var.deploy_k8s_from_local ? data.aws_eks_cluster.cluster[0].endpoint : ""
    cluster_ca_certificate = var.deploy_k8s_from_local ? base64decode(data.aws_eks_cluster.cluster[0].certificate_authority[0].data) : ""
    token                  = var.deploy_k8s_from_local ? data.aws_eks_cluster_auth.cluster[0].token : ""
  }
}
