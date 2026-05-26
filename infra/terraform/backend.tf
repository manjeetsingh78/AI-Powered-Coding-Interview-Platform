terraform {
  backend "s3" {
    bucket         = "interview-platform-tfstate-045682312624"
    key            = "infra/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "interview-platform-tfstate-locks"
    encrypt        = true
  }
}
