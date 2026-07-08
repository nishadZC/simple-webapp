# Simple Web App (Docker)

This project can run in two Docker modes (no Kubernete):

- Docker Compose (recommended)
- Manual docker build/run commands

It can also run on Kubernetes using Minikube (see "Option C").

## Option A) Docker Compose (Recommended 1)

Run from project root:

```bash
docker compose up --build -d
```

Open in browser:

- http://localhost:8081

Useful Compose commands:

```bash
docker compose ps
docker compose logs -f backend-service
docker compose logs -f frontend
docker compose logs -f mongodb-service
docker compose down
```

Reset everything (including database volume):

```bash
docker compose down -v
```

## Option B) Manual Docker Commands

This section runs the app with plain Docker CLI.

## 1) Build Images

Run from project root:

```bash
docker build -t simple-backend ./backend
docker build -t simple-frontend ./frontend
```

## 2) Create Network

```bash
docker network create webapp-net
```

If it already exists, Docker will show an error; that is fine.

## 3) Start MongoDB

```bash
docker volume create mongo-data
docker run -d \
  --name mongodb-service \
  --network webapp-net \
  -v mongo-data:/data/db \
  mongo:4.4
```

## 4) Start Backend

```bash
docker run -d \
  --name backend \
  --network webapp-net \
  -p 3000:3000 \
  -e MONGODB_URI='mongodb://mongodb-service:27017/todoapp' \
  simple-backend
```

Backend health check:

```bash
curl http://localhost:3000/health
```

## 5) Start Frontend

```bash
docker run -d \
  --name frontend \
  --network webapp-net \
  -p 8081:80 \
  simple-frontend
```

Open in browser:

- http://localhost:8081

## Useful Commands

Show running containers:

```bash
docker ps
```

Backend logs:

```bash
docker logs -f backend
```

Frontend logs:

```bash
docker logs -f frontend
```

MongoDB logs:

```bash
docker logs -f mongodb-service
```

## Stop and Remove Containers

```bash
docker rm -f frontend backend mongodb-service
```

Optional: remove network and volume:

```bash
docker network rm webapp-net
docker volume rm mongo-data
```

## Common Port Issues

If `3000` or `8081` is busy, change only the host side:

- Backend: `-p 3001:3000`
- Frontend: `-p 8082:80`

## Option C) Kubernetes with Minikube

This section follows the exact command flow for deploying this app to Minikube.

## Requirements

- Docker installed and running
- Minikube installed
- kubectl installed
- Enough resources for local cluster (recommended at least 2 CPU and 4 GB RAM)

Required for Ingress access:

- Enable the ingress addon before applying [k8s/ingress.yaml](k8s/ingress.yaml)

```bash
minikube addons enable ingress
```

## Kubernetes Deploy (Command Order)

Run from project root:

```bash
minikube start --driver=docker
minikube addons enable ingress
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl wait --for=condition=available --timeout=300s deployment/mongodb -n webapp
kubectl apply -f k8s/backend.yaml
kubectl wait --for=condition=available --timeout=300s deployment/backend -n webapp
kubectl apply -f k8s/frontend.yaml
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n webapp
kubectl apply -f k8s/ingress.yaml
kubectl get pods -n webapp
kubectl get services -n webapp
kubectl get deployments -n webapp
kubectl logs -l app=backend -n webapp
kubectl logs -l app=frontend -n webapp
kubectl logs -l app=mongodb -n webapp
kubectl get service frontend-service -n webapp
minikube service frontend-service -n webapp --url
```

## Quick Verify

- All deployments should show `AVAILABLE` replicas
- All pods in namespace `webapp` should be `Running` or `Completed`
- `minikube service frontend-service -n webapp --url` should print a reachable URL

## Troubleshooting

1. Namespace errors (`NotFound`)

- Ensure namespace is exactly `webapp` in [k8s/namespace.yaml](k8s/namespace.yaml).
- Re-apply namespace and retry resource apply:

```bash
kubectl apply -f k8s/namespace.yaml
```

2. Deployment stuck in `ImagePullBackOff` or `ErrImagePull`

- If manifests use `imagePullPolicy: Never`, images must exist in Minikube's Docker daemon.
- Build images in Minikube Docker environment before applying manifests:

```bash
eval "$(minikube -p minikube docker-env)"
docker build -t simple-backend ./backend
docker build -t simple-frontend ./frontend
```

3. MongoDB pod crash on older CPUs

- This repo is tested with `mongo:4.4` for compatibility on non-AVX hosts.
- Verify the MongoDB image in [k8s/mongodb.yaml](k8s/mongodb.yaml) is `mongo:4.4`.

4. `kubectl wait` times out

- Describe failing deployment and inspect events:

```bash
kubectl describe deployment mongodb -n webapp
kubectl describe deployment backend -n webapp
kubectl describe deployment frontend -n webapp
kubectl get events -n webapp --sort-by=.metadata.creationTimestamp
```

5. Service URL not opening

- Confirm service and endpoints:

```bash
kubectl get svc frontend-service -n webapp
kubectl get endpoints frontend-service -n webapp
```

- Re-run:

```bash
minikube service frontend-service -n webapp --url
```

6. Ingress not routing

- Ensure addon is enabled and ingress resource exists:

```bash
minikube addons enable ingress
kubectl get ingress -n webapp
kubectl describe ingress -n webapp
```

7. Backend cannot connect to MongoDB

## GitHub Actions CI/CD pipeline

The repository includes a workflow at [/.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml) that:

- Builds the backend and frontend Docker images
- Pushes images to Docker Hub on pushes to `main`
- Starts Minikube and applies the Kubernetes manifests

Required GitHub secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

The workflow publishes images as `simple-backend` and `simple-frontend` locally, and as `DOCKERHUB_USERNAME/simple-backend` and `DOCKERHUB_USERNAME/simple-frontend` in Docker Hub.

- Check backend env/config points to service name `mongodb-service` in same namespace.
- Inspect backend logs:

```bash
kubectl logs -l app=backend -n webapp
```

8. Start clean and redeploy

```bash
kubectl delete -f k8s/ingress.yaml --ignore-not-found
kubectl delete -f k8s/frontend.yaml --ignore-not-found
kubectl delete -f k8s/backend.yaml --ignore-not-found
kubectl delete -f k8s/mongodb.yaml --ignore-not-found
kubectl apply -f k8s/namespace.yaml
```
