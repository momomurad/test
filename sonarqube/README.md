# SonarQube Community Build

SonarQube runs with PostgreSQL in a dedicated Vagrant VM so its Java and
Elasticsearch workload does not compete with Jenkins or Minikube.

## Architecture

| Component | Address | Purpose |
|---|---|---|
| SonarQube VM | `192.168.56.40` | Server address reachable from Jenkins |
| Windows browser | `http://localhost:9000` | SonarQube web interface |
| PostgreSQL | Compose-private network | Persistent SonarQube database |

The VM uses 2 vCPU and 4 GB RAM. The Compose project stores PostgreSQL,
SonarQube data, extensions, and logs in named Docker volumes. The database
password is generated at `/opt/sonarqube/.env` inside the VM and is not stored
in this repository.

## Start the server

The lab host should have at least 4 GB of free memory before starting this VM.
When the Ansible VM is not being used, stop it first:

```powershell
cd D:\devops-k8s-project
vagrant halt ansible
vagrant up sonarqube
```

The first start downloads the SonarQube and PostgreSQL images and can take
several minutes. Open `http://localhost:9000` after provisioning succeeds. The
initial login is `admin` / `admin`; SonarQube immediately requires a new admin
password. Do not commit that password.

## Verify

```powershell
vagrant status sonarqube
vagrant ssh sonarqube -c "curl -fsS http://localhost:9000/api/system/status"
vagrant ssh sonarqube -c "sudo docker compose --project-directory /opt/sonarqube --env-file /opt/sonarqube/.env ps"
Test-NetConnection localhost -Port 9000
```

Expected API state:

```json
{"status":"UP"}
```

## Normal operation

```powershell
vagrant halt sonarqube
vagrant up sonarqube
vagrant provision sonarqube
```

Normal halt/start operations preserve the named volumes. Do not run
`docker compose down -v`, `docker volume prune`, or `vagrant destroy sonarqube`
unless deleting the SonarQube database and analysis history is intentional.

## Jenkins integration checkpoint

After the server is healthy:

1. Change the default administrator password.
2. Use the existing SonarQube project key `devops-k8s-project` for Taskroom.
3. Reuse its existing project analysis token.
4. Save the token in Jenkins as a **Secret text** credential named
   `SonarQube` (already saved in this lab).
5. Install the **SonarQube Scanner** Jenkins plugin.
6. Configure Jenkins server `sonarqube-taskroom` with URL
   `http://192.168.56.40:9000` and credential `SonarQube`.
7. Configure the Jenkins tool `SonarScanner`, version `8.1.0.6389`, with
   automatic installation from Maven Central on first use.
8. Add a project webhook named `Jenkins Taskroom quality gate` targeting
   `http://192.168.56.10:8080/sonarqube-webhook/` (trailing slash required).
9. The Taskroom Jenkinsfile runs analysis and waits for the quality gate
   before building/pushing images. Rollback skips these stages.

The scanner definition and webhook are configured. First analysis, token
authentication, and webhook delivery still need verification in a Jenkins
build after the repository changes are committed and pushed. The separate
`taskroom` SonarQube project is unused and has been left intact.

Keep the token in Jenkins credentials. Never put it in the Jenkinsfile,
`sonar-project.properties`, Compose files, or Git.
