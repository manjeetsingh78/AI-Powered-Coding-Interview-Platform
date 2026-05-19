#!/bin/bash
#
# Blue-Green Deployment Script
# Implements zero-downtime deployment by running two identical environments
# and switching traffic between them
#
# Usage: bash blue_green_deploy.sh \
#   --backend-image <image> \
#   --frontend-image <image> \
#   --namespace production

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default values
NAMESPACE="production"
BACKEND_IMAGE=""
FRONTEND_IMAGE=""
WAIT_TIME="5m"
HEALTH_CHECK_TIMEOUT="300"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --backend-image) BACKEND_IMAGE="$2"; shift 2 ;;
    --frontend-image) FRONTEND_IMAGE="$2"; shift 2 ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    --wait-time) WAIT_TIME="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "═══════════════════════════════════════════════════════"
echo "🔵 BLUE-GREEN DEPLOYMENT"
echo "═══════════════════════════════════════════════════════"

# Get current deployment (determine if it's Blue or Green)
CURRENT_DEPLOYMENT=$(kubectl get svc -n $NAMESPACE interview-platform-backend-active \
  -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "green")

if [ "$CURRENT_DEPLOYMENT" == "green" ]; then
  ACTIVE="green"
  STANDBY="blue"
else
  ACTIVE="blue"
  STANDBY="green"
fi

echo "Current Active: $ACTIVE"
echo "Deploying to: $STANDBY"

# Step 1: Deploy to Standby
echo ""
echo -e "${BLUE}Step 1: Deploying to $STANDBY environment...${NC}"

helm upgrade --install interview-platform-$STANDBY \
  deploy/helm/interview-platform \
  --namespace $NAMESPACE \
  --create-namespace \
  -f deploy/helm/values-production.yaml \
  --set backend.image=$BACKEND_IMAGE \
  --set frontend.image=$FRONTEND_IMAGE \
  --set version=$STANDBY \
  --set replicaCount=3 \
  --wait \
  --timeout 15m

echo -e "${GREEN}✓ Deployment to $STANDBY complete${NC}"

# Step 2: Health Checks
echo ""
echo -e "${BLUE}Step 2: Running health checks...${NC}"

HEALTH_CHECK_COUNTER=0
while [ $HEALTH_CHECK_COUNTER -lt 30 ]; do
  READY_REPLICAS=$(kubectl get deployment interview-platform-$STANDBY-backend \
    -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' || echo "0")
  
  if [ "$READY_REPLICAS" == "3" ]; then
    echo -e "${GREEN}✓ All $STANDBY backend pods are healthy${NC}"
    break
  fi
  
  echo "Waiting for pods to be ready... ($READY_REPLICAS/3)"
  sleep 10
  ((HEALTH_CHECK_COUNTER++))
done

# Step 3: Run Smoke Tests
echo ""
echo -e "${BLUE}Step 3: Running smoke tests on $STANDBY...${NC}"

STANDBY_URL=$(kubectl get svc -n $NAMESPACE interview-platform-frontend-$STANDBY \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' || echo "localhost:3000")

echo "Testing: http://$STANDBY_URL"

for i in {1..10}; do
  if curl -sf "http://$STANDBY_URL/health" > /dev/null; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    break
  fi
  echo "Attempt $i/10 - waiting for service..."
  sleep 10
done

# Step 4: Manual Validation Wait
echo ""
echo -e "${YELLOW}Step 4: Waiting $WAIT_TIME for manual validation...${NC}"
echo "Review the new deployment before traffic switch:"
echo "  kubectl get pods -n $NAMESPACE -l version=$STANDBY"
echo "  kubectl logs -n $NAMESPACE -l version=$STANDBY"
echo ""
echo "Press Enter to proceed with traffic switch or Ctrl+C to abort"
read -r -t $(( $(echo "$WAIT_TIME" | sed 's/m/*60+/g;s/s//g' | bc) )) || true

# Step 5: Switch Traffic
echo ""
echo -e "${BLUE}Step 5: Switching traffic from $ACTIVE to $STANDBY...${NC}"

# Update service selector to point to new deployment
kubectl patch svc interview-platform-backend-active \
  -n $NAMESPACE \
  -p "{\"spec\":{\"selector\":{\"version\":\"$STANDBY\"}}}"

kubectl patch svc interview-platform-frontend-active \
  -n $NAMESPACE \
  -p "{\"spec\":{\"selector\":{\"version\":\"$STANDBY\"}}}"

echo -e "${GREEN}✓ Traffic switched to $STANDBY${NC}"

# Step 6: Monitor
echo ""
echo -e "${BLUE}Step 6: Monitoring new deployment (60 seconds)...${NC}"

for i in {1..6}; do
  ERROR_RATE=$(kubectl logs -n $NAMESPACE -l version=$STANDBY --tail=100 | \
    grep -c "ERROR\|500" || echo "0")
  
  echo "Error count (sample): $ERROR_RATE"
  sleep 10
done

# Step 7: Keep or Rollback
echo ""
echo -e "${YELLOW}Keep deployment? (yes/no)${NC}"
read -r KEEP

if [ "$KEEP" != "yes" ]; then
  echo -e "${YELLOW}Rolling back to $ACTIVE...${NC}"
  
  kubectl patch svc interview-platform-backend-active \
    -n $NAMESPACE \
    -p "{\"spec\":{\"selector\":{\"version\":\"$ACTIVE\"}}}"
  
  kubectl patch svc interview-platform-frontend-active \
    -n $NAMESPACE \
    -p "{\"spec\":{\"selector\":{\"version\":\"$ACTIVE\"}}}"
  
  echo -e "${GREEN}✓ Rolled back to $ACTIVE${NC}"
  exit 1
fi

# Step 8: Cleanup Old Deployment
echo ""
echo -e "${BLUE}Step 8: Cleaning up old $ACTIVE deployment...${NC}"

helm uninstall interview-platform-$ACTIVE \
  -n $NAMESPACE || echo "Cleanup not needed"

echo -e "${GREEN}✓ Old deployment removed${NC}"

echo ""
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✓ BLUE-GREEN DEPLOYMENT COMPLETE${NC}"
echo "═══════════════════════════════════════════════════════"
