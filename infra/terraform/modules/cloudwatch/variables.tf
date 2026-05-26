variable "create" {
  type    = bool
  default = true
}

variable "log_group_name" {
  type = string
}

variable "retention_in_days" {
  type    = number
  default = 30
}
