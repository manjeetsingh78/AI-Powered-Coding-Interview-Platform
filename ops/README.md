Operations runbook and deployment notes for the AI Powered Interview Platform.

Contents:
- `RUNBOOK.md` - operational runbook and incident steps
- `DEPLOYMENT.md` - deployment and rollback steps (placeholder)

Credentials and secrets
- Store secrets in your secret manager (AWS Secrets Manager / Kubernetes secrets / Vault).
- Do NOT commit API keys or credentials into git. Use the placeholders in CI and k8s manifests.
