resource "aws_s3_bucket" "this" {
  count = var.create ? 1 : 0
  bucket = var.bucket_name
  acl    = "private"
  versioning {
    enabled = var.enable_versioning
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
