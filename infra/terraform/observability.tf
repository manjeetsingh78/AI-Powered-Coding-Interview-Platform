resource "kubernetes_namespace_v1" "monitoring" {
  count = var.deploy_k8s_from_local ? 1 : 0

  metadata {
    name = "monitoring"
    labels = {
      name = "monitoring"
    }
  }
}

resource "kubernetes_secret_v1" "datadog_api" {
  count = var.deploy_k8s_from_local && var.enable_datadog && var.datadog_api_key != "" ? 1 : 0

  metadata {
    name      = "datadog-api"
    namespace = kubernetes_namespace_v1.monitoring[0].metadata[0].name
  }

  type = "Opaque"

  data = {
    "api-key" = var.datadog_api_key
  }
}

resource "helm_release" "prometheus_stack" {
  count            = var.deploy_k8s_from_local && var.enable_prometheus_stack ? 1 : 0
  name             = "prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  namespace        = kubernetes_namespace_v1.monitoring[0].metadata[0].name
  create_namespace = false
  atomic           = true
  cleanup_on_fail  = true
  timeout          = 1200
  wait             = true

  values = [file("${path.module}/../../deploy/observability/prometheus/values.yaml")]

  depends_on = [kubernetes_namespace_v1.monitoring, module.eks]
}

resource "helm_release" "datadog" {
  count            = var.deploy_k8s_from_local && var.enable_datadog && var.datadog_api_key != "" ? 1 : 0
  name             = "datadog"
  repository       = "https://helm.datadoghq.com"
  chart            = "datadog"
  namespace        = kubernetes_namespace_v1.monitoring[0].metadata[0].name
  create_namespace = false
  atomic           = true
  cleanup_on_fail  = true
  timeout          = 1200
  wait             = true

  values = [file("${path.module}/../../deploy/observability/datadog/values.yaml")]

  depends_on = [
    kubernetes_namespace_v1.monitoring,
    kubernetes_secret_v1.datadog_api,
    module.eks,
  ]
}