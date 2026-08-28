# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "bento/ubuntu-22.04"
  #config.ssh.pty = true

  # =========================================================================
  # 1. JENKINS SERVER VM
  # =========================================================================
config.vm.define "jenkins" do |jenkins|
    jenkins.vm.hostname = "jenkins-node"
    jenkins.vm.network "private_network", ip: "192.168.56.10"
    jenkins.vm.network "forwarded_port", guest: 8080, host: 8080, auto_correct: true

    jenkins.vm.provider "virtualbox" do |v|
      v.name = "DevOps-Jenkins"
      v.cpus = 2
      v.memory = 2048
    end

    jenkins.vm.provision "shell", inline: <<-SHELL
      set -e
      export DEBIAN_FRONTEND=noninteractive

      echo "[JENKINS] Removing stale repository and key files..."
      sudo rm -f /etc/apt/sources.list.d/jenkins.list /etc/apt/keyrings/jenkins* /usr/share/keyrings/jenkins*

      echo "[JENKINS] Updating packages and installing Java..."
      sudo apt-get update -y
      sudo apt-get install -y fontconfig openjdk-21-jre git curl wget net-tools gpg

      echo "[JENKINS] Downloading Jenkins GPG key..."
      sudo install -d -m 0755 /etc/apt/keyrings
      sudo curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key | sudo gpg --batch --yes --dearmor -o /etc/apt/keyrings/jenkins-keyring.gpg
      sudo chmod 0644 /etc/apt/keyrings/jenkins-keyring.gpg

      echo "[JENKINS] Adding Jenkins Repository..."
      echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.gpg] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

      echo "[JENKINS] Installing Jenkins..."
      sudo apt-get update -y
      sudo apt-get install -y jenkins
      sudo systemctl enable --now jenkins

      if [ ! -f /home/vagrant/.ssh/id_rsa ]; then
        sudo -u vagrant ssh-keygen -t rsa -b 4096 -N "" -f /home/vagrant/.ssh/id_rsa || true
      fi
    SHELL
  end

  # =========================================================================
  # 2. ANSIBLE CONTROLLER VM
  # =========================================================================
  config.vm.define "ansible" do |ansible|
    ansible.vm.hostname = "ansible-node"
    ansible.vm.network "private_network", ip: "192.168.56.20"

    ansible.vm.provider "virtualbox" do |v|
      v.name = "DevOps-Ansible"
      v.cpus = 2
      v.memory = 2048
    end

    ansible.vm.provision "shell", inline: <<-SHELL
      set -e
      echo "[ANSIBLE] Installing Ansible..."
      sudo apt-get update -y
      sudo apt-get install -y software-properties-common git curl sshpass net-tools python3-pip
      sudo apt-add-repository --yes --update ppa:ansible/ansible
      sudo apt-get install -y ansible

      if [ ! -f /home/vagrant/.ssh/id_rsa ]; then
        sudo -u vagrant ssh-keygen -t rsa -b 4096 -N "" -f /home/vagrant/.ssh/id_rsa || true
      fi

      sudo mkdir -p /etc/ansible
      cat <<'EOF' | sudo tee /etc/ansible/hosts
[k8s]
192.168.56.30 ansible_user=vagrant ansible_ssh_private_key_file=/home/vagrant/.ssh/id_rsa ansible_ssh_common_args='-o StrictHostKeyChecking=no'
EOF
    SHELL
  end

  # =========================================================================
  # 3. KUBERNETES / MINIKUBE TARGET VM
  # =========================================================================
  config.vm.define "k8s" do |k8s|
    k8s.vm.hostname = "k8s-node"
    k8s.vm.network "private_network", ip: "192.168.56.30"
    #k8s.vm.network "forwarded_port", guest: 3000, host: 3000, auto_correct: true
    k8s.vm.network "forwarded_port", guest: 8081, host: 8081, auto_correct: true
    k8s.vm.network "forwarded_port", guest: 8082, host: 8082, auto_correct: true
    k8s.vm.network "forwarded_port", guest: 8083, host: 8083, auto_correct: true

    k8s.vm.provider "virtualbox" do |v|
      v.name = "DevOps-K8s"
      v.cpus = 3
      v.memory = 6144
      v.customize ["modifyvm", :id, "--nested-hw-virt", "on"]
    end

    k8s.vm.provision "shell", inline: <<-SHELL
      set -e
      export DEBIAN_FRONTEND=noninteractive

      echo "[K8S] Installing Docker Engine..."
      sudo apt-get update -y
      sudo apt-get install -y ca-certificates curl gnupg lsb-release conntrack socat net-tools

      sudo install -d -m 0755 /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --batch --yes --dearmor -o /etc/apt/keyrings/docker.gpg
      sudo chmod 0644 /etc/apt/keyrings/docker.gpg
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

      sudo apt-get update -y
      sudo apt-get install -y docker-ce docker-ce-cli containerd.io
      sudo usermod -aG docker vagrant

      echo "[K8S] Installing kubectl & Minikube..."
      curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
      sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

      curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
      sudo install minikube-linux-amd64 /usr/local/bin/minikube

      echo "[K8S] Starting Minikube cluster..."
      sudo -u vagrant minikube start --driver=docker --force
    SHELL
  end

end
