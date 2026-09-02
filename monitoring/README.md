# Monitoring

The K8s VM runs the `kube-prometheus-stack` Helm chart in the `monitoring`
namespace. It supplies Prometheus for metrics collection and Grafana for
dashboards. Installation and upgrades are managed by
`provision/k8s-apps.sh`.

## Access

| Component | URL |
|---|---|
| Grafana | http://localhost:3000 |
| Prometheus | http://localhost:9090 |

Grafana's username is `admin`. Retrieve its generated password without saving
it in the repository:

```powershell
vagrant ssh k8s -c "kubectl get secret -n monitoring monitoring-grafana -o jsonpath='{.data.admin-password}' | base64 -d; echo"
```

## Health checks

```powershell
vagrant ssh k8s -c "kubectl get pods,svc -n monitoring"
vagrant ssh k8s -c "kubectl get prometheus,servicemonitor,podmonitor -A"
Test-NetConnection localhost -Port 3000
Test-NetConnection localhost -Port 9090
```

Inside Grafana, the Prometheus data source should be provisioned by the Helm
chart. A basic query such as `up` should return Kubernetes targets. Useful
starter dashboards cover cluster resources, node health, namespaces, pods,
and workloads.

## Troubleshooting

- A browser connection failure usually means the VM-side port-forward service
  is inactive or the Vagrant host port is not mapped.
- Grafana `Failed to fetch` can occur while its pod is restarting or when it
  runs out of memory. Check pod status, restarts, events, and logs first.
- `no route to host 192.168.49.2` means Minikube is stopped or its internal IP
  changed. Start Minikube, then restart the port-forward services.
- Prometheus can be healthy while an application is absent from its targets.
  The application must expose metrics and have a matching `ServiceMonitor` or
  `PodMonitor` before application metrics appear.

```powershell
vagrant ssh k8s -c "minikube status"
vagrant ssh k8s -c "kubectl get pods -n monitoring"
vagrant ssh k8s -c "kubectl get events -n monitoring --sort-by=.lastTimestamp"
vagrant ssh k8s -c "sudo systemctl status grafana-port-forward prometheus-port-forward --no-pager"
```

Do not store Grafana passwords or exported Kubernetes secrets in Git.
