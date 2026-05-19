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
  default = "db.t3.medium"
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
