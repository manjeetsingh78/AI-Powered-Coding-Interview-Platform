output "ecr_backend_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  value = aws_ecr_repository.frontend.repository_url
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "jenkins_public_ip" {
  value = aws_eip.jenkins.public_ip
}

output "jenkins_url" {
  value = "http://${aws_eip.jenkins.public_ip}:8080"
}

output "monitoring_namespace" {
  value = var.deploy_k8s_from_local ? kubernetes_namespace_v1.monitoring[0].metadata[0].name : ""
}

output "reports_s3_bucket" {
  value = module.s3_assets.bucket_id
}

output "rds_endpoint" {
  value = module.rds.endpoint
}

output "rds_port" {
  value = module.rds.port
}

output "redis_endpoint" {
  value = module.elasticache.primary_endpoint_address
}

output "backend_service_account_role_arn" {
  value = module.irsa_backend.role_arn
}
