This folder contains a scaffold for provisioning an Amazon RDS (Postgres) instance for the Interview Platform.

Usage guidance
- Prefer using `aws_secretsmanager_secret` to store the DB password and reference it via IAM instead of hardcoding the password in `terraform.tfvars`.
- Create a dedicated DB subnet group using the VPC private subnets (the repo's `module.vpc.private_subnets`).
- Enable `multi_az` for production and set an appropriate `backup_retention_period`.

Example (minimal) resource snippet:

```hcl
variable "db_name" { default = "interview_platform" }
variable "db_username" { default = "interview_admin" }
variable "db_password" { description = "Provide via tfvars or Secrets Manager" }

resource "aws_db_subnet_group" "default" {
  name       = "${var.db_name}-subnet-group"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_db_instance" "postgres" {
  identifier              = "${var.db_name}"
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = var.db_instance_class
  name                   = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.default.name
  vpc_security_group_ids = [module.vpc.default_security_group_id]
  multi_az               = true
  skip_final_snapshot    = false
  publicly_accessible    = false
}
```

Notes
- This is only a scaffold: adapt instance class, storage, parameter groups, and monitoring as required for your SLA.
