# DevOps Multi-VM Lab

A local DevOps learning environment built with Vagrant, VirtualBox, Minikube,
Jenkins, Ansible, WordPress, Prometheus, Grafana, and a small Node.js demo app.
The lab is designed to practise the full path from source code to a monitored
Kubernetes deployment before moving the same ideas to cloud infrastructure.

## Architecture

```text
Windows host
  |
  +-- Jenkins VM  192.168.56.10
  +-- Ansible VM  192.168.56.20
  +-- K8s VM      192.168.56.30
        |
        +-- Minikube
              +-- sample-node-app
              +-- WordPress and MariaDB
              +-- Prometheus and Grafana
```

## Repository layout

```text
apps/sample-node-app/             Node.js demo application and Dockerfile
infrastructure/vagrant/           Vagrant-specific documentation
kubernetes/sample-node-app/       Kubernetes manifests for the demo app
monitoring/                       Monitoring documentation and future config
provision/k8s-apps.sh             WordPress and monitoring provisioning
scripts/start-vms.ps1             Starts and checks the local lab
scripts/sync-wordpress-from-xampp.ps1
                                  Imports WordPress files from XAMPP
docs/DevOps_Multi_VM_Lab_Guide.md Detailed operating and troubleshooting guide
Vagrantfile                       Canonical three-VM definition
```

## Start the lab

Prerequisites: Windows PowerShell, Vagrant, VirtualBox, AMD-V/SVM enabled, and
enough free memory for the three VMs. From PowerShell:

```powershell
cd D:\devops-k8s-project
.\scripts\start-vms.ps1
```

Use `-Provision` when the VM software or Kubernetes applications need to be
installed or updated:

```powershell
.\scripts\start-vms.ps1 -Provision
```

The manual equivalent is:

```powershell
vagrant up jenkins --no-provision
vagrant up ansible --no-provision
vagrant up k8s --no-provision
vagrant provision jenkins
vagrant provision ansible
vagrant provision k8s
```

## Access

| Service | URL |
|---|---|
| Jenkins | http://localhost:8080 |
| Demo application | http://localhost:8081 |
| Grafana | http://localhost:3000 |
| Prometheus | http://localhost:9090 |
| WordPress | http://localhost:31200 |

## Verify the lab

```powershell
vagrant status
vagrant ssh ansible -c "ansible k8s -m ping"
vagrant ssh k8s -c "minikube status; kubectl get nodes; kubectl get pods -A"
Test-NetConnection localhost -Port 8080
Test-NetConnection localhost -Port 8081
Test-NetConnection localhost -Port 3000
Test-NetConnection localhost -Port 9090
Test-NetConnection localhost -Port 31200
```

Do not use `vagrant destroy k8s` or `minikube delete` unless the Kubernetes
workloads and persistent data are intentionally being removed. Normal
`vagrant halt` and `vagrant up` preserve the VM disks.

See [the detailed lab guide](docs/DevOps_Multi_VM_Lab_Guide.md) for operations
and troubleshooting.
