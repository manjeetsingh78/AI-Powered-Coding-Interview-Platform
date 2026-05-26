resource "aws_s3_bucket" "this" {
  count  = var.create ? 1 : 0
  bucket = var.bucket_name
  tags   = { ManagedBy = "terraform" }
}

resource "aws_s3_bucket_versioning" "this" {
  count  = var.create ? 1 : 0
  bucket = aws_s3_bucket.this[0].id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  count  = var.create ? 1 : 0
  bucket = aws_s3_bucket.this[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
