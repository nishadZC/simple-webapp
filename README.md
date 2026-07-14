# Simple Web App (Docker)

This project can run in two Docker modes (no Kubernete):

- Docker Compose (recommended)
- Manual docker build/run commands

It can also run on Kubernetes using Minikube (see "Option C").
A Helm chart is also included in the [helm/simple-webapp](helm/simple-webapp) directory for easier deployment on Kubernetes.

## Helm Deployment

If the `webapp` namespace does not already exist, install or upgrade the chart with:

```bash
helm upgrade --install simple-webapp ./helm/simple-webapp -n webapp --create-namespace
```

If the `webapp` namespace already exists, tell Helm not to manage the namespace resource:

```bash
helm upgrade --install simple-webapp ./helm/simple-webapp -n webapp --set namespace.create=false
```

Useful Helm commands:

```bash
helm list -n webapp
helm status simple-webapp -n webapp
helm uninstall simple-webapp -n webapp
```

To package the chart for sharing or release:

```bash
helm package helm/simple-webapp
```

## GitHub Push Checklist

Before pushing to GitHub, make sure your changes are committed:

```bash
git status
git add .
git commit -m "Add Helm chart and update docs"
git push origin main
```

If you are using a different branch, replace `main` with your branch name.

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

- If manifests use `imagePullPolicy: Always`, images exist in Minikube's Docker daemon then also it will pull.
- Build images in Minikube Docker environment before applying manifests:

```bash
eval "$(minikube -p minikube docker-env)"
docker build -t simple-backend ./backend
docker build -t simple-frontend ./frontend
```

## Helm

From the Helm chart directory, run:

```bash
helm install simple-webapp ./simple-webapp
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

# Deploy Full Stack Application on AWS EKS

This document explains the complete deployment process of a full-stack web application on Amazon EKS using Kubernetes.

Application Components:

- Frontend: React Application
- Backend: Node.js API
- Database: MongoDB
- Container Platform: Docker
- Container Orchestration: Kubernetes
- Cloud Provider: AWS EKS

## Architecture

```
                         Internet
                            |
                            |
                  AWS LoadBalancer Service
                            |
                            |
                    Frontend Service
                            |
                            |
                    Frontend Pods
                            |
                            |
                    Backend Service
                            |
                            |
                    Backend Pods
                            |
                            |
                 MongoDB ClusterIP Service
                            |
                            |
                    MongoDB Pod
```

---

# 1. Prerequisites

Install the following tools:

- AWS CLI
- kubectl
- eksctl
- Docker

Verify installation:

```bash
aws --version

kubectl version --client

eksctl version

docker --version
```

---

# 2. Configure AWS CLI

Configure AWS credentials:

```bash
aws configure
```

Provide:

```
AWS Access Key ID
AWS Secret Access Key
Default Region
Output Format
```

Verify AWS authentication:

```bash
aws sts get-caller-identity
```

# Show all contexts

kubectl config get-contexts

# Show current context

kubectl config current-context

# Switch to EKS

kubectl config use-context <eks-context></eks>

# Switch back to Minikube

kubectl config use-context minikube

# Add EKS context if missing

aws eks update-kubeconfig --region ap-south-1 --name <cluster-name></cluster>

---

# 3. Create EKS Cluster

Create a managed cluster with two worker nodes:

```bash
eksctl create cluster \
  --name webapp-cluster \
  --region ap-south-1 \
  --nodegroup-name workers \
  --node-type t3.micro \
  --nodes 8 \
  --nodes-min 8 \
  --nodes-max 8 \
  --managed \
  --with-oidc
```

Verify the cluster and node group:

```bash
kubectl get nodes
kubectl get nodes -o wide
eksctl get nodegroup --cluster webapp-cluster --region ap-south-1
```

If you need to remove the cluster later:

```bash
eksctl delete cluster --name webapp-cluster --region ap-south-1
```

---

# 4. Install the EBS CSI Driver

This is required so the MongoDB PVC can be provisioned with EBS-backed storage:

```bash
eksctl create addon \
  --cluster webapp-cluster \
  --region ap-south-1 \
  --name aws-ebs-csi-driver

kubectl get pods -n kube-system | grep ebs
kubectl get storageclass
```

---

# 5. Deploy Kubernetes Resources

Run these commands from the project root:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/storageclass.yaml
kubectl apply -f k8s/mongodb-pvc.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

Verify the deployment state:

```bash
kubectl get pvc -n webapp
kubectl get pods -n webapp
kubectl get svc -n webapp
kubectl get deployments -n webapp
kubectl get ingress -n webapp
```

---

# 6. Verify the Deployment

```bash
kubectl rollout status deployment/mongodb -n webapp --timeout=300s
kubectl rollout status deployment/backend -n webapp --timeout=300s
kubectl rollout status deployment/frontend -n webapp --timeout=300s
kubectl logs -n webapp -l app=backend
kubectl logs -n webapp -l app=frontend
kubectl logs -n webapp -l app=mongodb
```

---

# 7. Access the Frontend Application

Get the external address for the frontend service:

```bash
kubectl get svc frontend-service -n webapp
kubectl get svc frontend-service -n webapp \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}{"\\n"}'
```

If the hostname is still empty, wait a few moments and run the second command again.

---

# 8. MongoDB Configuration

```bash
kubectl get nodes
```

Check nodegroup:

```bash
eksctl get nodegroup \
--cluster webapp-cluster \
--region ap-south-1


# delete the eks cluster
eksctl delete cluster \
--name webapp-cluster \
--region ap-south-1
```

---

# 4. Verify AWS Worker Instances

Check EC2 instances created by EKS:

```bash
aws ec2 describe-instances \
--filters "Name=tag:eks:cluster-name,Values=webapp-cluster" \
--region ap-south-1 \
--query "Reservations[].Instances[].[InstanceId,State.Name,PrivateIpAddress]"
```

Check nodegroup details:

```bash
aws eks describe-nodegroup \
--cluster-name webapp-cluster \
--nodegroup-name workers \
--region ap-south-1
```

Check nodegroup status:

```bash
aws eks describe-nodegroup \
--cluster-name webapp-cluster \
--nodegroup-name workers \
--region ap-south-1 \
--query "nodegroup.status"
```

Monitor nodegroup:

```bash
watch -n 30 \
"eksctl get nodegroup --cluster webapp-cluster --region ap-south-1"
```

---

# 5. Deploy Kubernetes Resources

Deploy application resources:

```bash
kubectl apply -f namespace.yaml
kubectl get pods -n kube-system | grep ebs
kubectl get storageclass
kubectl apply -f mongodb-pvc.yaml

kubectl get pvc -n webapp

kubectl apply -f mongodb.yaml

kubectl apply -f backend.yaml

kubectl apply -f frontend.yaml
```

---

# 6. Verify Kubernetes Deployment

## Check Cluster

```bash
kubectl cluster-info
```

## Check Worker Nodes

```bash
kubectl get nodes -o wide
```

## Check Pods

```bash
kubectl get pods -n webapp
```

Detailed pod information:

```bash
kubectl get pods -n webapp -o wide
```

---

# 7. Check Deployments

```bash
kubectl get deployments -n webapp
```

---

# 8. Check Services

```bash
kubectl get svc -n webapp
```

---

# 9. Access Frontend Application

Get LoadBalancer URL:

```bash
kubectl get svc frontend-service \
-n webapp \
-o jsonpath='{.status.loadBalancer.ingress[0].hostname}{"\n"}'
```

---

# 10. MongoDB Configuration

MongoDB runs internally inside Kubernetes.

MongoDB Service:

```
mongodb-service:27017
```

Backend connection string:

```
mongodb://mongodb-service:27017/todoapp
```

Do not use:

```
mongodb://localhost:27017
```

because localhost points to the backend container itself.

---

# 11. MongoDB Troubleshooting

Check MongoDB pod:

```bash
kubectl get pods -n webapp
```

Check MongoDB logs:

```bash
kubectl logs -n webapp -l app=mongodb
```

Describe MongoDB pod:

```bash
kubectl describe pod -n webapp -l app=mongodb
```

Check MongoDB service:

```bash
kubectl describe svc mongodb-service -n webapp
```

Check endpoints:

```bash
kubectl get endpoints -n webapp
```

Expected:

```
mongodb-service   <mongodb-pod-ip>:27017
```

---

# 12. Backend Troubleshooting

Check backend logs:

```bash
kubectl logs <backend-pod-name> -n webapp
```

Example error:

```
MongooseServerSelectionError:
connect ECONNREFUSED mongodb-service:27017
```

Solution:

Restart backend after MongoDB becomes available:

```bash
kubectl rollout restart deployment backend -n webapp
```

Check logs again:

```bash
kubectl logs -f deployment/backend -n webapp
```

Expected:

```
Server is running on port 3000
MongoDB connected successfully
```

---

# 13. Pod Scheduling Issue

## Problem

MongoDB pod stuck in Pending state:

```
STATUS: Pending
```

Check pod:

```bash
kubectl describe pod <mongodb-pod-name> -n webapp
```

Error:

```
0/2 nodes are available:
Too many pods
```

## Reason

Worker nodes reached maximum pod capacity.

Check node capacity:

```bash
kubectl describe node
```

Example:

```
Allocatable:
pods: 4
```

## Solution 1: Increase Worker Nodes

```bash
eksctl scale nodegroup \
--cluster webapp-cluster \
--name workers \
--nodes 3
```

## Solution 2: Increase Instance Size

Use:

```
t3.medium
```

instead of smaller instance types.

## Solution 3: Reduce Replicas

```bash
kubectl scale deployment frontend --replicas=1 -n webapp
```

---

# 14. Deployment Rollout Troubleshooting

Check rollout:

```bash
kubectl rollout status deployment/mongodb \
-n webapp \
--timeout=300s
```

If pipeline fails:

```
deployment "mongodb" exceeded its progress deadline
```

Check:

```bash
kubectl get pods -n webapp

kubectl describe pods -n webapp

kubectl logs -n webapp -l app=mongodb
```

---

# 15. CI/CD Pipeline Deployment Verification

Pipeline uses:

```bash
kubectl rollout status deployment/mongodb -n webapp --timeout=300s

kubectl rollout status deployment/backend -n webapp --timeout=300s

kubectl rollout status deployment/frontend -n webapp --timeout=300s
```

If deployment fails, check Kubernetes events:

```bash
kubectl get events -n webapp --sort-by=.metadata.creationTimestamp
```

---

# 16. Useful Kubernetes Commands

## All Pods

```bash
kubectl get pods -A
```

## Services

```bash
kubectl get svc -n webapp
```

## Ingress

```bash
kubectl get ingress -n webapp
```

## Endpoints

```bash
kubectl get endpoints -n webapp
```

## Pod Details

```bash
kubectl describe pod <pod-name> -n webapp
```

## Logs

```bash
kubectl logs <pod-name> -n webapp
```

## Restart Deployment

```bash
kubectl rollout restart deployment <deployment-name> -n webapp
```

---

# 17. Delete Worker Node Group

Delete nodegroup:

Check CloudFormation events:

```bash
aws cloudformation describe-stack-events \
--stack-name eksctl-webapp-cluster-nodegroup-workers \
--region ap-south-1
```

---

# Final Deployment Status

Successful deployment should show:

```
Frontend   Running
Backend    Running
MongoDB    Running
Service    LoadBalancer
```

Application access:

```
http://<AWS-LOADBALANCER-DNS>
```

---

# 18. Delete EKS Cluster and Cleanup AWS Resources

This section explains how to completely remove the EKS deployment and all related AWS resources.

⚠️ **Warning:**The following steps permanently delete:

- Kubernetes applications
- Worker nodes
- Load Balancer
- EKS cluster
- AWS networking resources created by eksctl
- Associated CloudFormation stacks

---

# 18.1 Delete Application Resources

Delete the application namespace:

```bash
kubectl delete namespace webapp
```

This removes:

- Frontend Deployment
- Backend Deployment
- MongoDB Deployment
- Services
- Pods
- ConfigMaps
- Secrets inside the namespace

Verify:

```bash
kubectl get namespaces
```

---

# 18.2 Delete Kubernetes Services

Check services:

```bash
kubectl get svc -A
```

Delete LoadBalancer services manually if required:

```bash
kubectl delete svc <service-name> -n <namespace>
```

Example:

```bash
kubectl delete svc frontend-service -n webapp
```

This removes the AWS Elastic Load Balancer created by Kubernetes.

---

# 18.3 Delete Ingress Resources

Check ingress:

```bash
kubectl get ingress -A
```

Delete ingress resources:

```bash
kubectl delete ingress --all -A
```

---

# 18.4 Delete EKS Managed Node Group

Remove worker nodes:

```bash
eksctl delete nodegroup \
--cluster webapp-cluster \
--region ap-south-1 \
--name workers
```

Verify:

```bash
eksctl get nodegroup \
--cluster webapp-cluster \
--region ap-south-1
```

---

# 18.5 Delete Complete EKS Cluster

Delete the EKS cluster:

```bash
eksctl delete cluster \
--name webapp-cluster \
--region ap-south-1
```

This deletes:

- EKS Control Plane
- Managed Node Groups
- Worker EC2 Instances
- Security Groups created by eksctl
- CloudFormation stacks created by eksctl

Cluster deletion may take several minutes.

---

# 18.6 Verify Cluster Deletion

Check EKS clusters:

```bash
aws eks list-clusters \
--region ap-south-1
```

Check eksctl:

```bash
eksctl get cluster \
--region ap-south-1
```

Expected:

```
No clusters found
```

---

# 18.7 Remove Local Kubernetes Context

After deleting the cluster, remove old kubeconfig entries.

Check contexts:

```bash
kubectl config get-contexts
```

Delete cluster context:

```bash
kubectl config delete-context <context-name>
```

Delete cluster configuration:

```bash
kubectl config delete-cluster <cluster-name>
```

---

# 18.8 Verify EC2 Worker Instances Deleted

Check EC2 instances:

```bash
aws ec2 describe-instances \
--filters "Name=tag:eks:cluster-name,Values=webapp-cluster" \
--region ap-south-1 \
--query "Reservations[].Instances[].[InstanceId,State.Name]"
```

Expected:

```
No running instances
```

---

# 18.9 Verify LoadBalancer Deletion

Check AWS Load Balancers:

```bash
aws elbv2 describe-load-balancers \
--region ap-south-1
```

Verify that the Kubernetes LoadBalancer is removed.

---

# 18.10 Check CloudFormation Stacks

eksctl creates CloudFormation stacks for EKS resources.

List stacks:

```bash
aws cloudformation list-stacks \
--region ap-south-1
```

Look for:

```
eksctl-webapp-cluster-*
```

If any stack remains:

```bash
aws cloudformation delete-stack \
--stack-name <stack-name> \
--region ap-south-1
```

---

# 18.11 Final Verification

Check Kubernetes:

```bash
kubectl get nodes
```

Expected:

```
Unable to connect to the server
```

because the EKS cluster no longer exists.

Check AWS EKS:

```bash
aws eks list-clusters \
--region ap-south-1
```

Check Available API

```Shell
kubectl api-resources
```
