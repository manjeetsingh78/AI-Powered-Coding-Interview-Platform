#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=${1:-interview-platform}
RELEASE=${2:-interview-platform}

echo "Installing Helm chart ${RELEASE} into namespace ${NAMESPACE}"
helm upgrade --install ${RELEASE} deploy/helm/interview-platform -n ${NAMESPACE} --create-namespace

echo "Applying Grafana dashboards ConfigMap (sidecar should pick them up)"
kubectl apply -n ${NAMESPACE} -f <(helm template ${RELEASE} deploy/helm/interview-platform -s templates/grafana-dashboard-configmap.yaml)

echo "Done."
