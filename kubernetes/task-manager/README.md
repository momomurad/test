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
