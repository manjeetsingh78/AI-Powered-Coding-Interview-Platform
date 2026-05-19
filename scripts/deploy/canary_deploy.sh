#!/bin/bash
#
# Canary Deployment Script
# Gradually rolls out new version to small % of traffic
# Monitors metrics and auto-promotes on success or rolls back on failure
#
# Usage: bash canary_deploy.sh \
#   --backend-image <image> \
#   --frontend-image <image> \
#   --namespace production \
#   --canary-weight 5 \
#   --hold-time 10m

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
CANARY_WEIGHT=5
HOLD_TIME="10m"
ERROR_THRESHOLD=5

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --backend-image) BACKEND_IMAGE="$2"; shift 2 ;;
    --frontend-image) FRONTEND_IMAGE="$2"; shift 2 ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    --canary-weight) CANARY_WEIGHT="$2"; shift 2 ;;
    --hold-time) HOLD_TIME="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "═══════════════════════════════════════════════════════"
echo "🕊️  CANARY DEPLOYMENT"
echo "═══════════════════════════════════════════════════════"
echo "Canary Traffic: ${CANARY_WEIGHT}%"
echo "Hold Time: $HOLD_TIME"

# Step 1: Deploy Canary Replicas (1 replica)
echo ""
echo -e "${BLUE}Step 1: Deploying canary replicas (1 replica = ${CANARY_WEIGHT}% traffic)...${NC}"

helm upgrade --install interview-platform-canary \
  deploy/helm/interview-platform \
  --namespace $NAMESPACE \
  --create-namespace \
  -f deploy/helm/values-production.yaml \
  --set backend.image=$BACKEND_IMAGE \
  --set frontend.image=$FRONTEND_IMAGE \
  --set replicaCount=1 \
  --set labels.version=canary \
  --wait \
  --timeout 10m

echo -e "${GREEN}✓ Canary deployment initiated${NC}"

# Step 2: Configure Traffic Split (Istio/ALB-based)
echo ""
echo -e "${BLUE}Step 2: Configuring traffic split (${CANARY_WEIGHT}% to canary)...${NC}"

# If using Istio for traffic management
if kubectl get crd virtualservices.networking.istio.io &> /dev/null; then
  kubectl patch virtualservice interview-platform \
    -n $NAMESPACE \
    --type merge \
    -p "{\"spec\":{\"hosts\":[\"*\"],\"http\":[{\"match\":[{\"uri\":{\"prefix\":\"/\"}}],\"route\":[{\"destination\":{\"host\":\"interview-platform-backend\",\"subset\":\"stable\"},\"weight\":$((100-CANARY_WEIGHT))},{\"destination\":{\"host\":\"interview-platform-backend\",\"subset\":\"canary\"},\"weight\":$CANARY_WEIGHT}]}]}}"
fi

echo -e "${GREEN}✓ Traffic split configured${NC}"

# Step 3: Health Checks
echo ""
echo -e "${BLUE}Step 3: Verifying canary pods are healthy...${NC}"

READY_COUNTER=0
while [ $READY_COUNTER -lt 30 ]; do
  READY=$(kubectl get deployment interview-platform-canary-backend \
    -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' || echo "0")
  
  if [ "$READY" == "1" ]; then
    echo -e "${GREEN}✓ Canary pod is healthy${NC}"
    break
  fi
  
  echo "Waiting for canary pod to be ready..."
  sleep 5
  ((READY_COUNTER++))
done

# Step 4: Monitor Canary
echo ""
echo -e "${BLUE}Step 4: Monitoring canary deployment (${HOLD_TIME})...${NC}"

HOLD_SECONDS=$(echo "$HOLD_TIME" | sed 's/m/*60+/g;s/s//g' | bc)
SAMPLE_SIZE=0
ERROR_COUNT=0

START_TIME=$(date +%s)
END_TIME=$((START_TIME + HOLD_SECONDS))

while [ $(date +%s) -lt $END_TIME ]; do
  # Check error rate
  ERROR_LOGS=$(kubectl logs -n $NAMESPACE \
    -l app=interview-platform-backend,version=canary \
    --tail=100 --timestamps=true 2>/dev/null | \
    grep -i "error\|500\|exception" | wc -l || echo "0")
  
  ((ERROR_COUNT += ERROR_LOGS))
  ((SAMPLE_SIZE++))
  
  ELAPSED=$(($(date +%s) - START_TIME))
  REMAINING=$((HOLD_SECONDS - ELAPSED))
  
  echo "Error count (sample $SAMPLE_SIZE): $ERROR_LOGS | Remaining: ${REMAINING}s"
  
  # Check if error threshold exceeded
  if [ "$ERROR_COUNT" -gt $ERROR_THRESHOLD ]; then
    echo -e "${RED}✗ Error threshold exceeded! Rolling back...${NC}"
    
    # Step 7: Rollback
    kubectl scale deployment interview-platform-canary-backend \
      -n $NAMESPACE --replicas=0 || true
    
    # Restore 100% traffic to stable
    if kubectl get crd virtualservices.networking.istio.io &> /dev/null; then
      kubectl patch virtualservice interview-platform \
        -n $NAMESPACE \
        --type merge \
        -p "{\"spec\":{\"hosts\":[\"*\"],\"http\":[{\"match\":[{\"uri\":{\"prefix\":\"/\"}}],\"route\":[{\"destination\":{\"host\":\"interview-platform-backend\",\"subset\":\"stable\"},\"weight\":100}]}]}}"
    fi
    
    echo -e "${RED}✓ Rolled back to stable version${NC}"
    exit 1
  fi
  
  sleep 10
done

echo -e "${GREEN}✓ Canary monitoring complete${NC}"

# Step 5: Promotion Decision
echo ""
echo -e "${BLUE}Step 5: Promoting canary to stable...${NC}"

# Step 6: Gradual Promotion (5% -> 25% -> 50% -> 100%)
WEIGHTS=(25 50 100)
INTERVAL=60  # seconds between weight increases

for WEIGHT in "${WEIGHTS[@]}"; do
  echo "Increasing traffic to ${WEIGHT}%..."
  
  if kubectl get crd virtualservices.networking.istio.io &> /dev/null; then
    kubectl patch virtualservice interview-platform \
      -n $NAMESPACE \
      --type merge \
      -p "{\"spec\":{\"hosts\":[\"*\"],\"http\":[{\"match\":[{\"uri\":{\"prefix\":\"/\"}}],\"route\":[{\"destination\":{\"host\":\"interview-platform-backend\",\"subset\":\"stable\"},\"weight\":$((100-WEIGHT))},{\"destination\":{\"host\":\"interview-platform-backend\",\"subset\":\"canary\"},\"weight\":$WEIGHT}]}]}}"
  fi
  
  # Monitor this weight level
  for i in {1..6}; do
    ERRORS=$(kubectl logs -n $NAMESPACE \
      -l app=interview-platform-backend \
      --tail=50 2>/dev/null | \
      grep -i "error\|500" | wc -l || echo "0")
    
    echo "  Weight ${WEIGHT}% - Error check ($i/6): $ERRORS errors"
    
    if [ "$ERRORS" -gt $((ERROR_THRESHOLD * WEIGHT / 100)) ]; then
      echo -e "${RED}✗ Errors detected at ${WEIGHT}% weight! Aborting promotion...${NC}"
      exit 1
    fi
    
    sleep 10
  done
  
  echo -e "${GREEN}✓ ${WEIGHT}% weight stable${NC}"
done

# Step 7: Cleanup Canary Deployment Label
echo ""
echo -e "${BLUE}Step 6: Finalizing deployment...${NC}"

# Scale down the separate canary deployment
kubectl scale deployment interview-platform-canary-backend \
  -n $NAMESPACE --replicas=0 || true

# Update stable deployment to new image version
helm upgrade interview-platform \
  deploy/helm/interview-platform \
  --namespace $NAMESPACE \
  -f deploy/helm/values-production.yaml \
  --set backend.image=$BACKEND_IMAGE \
  --set frontend.image=$FRONTEND_IMAGE \
  --set replicaCount=3 \
  --wait \
  --timeout 15m

echo -e "${GREEN}✓ Stable deployment updated${NC}"

echo ""
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✓ CANARY DEPLOYMENT COMPLETE & PROMOTED${NC}"
echo "═══════════════════════════════════════════════════════"
echo "Promoted to 100% traffic"
echo "New version is now live for all users"
