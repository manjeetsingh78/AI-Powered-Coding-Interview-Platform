resource "aws_guardduty_detector" "this" {
  count = var.create ? 1 : 0
  enable = true
}
