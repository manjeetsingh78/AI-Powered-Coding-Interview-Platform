Jenkins on AWS integration guide

This repository provisions the Jenkins controller on AWS EC2 through Terraform. Use that instance as the always-on CI/CD runner; do not rely on a local Jenkins install.

Required Jenkins plugins:
- Pipeline
- GitHub Branch Source
- Docker Pipeline
- AWS Credentials
- Credentials Binding
- Slack Notification
- Blue Ocean (optional)
- Role-based Authorization Strategy

Required Jenkins credentials:
- `aws-creds` or an EC2 IAM role with ECR/EKS/RDS permissions
- `snyk-token` (secret text)
- `kubeconfig` (file credential for the target EKS cluster)
- `discord-webhook` (secret text)

Recommended job setup:
- Create a single Pipeline job that points at the root `Jenkinsfile`.
- Configure the GitHub webhook to call `http://<jenkins-public-ip>:8080/github-webhook/`.
- Use the AWS instance output from Terraform as the controller URL.

Security and operations:
- Keep the controller running on EC2 so builds continue when your laptop is off.
- Use the production approval `input` step for guarded releases.
- Run builds on Linux agents with Docker access, or on the controller itself if you keep it dedicated.
