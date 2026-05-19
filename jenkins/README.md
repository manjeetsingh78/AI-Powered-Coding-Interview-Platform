Enterprise Jenkins integration guide

Required Jenkins plugins (suggested):
- Pipeline
- GitHub Branch Source
- Docker Pipeline
- Kubernetes CLI
- AWS Credentials
- Credentials Binding
- Slack Notification
- Blue Ocean (optional)
- Role-based Authorization Strategy

Required Jenkins credentials (IDs used in pipelines):
- `aws-creds` (Username/password binding for AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY) or use IAM role on agent
- `snyk-token` (secret text)
- `kubeconfig` (file credential with kubeconfig for target cluster)
 - `discord-webhook` (secret text) — the Discord webhook URL to post pipeline notifications
 - `discord-webhook-staging` (optional) — secret text for staging channel
 - `discord-webhook-production` (optional) — secret text for production channel

Naming convention:
- Add per-environment secrets in Jenkins with ids `discord-webhook-<env>` where `<env>` matches pipeline `DEPLOY_ENV` parameter (e.g., `staging`, `production`). The pipeline will prefer env-specific webhook and fall back to `discord-webhook` if missing.

Recommended job setup
- Create a Multibranch Pipeline pointing to this repository. Jenkins will detect the `Jenkinsfile` in the root and run per-branch.
- Configure webhooks in GitHub to notify Jenkins for push/PR events.

Security & approvals
- For production deploys, the pipeline uses `input` step which can restrict submitters to a group (e.g., `release-managers`).

Agent recommendations
- Use Linux agents with Docker installed (or Kubernetes-based Jenkins agents with Docker-in-Docker support).
