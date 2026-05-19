module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 3.0"

  name = "interview-platform-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  public_subnets  = [for i in range(3) : cidrsubnet(var.vpc_cidr, 8, i + 1)]
  private_subnets = [for i in range(3) : cidrsubnet(var.vpc_cidr, 8, i + 4)]

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = {
    "ManagedBy" = "terraform"
  }
}

data "aws_availability_zones" "available" {}
