param(
    [switch]$Provision
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectPath = "D:\devops-k8s-project"
Set-Location $projectPath

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Title,

        [Parameter(Mandatory = $true)]
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Title" -ForegroundColor Cyan
    & $Command
}

function Invoke-Vagrant {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & vagrant @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed: vagrant $($Arguments -join ' ')"
    }
}

Invoke-Step "Starting Jenkins VM" {
    Invoke-Vagrant @("up", "jenkins", "--no-provision")
}

Invoke-Step "Starting Ansible VM" {
    Invoke-Vagrant @("up", "ansible", "--no-provision")
}

Invoke-Step "Starting k8s VM" {
    Invoke-Vagrant @("up", "k8s", "--no-provision")
}

Invoke-Step "Current VM status" {
    Invoke-Vagrant @("status")
}

if ($Provision) {
    Invoke-Step "Provisioning Jenkins VM" {
        Invoke-Vagrant @("provision", "jenkins")
    }

    Invoke-Step "Provisioning Ansible VM" {
        Invoke-Vagrant @("provision", "ansible")
    }

    Invoke-Step "Provisioning k8s VM" {
        Invoke-Vagrant @("provision", "k8s")
    }
}

Invoke-Step "Checking or starting Minikube inside k8s VM" {
    Invoke-Vagrant @("ssh", "k8s", "-c", "timeout 20s minikube status >/dev/null 2>&1 && echo 'Minikube is already running.' || minikube start --driver=docker --force")
}

Invoke-Step "Starting app port forwards if they are installed" {
    Invoke-Vagrant @("ssh", "k8s", "-c", "sudo systemctl start grafana-port-forward.service 2>/dev/null || true; sudo systemctl start wordpress-port-forward.service 2>/dev/null || true; systemctl is-active grafana-port-forward.service wordpress-port-forward.service 2>/dev/null || true")
}

Invoke-Step "Checking Kubernetes" {
    Invoke-Vagrant @("ssh", "k8s", "-c", "kubectl get nodes && kubectl get pods -A")
}

Invoke-Step "Checking Ansible can reach k8s" {
    Invoke-Vagrant @("ssh", "ansible", "-c", "ansible k8s -m ping")
}

Invoke-Step "Checking forwarded ports" {
    Invoke-Vagrant @("port", "jenkins")
    Invoke-Vagrant @("port", "k8s")
}

Write-Host ""
Write-Host "Lab is up." -ForegroundColor Green
Write-Host "Jenkins:   http://localhost:8080"
Write-Host "Grafana:   http://localhost:3000"
Write-Host "WordPress: http://localhost:31200"
