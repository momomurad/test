# testjs checkpoint

Clean manifests captured from the working cluster on 2026-09-06. The files omit
runtime-generated metadata and assigned service IPs. They preserve the current
`IfNotPresent` pull policy; use a versioned image tag for subsequent releases.

Inside the K8s VM, from this folder (copy it there first if it is not shared):

```bash
kubectl apply --dry-run=server -f deployment.yaml -f service.yaml
kubectl apply -f deployment.yaml -f service.yaml
kubectl rollout status deployment/testjs -n default
sudo cp testjs-port-forward.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now testjs-port-forward.service
```

Vagrant must forward host 8082 to guest 8082. Open http://localhost:8082 on Windows.
The service maps port 5000 to app port 3001. This is the original demo checkpoint,
separate from `apps/task-manager`.
