variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
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
  default = false
}

variable "create_elasticache" {
  type    = bool
  default = false
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

variable "jenkins_instance_type" {
  description = "EC2 instance type for the Jenkins controller"
  type        = string
  default     = "t2.micro"
}

variable "jenkins_root_volume_size" {
  description = "Root volume size in GiB for the Jenkins EC2 instance"
  type        = number
  default     = 30
}

variable "jenkins_data_volume_size" {
  description = "EBS volume size in GiB for persistent Jenkins data (/var/lib/jenkins)"
  type        = number
  default     = 50
}

variable "jenkins_data_volume_type" {
  description = "EBS volume type for Jenkins data"
  type        = string
  default     = "gp3"
}

variable "jenkins_data_device_name" {
  description = "Device name to attach the Jenkins data volume as (Linux)"
  type        = string
  default     = "/dev/xvdf"
}

variable "jenkins_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to reach Jenkins over HTTP"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "terraform_version" {
  description = "Terraform version installed on the Jenkins host"
  type        = string
  default     = "1.14.0"
}

variable "kubectl_version" {
  description = "kubectl version installed on the Jenkins host"
  type        = string
  default     = "v1.31.7"
}

variable "helm_version" {
  description = "Helm version installed on the Jenkins host"
  type        = string
  default     = "v3.17.3"
}

variable "enable_prometheus_stack" {
  description = "Install Prometheus and Grafana in the monitoring namespace"
  type        = bool
  default     = false
}

variable "enable_datadog" {
  description = "Install Datadog agent in the monitoring namespace"
  type        = bool
  default     = false
}

variable "datadog_site" {
  description = "Datadog site"
  type        = string
  default     = "datadoghq.com"
}

variable "datadog_api_key" {
  description = "Datadog API key used by the Datadog Helm chart"
  type        = string
  sensitive   = true
  default     = ""
}

variable "bastion_instance_type" {
  description = "EC2 instance type for the bastion host"
  type        = string
  default     = "t3.micro"
}

variable "create_bastion" {
  description = "Whether to create the bastion EC2 instance (set false to skip when quota constrained)"
  type        = bool
  default     = false
}

variable "eks_cluster_version" {
  description = "EKS control plane version"
  type        = string
  default     = "1.31"
}

variable "eks_cluster_endpoint_public_access_cidrs" {
  description = "CIDR blocks allowed to access the EKS public API endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "eks_node_instance_type" {
  description = "EC2 instance type for EKS managed node group"
  type        = string
  default     = "t3.micro"
}

variable "eks_node_version" {
  description = "Kubernetes version for EKS managed node group. Leave null to follow the control plane version."
  type        = string
  default     = null
}

variable "eks_node_desired_size" {
  description = "Desired number of EKS worker nodes"
  type        = number
  default     = 1
}

variable "eks_node_min_size" {
  description = "Minimum number of EKS worker nodes"
  type        = number
  default     = 1
}

variable "eks_node_max_size" {
  description = "Maximum number of EKS worker nodes"
  type        = number
  default     = 1
}

variable "eks_use_private_subnets" {
  description = "Run EKS workers in private subnets when true; use public subnets when false"
  type        = bool
  default     = false
}

variable "enable_nat_gateway" {
  description = "Create NAT gateway for private subnet egress"
  type        = bool
  default     = false
}

variable "single_nat_gateway" {
  description = "Use a single shared NAT gateway when NAT is enabled"
  type        = bool
  default     = true
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "deploy_k8s_from_local" {
  description = "When true, Terraform will create Kubernetes and Helm resources from the machine running Terraform. Set false when EKS API is private and you will deploy from inside the VPC."
  type        = bool
  default     = false
}

