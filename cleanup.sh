#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="webapp"
STOP_MINIKUBE=false
DELETE_IMAGES=false

usage() {
  cat <<'EOF'
Usage: ./cleanup.sh [options]

Stops and removes Kubernetes resources for this project.

Options:
  --namespace <name>   Namespace to clean up (default: webapp)
  --stop-minikube      Also stop minikube after cleanup
  --delete-images      Also delete local minikube docker images
  -h, --help           Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace)
      if [[ $# -lt 2 ]]; then
        echo "Error: --namespace requires a value"
        exit 1
      fi
      NAMESPACE="$2"
      shift 2
      ;;
    --stop-minikube)
      STOP_MINIKUBE=true
      shift
      ;;
    --delete-images)
      DELETE_IMAGES=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

echo "Cleaning Kubernetes resources in namespace: ${NAMESPACE}"

if kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
  kubectl delete -f k8s/ingress.yaml --ignore-not-found=true || true
  kubectl delete -f k8s/frontend.yaml --ignore-not-found=true || true
  kubectl delete -f k8s/backend.yaml --ignore-not-found=true || true
  kubectl delete -f k8s/mongodb.yaml --ignore-not-found=true || true

  kubectl delete namespace "${NAMESPACE}" --ignore-not-found=true

  echo "Waiting for namespace ${NAMESPACE} to terminate..."
  for _ in $(seq 1 90); do
    if ! kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
      echo "Namespace ${NAMESPACE} deleted"
      break
    fi
    sleep 2
  done
else
  echo "Namespace ${NAMESPACE} does not exist, nothing to clean"
fi

if [[ "${DELETE_IMAGES}" == "true" ]]; then
  echo "Deleting local minikube images for this project"
  eval "$(minikube docker-env)"
  docker image rm simple-backend:latest simple-frontend:latest >/dev/null 2>&1 || true
fi

if [[ "${STOP_MINIKUBE}" == "true" ]]; then
  echo "Stopping minikube"
  minikube stop
fi

echo "Cleanup complete"
