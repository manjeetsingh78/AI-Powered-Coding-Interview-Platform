# RUNBOOK: Incident response and runbook for AI Interview Platform

1) Incident classification
   - Severity 1: Platform down for all users
   - Severity 2: Major feature degraded (submission/execution failures)
   - Severity 3: Minor issue / single tenant issue

2) Initial actions
   - Check CI/CD: Jenkins / GitHub Actions status
   - Check Kubernetes cluster health: `kubectl get nodes,pods -A`
   - Check Prometheus metrics (CPU, memory, request errors)
   - Check Grafana dashboards and logs

3) If deployment caused the issue
   - Roll back to previous image tag in Helm values or use `kubectl rollout undo` for the affected deployment

4) Secrets compromise
   - Rotate credentials in AWS / Vault
   - Recreate Kubernetes secrets and restart pods

5) Contact list
   - On-call: [replace-with-oncall-contact]
   - Slack channel: #platform-ops
