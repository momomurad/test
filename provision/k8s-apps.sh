#!/usr/bin/env bash
set -euo pipefail

if ! command -v helm >/dev/null 2>&1; then
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

export KUBECONFIG=/home/vagrant/.kube/config
until sudo -u vagrant kubectl get nodes >/dev/null 2>&1; do sleep 5; done

sudo -u vagrant minikube addons enable metrics-server
sudo -u vagrant helm repo add bitnami https://charts.bitnami.com/bitnami
sudo -u vagrant helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
sudo -u vagrant helm repo update

sudo -u vagrant helm upgrade --install wordpress bitnami/wordpress \
  --namespace wordpress --create-namespace \
  --set service.type=ClusterIP \
  --set persistence.size=2Gi \
  --set mariadb.primary.persistence.size=4Gi

sudo -u vagrant helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --set alertmanager.enabled=false \
  --set prometheus.prometheusSpec.retention=3d \
  --set grafana.resources.requests.memory=256Mi \
  --set grafana.resources.limits.memory=768Mi

sudo tee /etc/systemd/system/wordpress-port-forward.service >/dev/null <<'UNIT'
[Unit]
Description=WordPress port forward
After=network-online.target
[Service]
User=vagrant
Environment=KUBECONFIG=/home/vagrant/.kube/config
ExecStart=/usr/local/bin/kubectl -n wordpress port-forward --address 0.0.0.0 service/wordpress 31200:80
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
UNIT

sudo tee /etc/systemd/system/grafana-port-forward.service >/dev/null <<'UNIT'
[Unit]
Description=Grafana port forward
After=network-online.target
[Service]
User=vagrant
Environment=KUBECONFIG=/home/vagrant/.kube/config
ExecStart=/usr/local/bin/kubectl -n monitoring port-forward --address 0.0.0.0 service/monitoring-grafana 3000:80
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now wordpress-port-forward grafana-port-forward
