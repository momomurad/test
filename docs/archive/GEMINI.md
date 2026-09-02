# GEMINI.md — DevOps Multi-VM Infrastructure Lab Context

Welcome! This file provides essential context, architecture overview, key file references, usage workflows, and critical instructions for interacting with and developing in this local DevOps Multi-VM Lab workspace.

## 1. Directory Overview
This repository is a **local infrastructure lab** powered by **Vagrant** and **VirtualBox** simulating a production-like multi-node environment on an AMD Ryzen 7 5700 host machine with 32 GB RAM. It is a non-code/infrastructure project containing configuration definitions, setup scripts, and detailed guides for:
- CI/CD automation with **Jenkins**
- Configuration management with **Ansible**
- Container orchestration with a single-node **Kubernetes (Minikube)** cluster
- Automated application deployment (**WordPress** via Helm charts)
- Core observability and monitoring (**kube-prometheus-stack** featuring Prometheus and Grafana)

This directory does not contain application code (no `package.json`, `Cargo.toml`, build tools, or language-specific compiler/testing frameworks). Instead, it serves as the central control plane and documentation workspace for orchestrating virtual infrastructure.

---

## 2. Key Files

- **`Vagrantfile`**: The executable source of truth. Defines the 3 virtual machines, networking, hardware allocation, and inline shell provisioners:
  - **`jenkins`** (`192.168.56.10`): Installs Java 21, the 2026 Jenkins release key, installs and boots Jenkins, and configures SSH keypairs.
  - **`ansible`** (`192.168.56.20`): Installs Ansible and establishes an inventory entry targeting the `k8s` node.
  - **`k8s`** (`192.168.56.30`): Installs Docker, `kubectl`, `minikube` (started using the docker driver with nested virtualization enabled), and sets up host forwarded ports.
- **`provision/k8s-apps.sh`**: The post-boot provisioning script that sets up application and monitoring stacks inside Minikube:
  - Installs Helm, adds Bitnami and Prometheus repositories.
  - Installs WordPress in the `wordpress` namespace with persistent storage.
  - Installs kube-prometheus-stack in the `monitoring` namespace.
  - Configures persistent Linux systemd service units for both WordPress and Grafana (`wordpress-port-forward.service`, `grafana-port-forward.service`) to bypass transient SSH tunnel dropouts and make services available externally.
- **`DevOps_Multi_VM_Lab_Guide.md`**: The comprehensive, step-by-step user guide explaining step-by-step configuration, networking, resource tuning, troubleshooting history (such as Jenkins GPG key issues, and Grafana port forwarding solutions), and verification.
- **`AGENTS.md`**: Instruction manual and architectural blueprint for AI agents, detailing gotchas, verification, and credentials.
- **`start-vms.ps1`**: A PowerShell orchestration helper script that runs `vagrant up --no-provision` followed by minikube status and node retrieval checks.
- **`Vagrantfile.patch`**: An unapplied patch containing the public key sharing implementation (injecting `/vagrant/ansible-k8s.pub` into `authorized_keys` on the K8s node) and wiring `provision/k8s-apps.sh` as a shell provisioner.
- **`Vagrantfile.txt`**: Legacy reference configuration using older Java 17, 2023 Jenkins GPG keys, and lower resources. Do not use or edit.

---

## 3. Usage & Operational Workflows

All Vagrant, Minikube, and Ansible commands must be executed within the `/mnt/d/devops-k8s-project` directory.

### Managing the Virtual Infrastructure
* **Status**: Check running status of the lab:
  ```bash
  cd /mnt/d/devops-k8s-project
  vagrant status
  ```
* **Spin Up**: Bring up and provision the entire stack:
  ```bash
  vagrant up
  ```
* **Provision Individual Nodes**:
  ```bash
  vagrant provision jenkins
  vagrant provision ansible
  vagrant provision k8s
  ```
* **Rebooting / Resource Scaling**: After modifying VM CPUs or memory allocations (e.g., bumping K8s VM to 6144 MB), reload with:
  ```bash
  vagrant reload k8s
  ```
* **SSH Access**: Connect to any VM to perform manual maintenance:
  ```bash
  vagrant ssh <jenkins|ansible|k8s>
  ```
* **Save/Restore Lab State**: To avoid re-provisioning, save a stable VM state:
  ```bash
  vagrant snapshot save stable-state
  vagrant snapshot restore stable-state
  ```

### Ansible to Kubernetes Connectivity Verification
To verify configuration management functionality, use the `ansible` ping module against the `k8s` node:
```bash
vagrant ssh ansible -c "ansible k8s -m ping"
```
*Note: Before this works, public key authentication from the Ansible node to the K8s node must be wired either via the manual commands in the lab guide or the unapplied `Vagrantfile.patch` logic.*

### Inspecting Kubernetes Clusters
Log into the `k8s` node to inspect running Kubernetes workloads:
```bash
vagrant ssh k8s -c "kubectl get nodes"
vagrant ssh k8s -c "kubectl get pods -A"
```

---

## 4. Key Gotchas & Best Practices

1. **Minikube Node Reboots**: Minikube does not automatically resume cluster workloads after a VM reload or host reboot. If you hit connection errors, log into the K8s node and manually boot Minikube:
   ```bash
   vagrant ssh k8s -c "minikube start --driver=docker --force"
   ```
2. **Persistent Port-Forwarding**: Do not rely on transient `kubectl port-forward` background processes or `ssh -L` tunnels as they will time out and drop connections. Use the custom systemd services provided in `provision/k8s-apps.sh` which run port-forwards reliably in the background.
3. **Do Not Destroy VM Data**: Avoid `vagrant destroy` unless a complete clean build is required. Doing so destroys all Minikube volumes, WordPress databases, and Prometheus monitoring history.
4. **Vagrantfile over Guides**: Trust the port definitions and hardware settings declared in the active `Vagrantfile` as the ground-truth over potential legacy comments in Markdown files.
