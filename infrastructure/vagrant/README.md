# Vagrant infrastructure

The canonical Vagrant configuration remains at the repository root:
`D:\devops-k8s-project\Vagrantfile`. Keeping it there lets standard Vagrant
commands work without an extra `--chdir` option.

## Virtual machines

| VM | Private IP | Resources | Purpose |
|---|---|---|---|
| `jenkins` | `192.168.56.10` | 2 CPU, 2 GB RAM | CI/CD server |
| `ansible` | `192.168.56.20` | 2 CPU, 2 GB RAM | Configuration control node |
| `k8s` | `192.168.56.30` | 3 CPU, 6 GB RAM | Docker and Minikube host |

The base image is `bento/ubuntu-22.04`. The K8s VM enables nested hardware
virtualization and starts Minikube with the Docker driver.

## Common commands

Run these from `D:\devops-k8s-project`:

```powershell
vagrant validate
vagrant status
vagrant up <jenkins|ansible|k8s>
vagrant provision <jenkins|ansible|k8s>
vagrant reload k8s
vagrant ssh <jenkins|ansible|k8s>
vagrant port k8s
```

Use `vagrant reload k8s` after changing its CPU or memory settings. Use
`vagrant provision k8s` after changing its software provisioning.

## Network access

| Host port | Service |
|---:|---|
| 8080 | Jenkins |
| 8081 | Demo application |
| 3000 | Grafana |
| 9090 | Prometheus |
| 31200 | WordPress |

Vagrant forwards these Windows host ports to listeners in the VMs. Kubernetes
services that use `ClusterIP` also require the corresponding persistent
port-forward service inside the K8s VM.

## Safety

- Do not edit `.vagrant/` manually.
- Do not run `vagrant destroy` unless VM deletion is explicitly intended.
- Do not run `minikube delete` unless Kubernetes data deletion is intended.
- Never commit SSH private keys, application passwords, or Kubernetes secrets.
- Treat `Vagrantfile.txt` and `Vagrantfile.patch` as legacy references, not
  executable configuration.
