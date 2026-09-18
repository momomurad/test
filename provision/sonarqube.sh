#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "[SONARQUBE] Configuring Linux limits..."
cat >/etc/sysctl.d/99-sonarqube.conf <<'SYSCTL'
vm.max_map_count=524288
fs.file-max=131072
SYSCTL
sysctl --system >/dev/null

echo "[SONARQUBE] Installing Docker Engine and Compose..."
apt-get update -y
apt-get install -y ca-certificates curl gnupg openssl

install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --batch --yes --dearmor -o /etc/apt/keyrings/docker.gpg
chmod 0644 /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  >/etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
usermod -aG docker vagrant

echo "[SONARQUBE] Preparing persistent configuration..."
install -d -m 0750 /opt/sonarqube
install -m 0644 /vagrant/sonarqube/compose.yaml /opt/sonarqube/compose.yaml

if [ ! -f /opt/sonarqube/.env ]; then
  umask 077
  sonar_db_password=$(openssl rand -hex 24)
  printf 'SONAR_DB_PASSWORD=%s\n' "${sonar_db_password}" >/opt/sonarqube/.env
fi
chmod 0600 /opt/sonarqube/.env

echo "[SONARQUBE] Starting SonarQube Community Build and PostgreSQL..."
docker compose \
  --project-directory /opt/sonarqube \
  --env-file /opt/sonarqube/.env \
  up -d

echo "[SONARQUBE] Waiting for the server API..."
sonarqube_ready=false
for attempt in $(seq 1 90); do
  if curl -fsS http://127.0.0.1:9000/api/system/status \
    | grep -q '"status":"UP"'; then
    sonarqube_ready=true
    break
  fi
  sleep 5
done

if [ "${sonarqube_ready}" != true ]; then
  echo "SonarQube did not become ready within 450 seconds."
  docker compose \
    --project-directory /opt/sonarqube \
    --env-file /opt/sonarqube/.env \
    ps
  docker compose \
    --project-directory /opt/sonarqube \
    --env-file /opt/sonarqube/.env \
    logs --tail 100 sonarqube
  exit 1
fi

echo "[SONARQUBE] SonarQube is ready on port 9000."
