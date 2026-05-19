variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "ecr_backend_repo" {
  description = "ECR repository name for backend"
  type        = string
  default     = "backend-repo"
}

variable "ecr_frontend_repo" {
  description = "ECR repository name for frontend"
  type        = string
  default     = "frontend-repo"
}

variable "cluster_name" {
  description = "EKS cluster name (optional)"
  type        = string
  default     = "interview-platform-eks"
}

variable "vpc_cidr" {
  description = "CIDR for created VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "create_vpc" {
  description = "Whether to create a new VPC"
  type        = bool
  default     = true
}

variable "create_rds" {
  type    = bool
  default = true
}

variable "create_elasticache" {
  type    = bool
  default = true
}

variable "create_s3" {
  type    = bool
  default = true
}

variable "create_kms" {
  type    = bool
  default = true
}

variable "db_password" {
  type    = string
  default = ""
}

variable "db_username" {
  type    = string
  default = "interview_admin"
}

variable "db_name" {
  type    = string
  default = "interview_platform"
}

