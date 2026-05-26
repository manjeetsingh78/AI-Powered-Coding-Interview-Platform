resource "aws_db_subnet_group" "this" {
  count      = var.create ? 1 : 0
  name       = "${var.db_name}-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_db_instance" "this" {
  count = var.create ? 1 : 0

  identifier                  = replace(var.db_name, "_", "-")
  allocated_storage           = 20
  engine                      = "postgres"
  engine_version              = var.db_engine_version
  instance_class              = var.db_instance_class
  db_name                     = var.db_name
  username                    = var.db_username
  password                    = var.db_password
  db_subnet_group_name        = aws_db_subnet_group.this[0].name
  vpc_security_group_ids      = var.security_group_ids
  multi_az                    = false
  allow_major_version_upgrade = var.allow_major_version_upgrade
  backup_retention_period     = var.backup_retention_period
  deletion_protection         = var.deletion_protection
  skip_final_snapshot         = var.skip_final_snapshot
  publicly_accessible         = false
  tags = {
    ManagedBy = "terraform"
  }
}
