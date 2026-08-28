Set-Location "D:\devops-k8s-project"
Write-Host "Starting DevOps Lab VMs..." -ForegroundColor Green
vagrant up --no-provision

Write-Host "Verifying Minikube & Kubernetes status..." -ForegroundColor Yellow
vagrant ssh k8s -c "minikube status; kubectl get nodes"
