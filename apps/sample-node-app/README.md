# Sample Node App

This is the Level 1 demo app for the local DevOps lab.

The goal is to learn the flow manually before Jenkins automates it:

1. Run the app locally.
2. Build a Docker image.
3. Load the image into Minikube.
4. Deploy it to Kubernetes.
5. Expose it through the K8s VM and Vagrant port forwarding.
6. Check the health endpoint.

## App Endpoints

- `/` returns app information.
- `/health` returns a simple health check.

The app listens on port `3001` to avoid conflicting with Grafana on port `3000`.

## Run Locally

```powershell
cd D:\devops-k8s-project\apps\sample-node-app
npm install
npm test
npm start
```

Open:

```text
http://localhost:3001
http://localhost:3001/health
```

## Deploy To Minikube Manually

From PowerShell:

```powershell
cd D:\devops-k8s-project
vagrant ssh k8s
```

Inside the k8s VM:

```bash
cd /vagrant/apps/sample-node-app
eval "$(minikube docker-env)"
docker build -t sample-node-app:local .
cd /vagrant
kubectl create namespace demo --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f kubernetes/sample-node-app/
kubectl rollout status deployment/sample-node-app -n demo
kubectl get pods -n demo
kubectl port-forward --address 0.0.0.0 -n demo service/sample-node-app 8081:80
```

Keep the last command running. It listens on port `8081` in the K8s VM, and
Vagrant forwards Windows port `8081` to it.

Open from Windows:

```text
http://localhost:8081
http://localhost:8081/health
```

## Clean Up

Inside the k8s VM:

```bash
kubectl delete namespace demo
```
