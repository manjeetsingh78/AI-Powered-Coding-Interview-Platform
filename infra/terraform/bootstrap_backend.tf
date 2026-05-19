/*
Bootstrap resources for Terraform remote state: S3 bucket and DynamoDB table.
Run this file separately (not via the main infra apply) to create the backend resources,
then enable the backend block in `backend.tf` and re-run `terraform init`.

Example:
  terraform init
  terraform apply -auto-approve -var="backend_bucket=your-tfstate-bucket" -var="dynamodb_table=tfstate-locks"
*/

variable "backend_bucket" { type = string }
variable "dynamodb_table" { type = string }

resource "aws_s3_bucket" "tfstate" {
  bucket = var.backend_bucket
  acl    = "private"
  force_destroy = false
  versioning {
    enabled = true
  }
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
  tags = { ManagedBy = "terraform" }
}

resource "aws_dynamodb_table" "tf_locks" {
  name         = var.dynamodb_table
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
  tags = { ManagedBy = "terraform" }
}

output "bucket_name" { value = aws_s3_bucket.tfstate.bucket }
output "dynamodb_table" { value = aws_dynamodb_table.tf_locks.name }
