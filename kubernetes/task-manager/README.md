# Taskroom Kubernetes Deployment

These manifests deploy Taskroom to Minikube in the `task-manager` namespace.

Commit and push the frontend `nginx.conf` change first, then let Jenkins rebuild
and push the latest UI image. The Kubernetes frontend uses the `backend` Service
name for `/api/` traffic.

Create the database password as a Kubernetes Secret before applying the app:

```bash
kubectl create namespace task-manager --dry-run=client -o yaml | kubectl apply -f -
kubectl -n task-manager create secret generic task-manager-db \
  --from-literal=password='change-this-local-password' \
  --dry-run=client -o yaml | kubectl apply -f -
```

Deploy the app:

```bash
kubectl apply -f kubernetes/task-manager/namespace.yaml
kubectl apply -f kubernetes/task-manager/postgres.yaml
kubectl apply -f kubernetes/task-manager/backend.yaml
kubectl apply -f kubernetes/task-manager/frontend.yaml
kubectl apply -f kubernetes/task-manager/monitoring.yaml
kubectl apply -f kubernetes/task-manager/grafana-dashboard.yaml
kubectl apply -f kubernetes/task-manager/alerts.yaml
kubectl -n task-manager rollout status deployment/database --timeout=120s
kubectl -n task-manager rollout status deployment/backend --timeout=120s
kubectl -n task-manager rollout status deployment/frontend --timeout=120s
```

Expose the frontend from the K8s VM to Windows through the existing Vagrant
forwarded port `8083`:

```bash
sudo cp kubernetes/task-manager/task-manager-port-forward.service /etc/systemd/system/task-manager-port-forward.service
sudo systemctl daemon-reload
sudo systemctl enable --now task-manager-port-forward.service
```

Open the app from Windows:

```text
http://localhost:8083
```

## Monitoring

The backend exposes Prometheus-format metrics at `/metrics`. When the
`kube-prometheus-stack` release named `monitoring` is installed, apply
`monitoring.yaml` so Prometheus discovers the backend service:

```bash
kubectl apply -f kubernetes/task-manager/monitoring.yaml
kubectl apply -f kubernetes/task-manager/grafana-dashboard.yaml
kubectl apply -f kubernetes/task-manager/alerts.yaml
kubectl get servicemonitor -n monitoring taskroom-backend
kubectl get configmap -n monitoring taskroom-grafana-dashboard
kubectl get prometheusrule -n monitoring taskroom-alerts
```

Quick checks from the K8s VM:

```bash
curl -fsS http://$(kubectl -n task-manager get svc backend -o jsonpath='{.spec.clusterIP}'):3001/metrics | grep 'taskroom_up 1'
kubectl -n monitoring get servicemonitor taskroom-backend
```

In Prometheus or Grafana, useful starter queries are:

```promql
taskroom_up
taskroom_http_requests_total
rate(taskroom_http_requests_total[5m])
taskroom_http_request_duration_seconds_count
```

## Alert test

`alerts.yaml` defines Taskroom Prometheus alerts. To test the backend availability
alert manually, scale the backend to zero and watch Prometheus **Alerts**:

```bash
kubectl -n task-manager scale deployment/backend --replicas=0
kubectl -n task-manager get deployment backend
```

The alert `TaskroomBackendUnavailable` uses kube-state-metrics instead of
`taskroom_up == 0`, because when replicas are scaled to zero the scraped
`taskroom_up` series can disappear and return no data.

Restore the backend after the test:

```bash
kubectl -n task-manager scale deployment/backend --replicas=1
kubectl -n task-manager rollout status deployment/backend --timeout=120s
```
