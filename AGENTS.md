# AGENTS.md — DevOps Multi-VM Lab

## Project Type
Vagrant + VirtualBox local infra lab (not an app monorepo). No `package.json`, `Makefile`, tests, linters, or CI workflows. Executable source of truth is `Vagrantfile:1` and `provision/k8s-apps.sh:1`.

## Structure
- `Vagrantfile` — canonical 3-VM definition (Jenkins/Ansible/K8s). Inline shell provisioners only.
- `Vagrantfile.txt` — legacy reference (Java 17 / 2023 Jenkins key / 4 GB k8s) — not used by Vagrant. Do not edit.
- `Vagrantfile.patch` — unapplied patch: Ansible pubkey sharing via `/vagrant/ansible-k8s.pub`, k8s 3vCPU/6144MB, port `3000`, `provision/k8s-apps.sh` hook. Current `Vagrantfile:88` still uses `8081/8082/8083` and no `k8s-apps.sh` hook — trust `Vagrantfile` over docs for ports.
- `provision/k8s-apps.sh` — Helm deploys (WordPress + `kube-prometheus-stack`) + `systemd` port-forwards. Only runs if wired as `k8s.vm.provision "shell", path: "provision/k8s-apps.sh"` (present only in patch).
- `start-vms.ps1:3` — `vagrant up --no-provision` then `minikube status; kubectl get nodes`.
- `DevOps_Multi_VM_Lab_Guide.md` — canonical operational guide and troubleshooting history. `gemini-code-*.md` / `mdfor codex.md` are prior prompts, not execution specs.

## Prerequisites
- Windows 11 + PowerShell, Vagrant `2.4.9`, Oracle VirtualBox, AMD SVM/AMD-V enabled in BIOS, Hyper-V/VBS disabled (VirtualBox conflict). Host in guide: Ryzen 7 5700 / 32 GB RAM.
- Base box `bento/ubuntu-22.04`. K8s VM requires `nested-hw-virt` (`Vagrantfile:100`).

## Running & Provisioning
```powershell
cd D:\devops-k8s-project
vagrant status
vagrant up                          # full provision; or start-vms.ps1 for --no-provision
vagrant provision jenkins            # re-run Jenkins provisioner only
vagrant provision ansible            # must re-run after Vagrantfile change
vagrant provision k8s                # re-run k8s provisioner
vagrant reload k8s                   # required after changing v.cpus/v.memory
vagrant ssh <jenkins|ansible|k8s>
```
- Never run `vagrant destroy` unless explicitly requested — it deletes Minikube data. Use `vagrant snapshot save/restore stable-2026-08-24` (`cheack.txt:74`).
- Jenkins key fix is `jenkins.io-2026.key` + `openjdk-21-jre` + `gpg --dearmor` to `/etc/apt/keyrings/jenkins-keyring.gpg` (`Vagrantfile:34`). Legacy 2023 key fails with `NO_PUBKEY 7198F4B714ABFC68`.

## Networking
- Private: `jenkins` `192.168.56.10`, `ansible` `192.168.56.20`, `k8s` `192.168.56.30`.
- Forwarded (current `Vagrantfile`): Jenkins `8080:8080`, k8s `8081/8082/8083`. Docs/patch reference `31200` (WordPress) and `3000` (Grafana) — only valid after applying patch/provision script.
- Ansible inventory at `/etc/ansible/hosts` on `ansible` VM (`Vagrantfile:77`): `192.168.56.30 ansible_user=vagrant ansible_ssh_private_key_file=/home/vagrant/.ssh/id_rsa`.

## Verification (no test suite)
```powershell
vagrant ssh ansible -c "ansible k8s -m ping"          # expect SUCCESS/pong — fails if patch not applied
vagrant ssh k8s -c "minikube status; kubectl get nodes"
vagrant ssh k8s -c "kubectl get pods -A"
vagrant ssh k8s -c "kubectl wait --for=condition=Ready node/minikube --timeout=120s"
Test-NetConnection localhost -Port 8080
vagrant port k8s
```
Credentials (never commit):
```bash
vagrant ssh jenkins -c "sudo cat /var/lib/jenkins/secrets/initialAdminPassword"
vagrant ssh k8s -c "kubectl get secret -n wordpress wordpress -o jsonpath='{.data.wordpress-password}' | base64 -d; echo"
vagrant ssh k8s -c "kubectl get secret -n monitoring monitoring-grafana -o jsonpath='{.data.admin-password}' | base64 -d; echo"  # user admin
```

## Gotchas
- **Ansible→K8s SSH not auto-wired** in current `Vagrantfile`: key generated on `ansible` is not authorized on `k8s`. Patch fixes via `/vagrant/ansible-k8s.pub` + `authorized_keys` injection. Until applied, manually run the `DevOps_Multi_VM_Lab_Guide.md:24` snippet.
- **Minikube does not auto-restart** after `vagrant reload`/host reboot: `vagrant ssh k8s -c "minikube start --driver=docker --force"` then verify. `no route to host 192.168.49.2` means Minikube stopped, not a network failure.
- **Port-forwards are transient** unless `systemd` services exist (`provision/k8s-apps.sh:27,41`): `grafana-port-forward.service` / `wordpress-port-forward.service` (`kubectl port-forward --address 0.0.0.0`). SSH `vagrant ssh k8s -- -L 3000:127.0.0.1:3000 -N` tunnels drop on close — prefer `forwarded_port` + systemd per `DevOps_Multi_VM_Lab_Guide.md:93`.
- **Memory**: k8s VM at `4096` MB OOMs with monitoring; bump to `6144` (`Vagrantfile:99`) before `kube-prometheus-stack`. Verify with `free -m`.
- **Idempotency**: Jenkins provisioner removes stale `jenkins.list`/keyrings first (`Vagrantfile:27`). Safe to re-run `vagrant provision`.
- Do not edit `.vagrant/` by hand. `skills-lock.json` and `.agents/skills/` are unrelated to infra — ignore.

# CRITICAL RULES - MUST FOLLOW

## RESPONSES

- Keep responses concise and to the point - unless the user asks otherwise

## PLANNING MODE

- Always ask clarifying questions
- Never assume design, tech stack or features
- Use deep-dive sub-agents to assist with research
- Use deep-dive sub-agents to review the different aspects of your plan before presenting to the user

## CHANGE / EDIT MODE

- Never implement features yourself when possible - use sub-agents!
- Identify changes from the plan that can be implemented in parallel, and use sub-agents to implement the features efficiently
- When using sub-agents to implement features, act as a coordinator only
- Use the best model for the task - premium models for complex tasks (like coding) and mid-tier models for simpler tasks, like documentation
- After completing features (large or small), always run commands like lint, type check and next build to check code quality

## DATABASE SCHEMA CHANGES

- Whenever you make changes to the database schema, ALWAYS run the drizzle generate and migrate commands
- NEVER run drizzle push!

## TESTING

- Use any testing tools, libraries available to the project for testing your changes
- Never assume your changes simply work, always test!
- If the project does not have any testing tools, scripts, MCP tools, skills, etc. available for testing, ask the user whether testing should be skipped.

## UI DESIGN

- Always follow the UI design system when creating or reviewing components or pages.
- Design System: @DESIGN.md