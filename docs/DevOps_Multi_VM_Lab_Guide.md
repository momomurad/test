# DevOps Multi-VM Infrastructure Lab & Portfolio Guide

## Environment & System Hardware
* **Host Machine:** AMD Ryzen 7 5700, NVIDIA RTX 3070, 32 GB RAM
* **Virtualization Provider:** Oracle VirtualBox + Vagrant 2.4.9
* **VM Architecture Overview:**
  * **Jenkins (CI/CD):** 2 vCPU / 2 GB RAM (Port `8080`)
  * **Ansible (Configuration Manager):** 2 vCPU / 2 GB RAM
  * **Kubernetes Node (Minikube):** Upgraded to 3 vCPU / 6 GB RAM (NodePort `31200`, Grafana `3000`)

---

## Phase 1: Local Vagrant Environment & SSH Hardening

### 1. Initial Provisioning & Key Fixes
* Fixed the Jenkins GPG key error during `vagrant up` by replacing the retired 2023 key with the updated 2026 release key and installing Java 21.
* Resolved Minikube cluster connection dropouts (`no route to host`) caused by host/VM reboots.

![Ansible SSH Error & Minikube Connection Issue](Screenshot%202026-08-18%20223810.png)

### 2. Ansible-to-K8s SSH Public Key Authorization Fix
To allow Ansible to manage the Kubernetes host (`ansible k8s -m ping`), the SSH public key generated on the Ansible controller was manually distributed to the Kubernetes node's `authorized_keys` file:

```powershell
# Extract public key from Ansible VM
$publicKey = (vagrant ssh ansible -c "cat /home/vagrant/.ssh/id_rsa.pub").Trim()

# Authorize key on K8s VM
vagrant ssh k8s -c "sudo install -d -m 700 -o vagrant -g vagrant /home/vagrant/.ssh; echo '$publicKey' | sudo tee -a /home/vagrant/.ssh/authorized_keys > /dev/null; sudo chown vagrant:vagrant /home/vagrant/.ssh/authorized_keys; sudo chmod 600 /home/vagrant/.ssh/authorized_keys"

# Test Ansible connectivity
vagrant ssh ansible -c "ansible k8s -m ping"
```

![Ansible SSH Key Sharing and Successful Ping Response](Screenshot%202026-08-18%20224228.png)

---

## Phase 2: Workload & Monitoring Deployment

### 1. Resource Reallocation
Before deploying workloads, the Kubernetes VM memory allocation in the `Vagrantfile` was increased to prevent system OOM panics and Minikube overhead warnings:

```ruby
v.cpus = 3
v.memory = 6144
```

### 2. WordPress Deployment via Helm
WordPress was deployed using Helm with Bitnami charts, backing persistent storage for both the application and MariaDB database:

```bash
helm upgrade --install wordpress oci://registry-1.docker.io/bitnamicharts/wordpress \
  --namespace wordpress --create-namespace \
  --set service.type=ClusterIP \
  --set persistence.size=2Gi \
  --set mariadb.primary.persistence.size=4Gi \
  --wait --timeout 15m
```

### 3. Monitoring Stack Installation (`kube-prometheus-stack`)
The full monitoring suite (Prometheus, Grafana, Node Exporter, Kube-State-Metrics) was deployed into the `monitoring` namespace.

![Helm Monitoring Deployment](Screenshot%202026-08-21%20222222.png)

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set alertmanager.enabled=false \
  --set prometheus.prometheusSpec.retention=2d \
  --set prometheus.prometheusSpec.resources.requests.memory=512Mi \
  --set prometheus.prometheusSpec.resources.limits.memory=1Gi \
  --set grafana.resources.requests.memory=128Mi \
  --set grafana.resources.limits.memory=256Mi \
  --wait --timeout 15m
```

---

## Phase 3: Grafana Port Forwarding & Networking Solution

### 1. Transient SSH Tunnel Failure
Temporary SSH tunnels (`vagrant ssh k8s -- -L 3000:127.0.0.1:3000`) resulted in `connection reset` or `Failed to fetch` errors in web browsers when tunnels timed out.

![Grafana Connection Reset via PowerShell Check](Screenshot%202026-08-21%20224638.png)

### 2. Permanent Fix: Persistent Systemd Service & Vagrant Forwarding
To achieve a stable connection without manual SSH tunnels, a forwarded port was defined in `Vagrantfile` and managed via a systemd unit on the `k8s` node:

#### Step A: Vagrantfile Modification
```ruby
k8s.vm.network "forwarded_port", guest: 3000, host: 3000, auto_correct: true
```

#### Step B: Systemd Unit Creation (`/etc/systemd/system/grafana-port-forward.service`)
```ini
[Unit]
Description=Grafana Persistent Port Forward
After=network-online.target

[Service]
User=vagrant
Environment=KUBECONFIG=/home/vagrant/.kube/config
ExecStart=/usr/local/bin/kubectl -n monitoring port-forward --address 0.0.0.0 service/monitoring-grafana 3000:80
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now grafana-port-forward
```

---

## Phase 4: Local AI Development Integration (LM Studio & VS Code)

To assist with local code generation and codebase inspection directly within VS Code, a local LLM stack was established:

### 1. Model Hosting in LM Studio
* **Loaded Model:** `qwen/qwen2.5-coder-14b` (GGUF `Q4_K_M`)
* Running on local REST server endpoints (`http://127.0.0.1:1234`).

![LM Studio Model Library](Screenshot%202026-08-22%20175636.png)
![LM Studio Local Server Setup](Screenshot%202026-08-22%20180306.jpg)

### 2. VS Code Integration via Continue Extension
* Linked the Continue extension to LM Studio's local inference API.
* Enabled workspace-wide codebase indexing (`@codebase`) for structural project analysis.

![VS Code Workspace Setup](Screenshot%202026-08-22%20180410.png)
![Continue Extension Model Prompting](Screenshot%202026-08-22%20181315.png)
![Codebase Explanation Output](Screenshot%202026-08-22%20183004.png)

---

## Phase 5: Production & Cloud Migration Architecture

To evolve this local lab into a portfolio-grade cloud project ("Automated Cloud-Native Delivery Platform"), the following architecture is recommended:

| Layer | Local Lab Tooling | Cloud Production Target |
| :--- | :--- | :--- |
| **Infrastructure Provisioning** | Vagrant + VirtualBox | Terraform (AWS / OCI) |
| **Configuration Management** | Shell / Ansible | Ansible Roles (Cloud VM Hardening) |
| **Container Orchestration** | Minikube (Docker Driver) | K3s on Cloud Compute or Managed K8s (EKS/OKE) |
| **Continuous Integration** | Local Jenkins VM | Jenkins Pipeline / GitHub Actions |
| **Monitoring & Logging** | Kube-Prometheus-Stack | Grafana Cloud / In-cluster Prometheus |

### Target Workflow Pipeline
```text
[ Git Push ] ──> [ Jenkins Pipeline ] ──> [ Docker Build/Push ]
                                                   │
[ Terraform Cloud Infra ] ──> [ Ansible Setup ] ───┴──> [ K8s / Helm Deploy ]
```
