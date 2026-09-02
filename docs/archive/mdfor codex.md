# Automated Cloud-Native Delivery Platform (DevOps Lab)

## Architecture Overview
* **Host Machine:** Ryzen 7 5700, 32 GB RAM, RTX 3070, running Windows with Vagrant/VirtualBox.
* **Virtual Machines (8 GB RAM / 6 vCPUs Total):**
  * **Jenkins (2 CPU / 2 GB RAM):** CI/CD automation server running Java 21 and Jenkins 2.x.
  * **Ansible (2 CPU / 2 GB RAM):** Configuration management controller.
  * **Kubernetes/Minikube (3 CPU / 6 GB RAM):** Target deployment environment hosting WordPress, MariaDB, Prometheus, and Grafana.

## Prerequisites & Setup
* Oracle VirtualBox and Vagrant 2.4.9 installed.
* Hardware virtualization (SVM/AMD-V) enabled in BIOS.

## Core Build & Execution Steps
1. Navigate to project root:
   ```bash
   cd D:\devops-k8s-project
   ```
2. Start or reload the environment:
   ```bash
   vagrant up
   vagrant reload k8s
   ```
3. Run configuration provisioning:
   ```bash
   vagrant provision ansible
   vagrant provision k8s
   ```

## Accessing Services & Credentials
* **Jenkins:** `http://localhost:8080`
  * Initial password command: `vagrant ssh jenkins -c "sudo cat /var/lib/jenkins/secrets/initialAdminPassword"`
* **WordPress:** `http://localhost:31200`
* **Grafana Dashboard:** Port forwarded via host configuration. Username: `admin`
