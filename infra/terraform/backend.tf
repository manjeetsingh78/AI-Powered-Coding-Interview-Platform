/*
Terraform remote backend example (S3 + DynamoDB for state locking).
Create the S3 bucket and DynamoDB table before enabling the backend or use an existing one.

Uncomment and configure the backend block below and place your bucket name and region.

backend "s3" {
  bucket         = "REPLACE_WITH_TFSTATE_BUCKET"
  key            = "infra/terraform.tfstate"
  region         = var.aws_region
  dynamodb_table = "REPLACE_WITH_DYNAMODB_TABLE"
  encrypt        = true
}

*/

/* If you prefer to create the backend resources via Terraform, do that in a separate bootstrap step.
   See infra/terraform/README.md for instructions.
*/
