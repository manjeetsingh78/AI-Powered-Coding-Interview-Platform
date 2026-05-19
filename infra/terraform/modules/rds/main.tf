resource "aws_db_subnet_group" "this" {
  count = var.create ? 1 : 0
  name  = "${var.db_name}-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_db_instance" "this" {
  count = var.create ? 1 : 0

  identifier              = var.db_name
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = var.db_instance_class
  name                   = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.this[0].name
  vpc_security_group_ids = var.security_group_ids
  multi_az               = true
  backup_retention_period = var.backup_retention_period
  deletion_protection     = var.deletion_protection
  skip_final_snapshot    = false
  publicly_accessible    = false
  tags = {
    ManagedBy = "terraform"
  }
}
