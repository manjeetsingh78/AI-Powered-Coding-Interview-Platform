variable "create" {
	type    = bool
	default = true
}

variable "bucket_name" {
	type = string
}

variable "enable_versioning" {
	type    = bool
	default = true
}

variable "lifecycle_rules" {
	type = list(object({
		id      = string
		enabled = bool
		days    = number
	}))
	default = []
}
