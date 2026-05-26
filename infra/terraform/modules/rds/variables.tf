variable "create" {
  description = "Whether to create the RDS instance"
  type        = bool
  default     = true
}

variable "db_name" {
  type    = string
  default = "interview_platform"
}

variable "db_username" {
  type    = string
  default = "interview_admin"
}

variable "db_password" {
  type = string
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "security_group_ids" {
  type = list(string)
}

variable "backup_retention_period" {
  type    = number
  default = 7
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "skip_final_snapshot" {
  description = "Whether to skip the final DB snapshot when destroying the instance"
  type        = bool
  default     = false
}

variable "db_engine_version" {
  description = "Postgres engine major version to use (pin to existing to avoid major upgrades)"
  type        = string
  default     = "15"
}

variable "allow_major_version_upgrade" {
  description = "Whether to allow major engine version upgrades via Terraform"
  type        = bool
  default     = false
}
