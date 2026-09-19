# Taskroom rebuild from scratch guide

Use this guide before moving the lab to cloud. The goal is to rebuild the same
working story in a clean project and prove each layer before adding the next
one.

Current proven story:

```text
GitHub change
-> Jenkins
-> backend tests
-> frontend build
-> SonarQube analysis
-> SonarQube quality gate
-> Docker image build
-> Docker Hub push
-> SSH deploy to Minikube
-> Kubernetes rollout checks
-> frontend/API/metrics smoke test
```

## Rules for the rebuild

- Use a new folder and a new GitHub repository.
- Do not copy `.vagrant/`, `.env`, kubeconfigs, Jenkins secrets, SSH private
  keys, Docker credentials, SonarQube tokens, or exported Kubernetes secrets.
- Commit after every verified phase.
- Keep the old repo open only as a reference.
- Fix one layer at a time: app, container, Kubernetes, Jenkins, monitoring,
  rollback, SonarQube.
- Do not add Jenkins deployment until manual Kubernetes deployment works.
- Do not add SonarQube until Jenkins can already test, build, push, deploy, and
  smoke test.
- Save evidence as short text files or Obsidian notes after each checkpoint.

Suggested new names:

```text
Project folder: D:\taskroom-devops-lab
GitHub repo: taskroom-devops-lab
Jenkins job: taskroom-ci
Kubernetes namespace: task-manager
Docker Hub images:
  <dockerhub-user>/task-manager-api
  <dockerhub-user>/task-manager-ui
SonarQube project key: taskroom-devops-lab
```

Replace `<dockerhub-user>` with your Docker Hub username.

## Phase 0 - Prepare the workstation

Install or confirm:

- Windows 11
- Git
- PowerShell
- Vagrant
- Oracle VirtualBox
- Docker Desktop
- A GitHub account
- A Docker Hub account

Check from PowerShell:

```powershell
git --version
vagrant --version
VBoxManage --version
docker version
```

Checkpoint:

```text
All tools return versions.
Docker Desktop is running.
Virtualization is enabled in BIOS.
```

## Phase 1 - Create the new repo

```powershell
cd D:\
mkdir taskroom-devops-lab
cd taskroom-devops-lab
git init
```

Create the basic structure:

```text
apps/task-manager/
kubernetes/task-manager/
provision/
scripts/
sonarqube/
docs/
```

Add a `.gitignore` before adding app files:

```gitignore
.vagrant/
.env
*.pem
*.key
id_rsa
id_ed25519
*.kubeconfig
node_modules/
dist/
.scannerwork/
```

Create the empty GitHub repository, then connect it:

```powershell
git remote add origin https://github.com/<github-user>/taskroom-devops-lab.git
git add .
git commit -m "start taskroom devops lab"
git branch -M main
git push -u origin main
```

Checkpoint:

```text
New repo exists on GitHub.
No secret files are tracked.
```

Useful check:

```powershell
git status --short
git ls-files | Select-String -Pattern "\.env|id_rsa|id_ed25519|kubeconfig|\.vagrant"
```

The second command should return nothing.

## Phase 2 - Build the app locally

Create Taskroom as a small but real full-stack app:

- React frontend.
- Express backend.
- PostgreSQL database.
- CRUD for tasks.
- Input validation.
- `/api/health`.
- `/api/ready`.
- `/metrics`.
- Real backend tests that use PostgreSQL.
- `compose.yaml`.
- `.env.example`.

Run from the app folder:

```powershell
cd D:\taskroom-devops-lab\apps\task-manager
Copy-Item .env.example .env
docker compose up -d --build --wait
docker compose ps
curl.exe http://localhost:8084/api/ready
docker compose exec -T backend npm test --workspace=backend
```

Open:

```text
http://localhost:8084
```

Checkpoint:

```text
Frontend loads from Windows.
API readiness returns {"status":"ready"}.
Backend tests pass against PostgreSQL.
Data survives backend/database restart.
```

Commit:

```powershell
git add apps/task-manager .gitignore
git commit -m "add local task manager stack"
git push
```

Do not continue until the local app works.

## Phase 3 - Add the Vagrant VMs

Create the root `Vagrantfile`.

Recommended VM layout:

| VM | IP | Purpose | Suggested resources |
|---|---|---|---|
| `jenkins` | `192.168.56.10` | CI/CD server | 2 CPU, 2 GB RAM |
| `ansible` | `192.168.56.20` | Optional automation controller | 2 CPU, 2 GB RAM |
| `k8s` | `192.168.56.30` | Minikube/Kubernetes | 4 CPU, 8 GB RAM |
| `sonarqube` | `192.168.56.40` | SonarQube server | 2 CPU, 4 GB RAM |

Forward these ports:

| Host URL | VM target | Purpose |
|---|---|---|
| `http://localhost:8080` | Jenkins VM `8080` | Jenkins |
| `http://localhost:8083` | K8s VM `8083` | Taskroom on Kubernetes |
| `http://localhost:3000` | K8s VM `3000` | Grafana |
| `http://localhost:9090` | K8s VM `9090` | Prometheus |
| `http://localhost:9000` | SonarQube VM `9000` | SonarQube |

Start one VM at a time:

```powershell
cd D:\taskroom-devops-lab
vagrant validate
vagrant up jenkins
vagrant up k8s
```

Only start `ansible` and `sonarqube` when needed. SonarQube uses memory, so it
is fine to keep `ansible` halted while using SonarQube.

Checkpoint:

```powershell
vagrant status
Test-NetConnection localhost -Port 8080
vagrant ssh k8s -c "minikube status; kubectl get nodes"
```

Expected:

```text
Jenkins reachable on localhost:8080.
Minikube node is Ready.
```

Commit:

```powershell
git add Vagrantfile provision scripts infrastructure docs
git commit -m "add local vm lab infrastructure"
git push
```

## Phase 4 - Prepare Kubernetes manually

Create the Kubernetes manifests before touching Jenkins deployment:

```text
kubernetes/task-manager/namespace.yaml
kubernetes/task-manager/postgres.yaml
kubernetes/task-manager/backend.yaml
kubernetes/task-manager/frontend.yaml
kubernetes/task-manager/task-manager-port-forward.service
```

Inside the K8s VM:

```bash
kubectl create namespace task-manager --dry-run=client -o yaml | kubectl apply -f -
kubectl -n task-manager create secret generic task-manager-db \
  --from-literal=password='change-this-local-password' \
  --dry-run=client -o yaml | kubectl apply -f -
```

From the repo root inside the K8s VM or synced `/vagrant` folder:

```bash
kubectl apply -f kubernetes/task-manager/namespace.yaml
kubectl apply -f kubernetes/task-manager/postgres.yaml
kubectl apply -f kubernetes/task-manager/backend.yaml
kubectl apply -f kubernetes/task-manager/frontend.yaml
kubectl -n task-manager rollout status deployment/database --timeout=120s
kubectl -n task-manager rollout status deployment/backend --timeout=120s
kubectl -n task-manager rollout status deployment/frontend --timeout=120s
```

Install the frontend port-forward service on the K8s VM:

```bash
sudo cp /vagrant/kubernetes/task-manager/task-manager-port-forward.service /etc/systemd/system/task-manager-port-forward.service
sudo systemctl daemon-reload
sudo systemctl enable --now task-manager-port-forward.service
sudo systemctl status task-manager-port-forward.service --no-pager
```

Checkpoint:

```bash
kubectl -n task-manager get pods
curl -fsSI http://localhost:8083
curl -fsS http://localhost:8083/api/ready
```

Expected:

```text
All pods 1/1 Running.
Frontend returns HTTP 200.
Backend readiness returns {"status":"ready"}.
Windows http://localhost:8083 opens the app.
```

Commit:

```powershell
git add kubernetes/task-manager apps/task-manager
git commit -m "add taskroom kubernetes deployment"
git push
```

## Phase 5 - Add Jenkins CI without deployment

Install/configure Jenkins first:

- Unlock Jenkins.
- Install suggested plugins.
- Install NodeJS plugin.
- Configure NodeJS tool named `node24`.
- Confirm Docker works for the Jenkins user.

Create Jenkins job:

```text
Name: taskroom-ci
Type: Pipeline
SCM: Git
Repository: https://github.com/<github-user>/taskroom-devops-lab.git
Branch: main
Script Path: apps/task-manager/Jenkinsfile
```

Start the first Jenkinsfile with only:

- checkout from SCM
- `node --version`
- `npm ci`
- backend tests
- frontend build

Checkpoint:

```text
Jenkins run ends with Finished: SUCCESS.
No Docker push or Kubernetes deploy yet.
```

Commit:

```powershell
git add apps/task-manager/Jenkinsfile
git commit -m "add taskroom jenkins test pipeline"
git push
```

## Phase 6 - Add Docker image build and push

Create Docker Hub credentials in Jenkins:

```text
Credential type: Username with password
ID: docker-creds
Username: <dockerhub-user>
Password: Docker Hub token or password
```

Add image names to the Jenkinsfile:

```groovy
API_IMAGE = '<dockerhub-user>/task-manager-api'
UI_IMAGE = '<dockerhub-user>/task-manager-ui'
```

Build images from the Taskroom root context:

```bash
docker build -f backend/Dockerfile -t <dockerhub-user>/task-manager-api:<tag> .
docker build -f frontend/Dockerfile -t <dockerhub-user>/task-manager-ui:<tag> .
```

Checkpoint:

```text
Jenkins builds both images.
Jenkins pushes both version tags and latest tags to Docker Hub.
Docker Hub shows the images.
```

Commit:

```powershell
git add apps/task-manager/Jenkinsfile
git commit -m "add docker image publish pipeline"
git push
```

## Phase 7 - Connect Jenkins to Minikube

Create a Jenkins-to-K8s SSH key on the Jenkins VM:

```bash
sudo -u jenkins mkdir -p /var/lib/jenkins/.ssh
sudo -u jenkins ssh-keygen -t ed25519 -N "" -f /var/lib/jenkins/.ssh/k8s_deploy_key
sudo cat /var/lib/jenkins/.ssh/k8s_deploy_key.pub
```

On the K8s VM, append that public key to:

```bash
~/.ssh/authorized_keys
```

Fix permissions:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

Test from Jenkins VM:

```bash
sudo -u jenkins ssh -i /var/lib/jenkins/.ssh/k8s_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  -o IdentitiesOnly=yes \
  vagrant@192.168.56.30 'hostname; kubectl get nodes'
```

Checkpoint:

```text
The Jenkins service account can SSH to the K8s VM and run kubectl.
```

Then add deploy stages to Jenkins:

- copy `kubernetes/task-manager/*.yaml` to `/tmp/task-manager-k8s`
- apply manifests from the K8s VM
- set backend/frontend image tags
- wait for rollouts
- smoke test frontend, readiness, and metrics

Checkpoint:

```text
Jenkins deploys automatically to Minikube.
Windows http://localhost:8083 shows the new app version.
Jenkins ends with Finished: SUCCESS.
```

Commit:

```powershell
git add apps/task-manager/Jenkinsfile kubernetes/task-manager
git commit -m "deploy taskroom to minikube from jenkins"
git push
```

## Phase 8 - Add monitoring

Prerequisite: Prometheus/Grafana are running in Minikube. If using
`kube-prometheus-stack`, keep the release name `monitoring`.

Add:

```text
kubernetes/task-manager/monitoring.yaml
kubernetes/task-manager/grafana-dashboard.yaml
kubernetes/task-manager/alerts.yaml
```

Apply manually first:

```bash
kubectl apply -f kubernetes/task-manager/monitoring.yaml
kubectl apply -f kubernetes/task-manager/grafana-dashboard.yaml
kubectl apply -f kubernetes/task-manager/alerts.yaml
```

Check:

```bash
kubectl -n monitoring get servicemonitor taskroom-backend
kubectl -n monitoring get configmap taskroom-grafana-dashboard
kubectl -n monitoring get prometheusrule taskroom-alerts
curl -fsS http://$(kubectl -n task-manager get svc backend -o jsonpath='{.spec.clusterIP}'):3001/metrics | grep 'taskroom_up 1'
```

Prometheus starter queries:

```promql
taskroom_up
rate(taskroom_http_requests_total[5m])
kube_deployment_status_replicas_available{namespace="task-manager", deployment="backend"}
```

Alert test:

```bash
kubectl -n task-manager scale deployment/backend --replicas=0
kubectl -n task-manager get deployment backend
```

Restore:

```bash
kubectl -n task-manager scale deployment/backend --replicas=1
kubectl -n task-manager rollout status deployment/backend --timeout=120s
```

Checkpoint:

```text
Prometheus graph returns taskroom_up data.
Grafana dashboard exists.
TaskroomBackendUnavailable fires during scale-to-zero and clears after recovery.
```

Commit:

```powershell
git add kubernetes/task-manager apps/task-manager
git commit -m "add taskroom monitoring and alerts"
git push
```

## Phase 9 - Practice rollback and recovery

Use a safe failure:

```bash
kubectl -n task-manager set image deployment/backend backend=<dockerhub-user>/task-manager-api:bad-test-tag
kubectl -n task-manager rollout status deployment/backend --timeout=120s
kubectl -n task-manager get pods
```

Recover with a known-good image tag:

```bash
kubectl -n task-manager set image deployment/backend backend=<dockerhub-user>/task-manager-api:<known-good-tag>
kubectl -n task-manager rollout status deployment/backend --timeout=120s
curl -fsS http://localhost:8083/api/ready
```

Important lesson:

```text
Do not run rollout undo repeatedly without checking revisions. It can switch
between good and bad revisions. Prefer --to-revision or set a known-good image.
```

Checkpoint:

```text
Bad deploy is detected.
Recovery uses a known-good image.
App/API/data return to healthy state.
The steps are documented in Obsidian.
```

## Phase 10 - Add SonarQube last

Start the SonarQube VM:

```powershell
cd D:\taskroom-devops-lab
vagrant halt ansible
vagrant up sonarqube
```

Verify:

```powershell
vagrant ssh sonarqube -c "curl -fsS http://localhost:9000/api/system/status"
Test-NetConnection localhost -Port 9000
```

Open:

```text
http://localhost:9000
```

Configure SonarQube:

- Change the default admin password.
- Create project key `taskroom-devops-lab`.
- Create a project analysis token.
- Add webhook:

```text
Name: Jenkins Taskroom quality gate
URL: http://192.168.56.10:8080/sonarqube-webhook/
Secret: empty
```

Configure Jenkins:

- Install `SonarQube Scanner for Jenkins`.
- Add Secret Text credential:

```text
ID: SonarQube
Secret: <SonarQube project token>
```

- Configure SonarQube server:

```text
Name: sonarqube-taskroom
URL: http://192.168.56.40:9000
Credential: SonarQube
```

- Configure SonarScanner tool:

```text
Name: SonarScanner
Install automatically: yes
Version: 8.1.0.6389 or the default listed version
```

Add `apps/task-manager/sonar-project.properties`:

```properties
sonar.projectKey=taskroom-devops-lab
sonar.projectName=taskroom-devops-lab
sonar.sourceEncoding=UTF-8

sonar.sources=backend/src,frontend/src
sonar.tests=backend/test
sonar.test.inclusions=backend/test/**/*.test.js

sonar.exclusions=**/node_modules/**,frontend/dist/**,**/coverage/**
```

Add Jenkins stages after tests/build and before Docker image build:

```groovy
withSonarQubeEnv(installationName: 'sonarqube-taskroom', credentialsId: 'SonarQube') {
    sh '''
        set +x
        set -eu
        export SONAR_TOKEN="$SONAR_AUTH_TOKEN"
        "$SCANNER_HOME/bin/sonar-scanner"
    '''
}
waitForQualityGate abortPipeline: true
```

Checkpoint:

```text
SonarScanner execution succeeds.
Quality gate is OK.
Jenkins continues to Docker build/push/deploy only after the gate passes.
SonarQube dashboard shows the latest analysis.
```

Commit:

```powershell
git add apps/task-manager/Jenkinsfile apps/task-manager/sonar-project.properties sonarqube provision
git commit -m "add sonarqube quality gate"
git push
```

## Phase 11 - Final proof run

Make a tiny visible frontend change:

```text
Change a color, title, or button label.
```

Then:

```powershell
git add apps/task-manager
git commit -m "verify full ci cd chain"
git push
```

Watch Jenkins.

Final proof checklist:

```text
Started by an SCM change
Backend tests pass
Frontend build passes
SonarQube analysis successful
Quality gate OK
Docker API image pushed
Docker UI image pushed
Minikube database rollout successful
Minikube backend rollout successful
Minikube frontend rollout successful
Smoke test frontend HTTP 200
Smoke test backend {"status":"ready"}
Smoke test metrics taskroom_up 1
Finished: SUCCESS
Windows http://localhost:8083 shows the visible change
```

When this passes, update Obsidian with:

- commit SHA
- image tag
- Jenkins result
- SonarQube gate result
- Kubernetes rollout result
- smoke test result
- one thing you diagnosed yourself

## What to ask another AI

Give another AI this context:

```text
I am rebuilding a local DevOps portfolio lab from scratch before moving to
cloud. The target result is a Taskroom app with React, Express, PostgreSQL,
Docker, Jenkins, Docker Hub, Minikube, Prometheus, Grafana, rollback practice,
and SonarQube quality gate.

Current desired chain:
GitHub change -> Jenkins -> backend tests -> frontend build -> SonarQube
analysis -> quality gate -> Docker Hub -> Minikube deploy -> smoke test.

Do not suggest cloud yet. Help me verify only the current phase, and do not
skip ahead until the checkpoint for that phase passes.
```

## Fast failure map

| Symptom | Likely cause | First check |
|---|---|---|
| `Dockerfile: no such file` | Wrong build context | Run build from `apps/task-manager` with `-f backend/Dockerfile .` |
| Jenkins cannot reach GitHub | Wrong repo URL or credentials | Test `git ls-remote` on Jenkins |
| Jenkins cannot run Docker | Jenkins user lacks Docker access | `sudo -u jenkins docker info` |
| Jenkins cannot SSH to K8s | Bad key or permissions | Use `IdentitiesOnly=yes`; check `authorized_keys` |
| K8s pod `ImagePullBackOff` | Bad image tag or private image auth | `kubectl describe pod` |
| Frontend works but API fails | Nginx proxy or backend service issue | `curl http://localhost:8083/api/ready` |
| Prometheus query has no data | ServiceMonitor or labels mismatch | `kubectl -n monitoring get servicemonitor taskroom-backend` |
| Alert does not fire when replicas are 0 | Query relies on missing app metric | Use kube-state-metrics deployment availability |
| SonarQube gate waits forever | Missing webhook or wrong Jenkins URL | Check SonarQube webhook delivery |
| SonarQube auth fails | Wrong Jenkins credential/token | Recreate Secret Text credential `SonarQube` |

## Done means done

The rebuild is complete only when a fresh GitHub commit automatically causes:

```text
Jenkins SUCCESS
SonarQube gate OK
Docker Hub images updated
Kubernetes deployments rolled out
Windows app works
API readiness works
Prometheus metric works
Obsidian evidence updated
```

