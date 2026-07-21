# AKS Application Monitoring using Prometheus, Grafana & Alertmanager

## Overview

This document explains how to configure monitoring for a Kubernetes application deployed on Azure Kubernetes Service (AKS) using:

- Prometheus
- Grafana
- Alertmanager
- kube-state-metrics
- Node Exporter

The application architecture:

```
                 AKS Cluster
                      |
        +-------------+-------------+
        |                           |
   Application                 Monitoring
        |                           |
  +-----+------+          +---------+---------+
  |            |          |         |         |
Frontend    Backend  Prometheus Grafana Alertmanager
                |
             MongoDB
```

---

# Prerequisites

Required tools:

```bash
kubectl
helm
az cli
```

Verify AKS connection:

```bash
kubectl config current-context
```

Expected:

```
aks_cluster_2026
```

Check nodes:

```bash
kubectl get nodes
```

---

# 1. Create Monitoring Namespace

Create a separate namespace for monitoring components.

```bash
kubectl create namespace monitoring
```

Verify:

```bash
kubectl get namespaces
```

Output:

```
NAME
webapp
monitoring
```

---

# 2. Add Prometheus Helm Repository

Add Prometheus community charts:

```bash
helm repo add prometheus-community \
https://prometheus-community.github.io/helm-charts
```

Update repositories:

```bash
helm repo update
```

Verify chart:

```bash
helm search repo kube-prometheus-stack
```

---

# 3. Install Prometheus Stack

Install complete monitoring stack:

```bash
helm install monitoring \
prometheus-community/kube-prometheus-stack \
-n monitoring
```

This installs:

| Component          | Purpose                   |
| ------------------ | ------------------------- |
| Prometheus         | Metrics collection        |
| Grafana            | Visualization             |
| Alertmanager       | Alert handling            |
| Node Exporter      | Node metrics              |
| kube-state-metrics | Kubernetes object metrics |

Check installation:

```bash
kubectl get pods -n monitoring
```

---

# 4. Access Grafana

Get Grafana admin password:

```bash
kubectl get secret \
monitoring-grafana \
-n monitoring \
-o jsonpath="{.data.admin-password}" | base64 -d
```

Username:

```
admin
```

Start port forwarding:

```bash
kubectl port-forward \
svc/monitoring-grafana \
-n monitoring \
3000:80 &
```

Open:

```
http://localhost:3000
```

Login:

```
username:
admin

password:
<generated-password>
```

---

# 5. Access Prometheus

Port forward Prometheus:

```bash
kubectl port-forward \
svc/monitoring-kube-prometheus-prometheus \
-n monitoring \
9090:9090
```

Open:

```
http://localhost:9090
```

---

# 6. Grafana Dashboards

Import dashboards:

Grafana:

```
Dashboards
    |
    Import
```

Recommended dashboards:

## Kubernetes Cluster

Dashboard ID:

```
315
```

## Kubernetes Pods

Dashboard ID:

```
6417
```

## Node Exporter

Dashboard ID:

```
1860
```

---

# 7. Monitor Kubernetes Resources

## Node CPU

Prometheus query:

```promql
node_cpu_seconds_total
```

---

## Pod CPU Usage

```promql
container_cpu_usage_seconds_total
```

---

## Memory Usage

```promql
container_memory_usage_bytes
```

---

## Check Application Namespace

Application namespace:

```
webapp
```

Check pods:

```bash
kubectl get pods -n webapp
```

Example:

```
frontend-xxxxx
backend-xxxxx
mongodb-xxxxx
```

---

# 8. Application Metrics

Backend application should expose:

```
/metrics
```

Example:

```
http://backend-service:3000/metrics
```

Install Prometheus client:

```bash
npm install prom-client
```

Example Express implementation:

```javascript
const client=require('prom-client');

client.collectDefaultMetrics();


app.get('/metrics',(req,res)=>{

res.set(
'Content-Type',
client.register.contentType
);

res.end(
client.register.metrics()
);

});
```

Test:

```bash
curl backend-service:3000/metrics
```

Expected:

```
process_cpu_seconds_total
nodejs_heap_size_total_bytes
```

---

# 9. Configure ServiceMonitor

Prometheus Operator discovers services using ServiceMonitor.

Create:

```
backend-servicemonitor.yaml
```

Content:

```yaml
apiVersion: monitoring.coreos.com/v1

kind: ServiceMonitor

metadata:

  name: backend-monitor

  namespace: monitoring


spec:

  namespaceSelector:

    matchNames:

    - webapp


  selector:

    matchLabels:

      component: backend


  endpoints:

  - port: http

    path: /metrics
```

Apply:

```bash
kubectl apply -f backend-servicemonitor.yaml
```

---

# 10. Update Backend Service

Service must have named port:

```yaml
ports:

- name: http

  port: 3000

  targetPort: 3000
```

Upgrade Helm:

```bash
helm upgrade simple-webapp . \
-n webapp
```

---

# 11. MongoDB Monitoring

Deploy MongoDB exporter:

```
MongoDB
   |
mongodb-exporter
   |
Prometheus
   |
Grafana
```

MongoDB metrics:

```
connections
operations/sec
database size
memory usage
```

---

# 12. Configure Alerts

Alert flow:

```
Prometheus
      |
 Alert Rules
      |
Alertmanager
      |
Email / Teams / Slack
```

Example alert:

Create:

```
backend-alert.yaml
```

```yaml
apiVersion: monitoring.coreos.com/v1

kind: PrometheusRule


metadata:

  name: backend-alerts

  namespace: monitoring


spec:

  groups:

  - name: backend.rules


    rules:


    - alert: BackendDown


      expr:

        kube_deployment_status_replicas_available{
        namespace="webapp",
        deployment="backend"
        } == 0


      for: 5m


      labels:

        severity: critical


      annotations:

        summary:

          Backend service is down
```

Apply:

```bash
kubectl apply -f backend-alert.yaml
```

---

# 13. Verify Prometheus Targets

Open:

```
http://localhost:9090/targets
```

Expected:

```
node-exporter          UP
kube-state-metrics     UP
backend-monitor        UP
```

---

# 14. Useful Commands

## Monitoring pods

```bash
kubectl get pods -n monitoring
```

## Monitoring services

```bash
kubectl get svc -n monitoring
```

## Application pods

```bash
kubectl get pods -n webapp
```

## View logs

Prometheus:

```bash
kubectl logs prometheus-pod \
-n monitoring
```

Grafana:

```bash
kubectl logs grafana-pod \
-n monitoring
```

---

# Production Architecture

```
                 Azure Kubernetes Service

                         |
                         |

              kube-prometheus-stack

                         |

        +----------------+----------------+

        |                |                |

   Prometheus        Grafana        Alertmanager

        |

   Application Metrics

        |

Frontend
Backend
MongoDB

```

---

# Benefits

- Real-time Kubernetes monitoring
- Application performance monitoring
- Node resource monitoring
- Automated alerting
- Production-ready observability
- Cloud-independent monitoring solution
