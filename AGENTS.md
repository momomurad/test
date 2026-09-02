# AGENTS.md - DevOps Multi-VM Lab

## Project type

This is a local DevOps learning lab built with Vagrant, VirtualBox, Minikube,
Jenkins, Ansible, Kubernetes, Helm, WordPress, Prometheus, Grafana, and a
Node.js demo application.

## Canonical structure

- `Vagrantfile` - canonical three-VM infrastructure definition. Keep it at the
  repository root so normal Vagrant commands work from the project directory.
- `scripts/start-vms.ps1` - starts each VM, optionally provisions them, starts
  Minikube, checks Kubernetes, and verifies Ansible connectivity.
- `scripts/sync-wordpress-from-xampp.ps1` - stages and imports WordPress files.
- `provision/k8s-apps.sh` - deploys WordPress and monitoring and configures
  persistent VM-side port forwards.
- `apps/sample-node-app/` - Node.js source, package files, Dockerfile, tests,
  and application documentation.
- `kubernetes/sample-node-app/` - Kubernetes deployment and service manifests
  for the demo application.
- `monitoring/` - monitoring documentation and future declarative monitoring
  resources.
- `docs/DevOps_Multi_VM_Lab_Guide.md` - detailed operations and troubleshooting.
- `infrastructure/vagrant/README.md` - Vagrant architecture notes.

Legacy files such as `Vagrantfile.txt`, `Vagrantfile.patch`, old prompt logs,
and duplicate experiments are not executable sources of truth. Do not edit
`.vagrant/` by hand. `skills-lock.json` and `.agents/skills/` are unrelated to
the lab runtime.

## Host and virtual machines

- Host: Windows 11, PowerShell, Vagrant, and Oracle VirtualBox.
- BIOS virtualization: AMD-V/SVM enabled. Avoid Hyper-V/VBS conflicts with
  VirtualBox where applicable.
- Base box: `bento/ubuntu-22.04`.
- `jenkins`: `192.168.56.10`, 2 CPU, 2048 MB RAM.
- `ansible`: `192.168.56.20`, 2 CPU, 2048 MB RAM.
- `k8s`: `192.168.56.30`, 3 CPU, 6144 MB RAM, nested virtualization enabled.

## Service ports

- Jenkins: `http://localhost:8080`
- Demo application: `http://localhost:8081`
- Grafana: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- WordPress: `http://localhost:31200`

The Vagrant forwarded port and the VM-side listener must both exist. Kubernetes
`ClusterIP` services need a persistent `kubectl port-forward` service or
another exposure method inside the K8s VM.

## Running and provisioning

```powershell
cd D:\devops-k8s-project
.\scripts\start-vms.ps1
.\scripts\start-vms.ps1 -Provision
vagrant status
vagrant validate
vagrant provision <jenkins|ansible|k8s>
vagrant reload k8s
vagrant ssh <jenkins|ansible|k8s>
```

Run `vagrant reload k8s` after VM CPU or memory changes. Run
`vagrant provision k8s` after provisioning changes.

## Verification

There is no repository-wide test suite. Verify infrastructure in proportion to
the change:

```powershell
vagrant validate
vagrant ssh ansible -c "ansible k8s -m ping"
vagrant ssh k8s -c "minikube status; kubectl get nodes; kubectl get pods -A"
vagrant ssh k8s -c "kubectl wait --for=condition=Ready node/minikube --timeout=120s"
vagrant port k8s
Test-NetConnection localhost -Port 8080
Test-NetConnection localhost -Port 8081
Test-NetConnection localhost -Port 3000
Test-NetConnection localhost -Port 9090
Test-NetConnection localhost -Port 31200
```

For demo-app changes, also run its package tests and validate its Kubernetes
manifests according to `apps/sample-node-app/README.md`.

## Known operational details

- Ansible connects to K8s as `vagrant` using
  `/home/vagrant/.ssh/id_rsa`. The generated public key must be present in the
  K8s VM user's `authorized_keys`; verify with `ansible k8s -m ping`.
- Minikube runs with the Docker driver. `no route to host 192.168.49.2` usually
  means Minikube stopped or its internal address changed.
- The K8s VM needs 6144 MB for WordPress and the monitoring stack. Lower limits
  can cause Grafana to be OOM-killed.
- WordPress files and MariaDB data use persistent volumes. Normal VM halt/start
  preserves them, but `vagrant destroy k8s` or `minikube delete` can remove
  them.
- Jenkins uses Java 21 and the current Jenkins repository signing key. Preserve
  the idempotent cleanup of stale package-list and keyring files.

## Secrets

Never commit SSH private keys, Jenkins passwords, WordPress passwords, Grafana
passwords, SQL dumps, kubeconfigs, or exported Kubernetes secrets. Retrieve
credentials at runtime when needed.

## Critical safety rules

- Never run `vagrant destroy`, `minikube delete`, or another destructive command
  unless the user explicitly requests the exact deletion and understands the
  data impact.
- Prefer `vagrant halt`, `vagrant suspend`, and snapshots for recoverable VM
  operations.
- Preserve unrelated user changes in a dirty worktree.
- Do not edit generated state under `.vagrant/`.
- Keep responses concise unless the user asks for detailed instruction.
- Always validate changes with the relevant available checks; report any check
  that could not be run and why.
