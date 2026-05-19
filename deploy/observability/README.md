Observability deployment notes and recommended installs.

This repo contains Helm/value scaffolds and k8s manifests for deploying observability components.

Recommended installation (Helm):

1. Prometheus / kube-prometheus-stack

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus-stack prometheus-community/kube-prometheus-stack -n monitoring --create-namespace -f deploy/observability/prometheus/values.yaml
```

2. Grafana

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install grafana grafana/grafana -n monitoring -f deploy/observability/grafana/values.yaml
```

3. Datadog (optional)

```bash
# Create a k8s secret with your Datadog API key
kubectl create secret generic datadog-api --from-literal=api-key=REPLACE_WITH_DD_APIKEY -n monitoring
helm repo add datadog https://helm.datadoghq.com
helm repo update
helm install datadog datadog/datadog -n monitoring -f deploy/observability/datadog/values.yaml
```

Placeholders:
- Datadog: API key must be provided as k8s secret `datadog-api` or via Helm values.

Snyk and CI secrets
- Add `SNYK_TOKEN` to GitHub repository secrets to enable Snyk scans in CI.
- For Jenkins add credential `snyk-token` (secret text) and `aws-creds` (AWS key/secret as username/password) and `kubeconfig` as file if deploying to k8s from Jenkins.
- For Discord notifications add `DISCORD_WEBHOOK` as a GitHub secret (Actions) and add `discord-webhook` credential (secret text) in Jenkins.
 - For Discord notifications add any of these GitHub secrets (preferred order): `DISCORD_WEBHOOK_PRODUCTION`, `DISCORD_WEBHOOK_STAGING`, `DISCORD_WEBHOOK_PR`, or `DISCORD_WEBHOOK` as fallback. Add corresponding Jenkins credentials: `discord-webhook-production`, `discord-webhook-staging`, or `discord-webhook` (default).

