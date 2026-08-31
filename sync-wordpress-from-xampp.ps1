param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,

    [switch]$IncludeCore
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectPath = "D:\devops-k8s-project"
$stagePath = Join-Path $projectPath "wordpress-migration\site"

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

if (-not (Test-Path -LiteralPath $SourcePath -PathType Container)) {
    throw "SourcePath does not exist or is not a folder: $SourcePath"
}

$sourceWpContent = Join-Path $SourcePath "wp-content"
if (-not (Test-Path -LiteralPath $sourceWpContent -PathType Container)) {
    throw "This does not look like a WordPress folder. Missing: $sourceWpContent"
}

Set-Location $projectPath

Invoke-Step "Staging WordPress files from XAMPP folder" {
    New-Item -ItemType Directory -Force -Path $stagePath | Out-Null

    if ($IncludeCore) {
        robocopy $SourcePath $stagePath /MIR /XD ".git" "node_modules" /XF "wp-config.php" | Out-Host
    }
    else {
        $stageWpContent = Join-Path $stagePath "wp-content"
        New-Item -ItemType Directory -Force -Path $stageWpContent | Out-Null
        robocopy $sourceWpContent $stageWpContent /MIR /XD ".git" "node_modules" | Out-Host
    }

    if ($LASTEXITCODE -gt 7) {
        throw "robocopy failed with exit code $LASTEXITCODE"
    }
}

Invoke-Step "Checking k8s VM and Minikube" {
    Invoke-Vagrant @("status", "k8s")
    Invoke-Vagrant @("ssh", "k8s", "-c", "timeout 20s minikube status >/dev/null 2>&1 || minikube start --driver=docker --force")
}

Invoke-Step "Copying files into WordPress pod" {
    $remoteCommand = @"
set -e
POD=`$(kubectl get pod -n wordpress -l app.kubernetes.io/name=wordpress -o jsonpath='{.items[0].metadata.name}')
if [ -z "`$POD" ]; then
  echo "No WordPress pod found in namespace wordpress"
  exit 1
fi
kubectl cp /vagrant/wordpress-migration/site/wp-content wordpress/`$POD:/bitnami/wordpress/wp-content
kubectl exec -n wordpress "`$POD" -- find /bitnami/wordpress/wp-content -type d -exec chmod 775 {} \;
kubectl exec -n wordpress "`$POD" -- find /bitnami/wordpress/wp-content -type f -exec chmod 664 {} \;
"@

    Invoke-Vagrant @("ssh", "k8s", "-c", $remoteCommand)
}

Write-Host ""
Write-Host "WordPress files copied." -ForegroundColor Green
Write-Host "Open: http://localhost:31200/wp-admin"
Write-Host "Reminder: the database is separate. Export it from XAMPP/phpMyAdmin, then import it into MariaDB if you need posts, pages, users, and settings."
