<#
  Concede a un usuario permisos de PROPIETARIO (Owner) del proyecto GCP/Firebase,
  para que pueda gestionar toda la app (Cloud Run, Firestore, Hosting, IAM…).

  Requisitos: gcloud instalado y autenticado como un Owner actual del proyecto.

  Uso:
    .\scripts\grant-access.ps1 -User romeret08@gmail.com
#>

param(
  [string]$Project = "fmeta-f9aed",
  [Parameter(Mandatory = $true)][string]$User
)

$ErrorActionPreference = "Stop"

Write-Host "==> Concediendo roles/owner a $User en $Project" -ForegroundColor Cyan
gcloud projects add-iam-policy-binding $Project `
  --member="user:$User" `
  --role="roles/owner" `
  --condition=None

Write-Host "==> Hecho. Permisos actuales de $User:" -ForegroundColor Green
gcloud projects get-iam-policy $Project `
  --flatten="bindings[].members" `
  --filter="bindings.members:user:$User" `
  --format="value(bindings.role)"

# Nota: roles/owner es el máximo nivel. Si prefieres mínimo privilegio para
# gestionar la app sin control total de IAM, usa en su lugar:
#   roles/editor  +  roles/firebase.admin  +  roles/run.admin
