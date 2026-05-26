/*
Bootstrap resources for Terraform remote state: S3 bucket and DynamoDB table.
Run this file separately (not via the main infra apply) to create the backend resources,
then enable the backend block in `backend.tf` and re-run `terraform init`.

Example:
  terraform init
  terraform apply -auto-approve -var="backend_bucket=your-tfstate-bucket" -var="dynamodb_table=tfstate-locks"
*/

variable "backend_bucket" {
  type    = string
  default = ""
}

variable "dynamodb_table" {
  type    = string
  default = ""
}

resource "aws_s3_bucket" "tfstate" {
  count         = var.backend_bucket != "" ? 1 : 0
  bucket        = var.backend_bucket
  force_destroy = false
  tags          = { ManagedBy = "terraform" }
}

resource "aws_s3_bucket_versioning" "tfstate" {
  count  = var.backend_bucket != "" ? 1 : 0
  bucket = aws_s3_bucket.tfstate[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  count  = var.backend_bucket != "" ? 1 : 0
  bucket = aws_s3_bucket.tfstate[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_dynamodb_table" "tf_locks" {
  count        = var.dynamodb_table != "" ? 1 : 0
  name         = var.dynamodb_table
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
  tags = { ManagedBy = "terraform" }
}

output "bucket_name" {
  value = try(aws_s3_bucket.tfstate[0].bucket, null)
}

output "dynamodb_table" {
  value = try(aws_dynamodb_table.tf_locks[0].name, null)
}
