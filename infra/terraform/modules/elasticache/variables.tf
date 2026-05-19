variable "create" {
	type    = bool
	default = true
}

variable "replication_group_id" {
	type    = string
	default = "interview-platform-redis"
}

variable "node_type" {
	type    = string
	default = "cache.t3.medium"
}

variable "num_cache_clusters" {
	type    = number
	default = 1
}

variable "subnet_group_name" {
	type = string
}

variable "security_group_ids" {
	type = list(string)
}
