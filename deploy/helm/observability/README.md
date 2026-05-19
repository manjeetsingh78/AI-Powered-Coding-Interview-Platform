Observability install instructions

This folder contains instructions to install Prometheus (kube-prometheus-stack) and Fluent Bit for log forwarding.

Install with Helm:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add fluent https://fluent.github.io/helm-charts
helm repo update

# Install Prometheus + Grafana
helm upgrade --install prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# Install Fluent Bit to forward logs to CloudWatch or other sinks
helm upgrade --install fluent-bit fluent/fluent-bit --namespace monitoring
```

Configure the collectors and alerting rules as needed for your environment.
