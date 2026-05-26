module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "interview-platform-vpc"
  cidr = var.vpc_cidr

  map_public_ip_on_launch = true

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  public_subnets  = [for i in range(3) : cidrsubnet(var.vpc_cidr, 8, i + 1)]
  private_subnets = [for i in range(3) : cidrsubnet(var.vpc_cidr, 8, i + 4)]

  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.single_nat_gateway

  tags = {
    "ManagedBy" = "terraform"
  }
}

data "aws_availability_zones" "available" {}
