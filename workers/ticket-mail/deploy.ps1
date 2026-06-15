<#
  Despliega el worker de tickets (Gmail Workspace) en Cloud Run.

  Requisitos previos (una sola vez):
    1) Instalar Google Cloud SDK (gcloud).
    2) gcloud auth login
    3) gcloud auth application-default login   (opcional, para scripts admin)

  Uso:
    cd C:\Users\tecnic.si\proyectos\FMETA
    .\workers\ticket-mail\deploy.ps1 -GmailKeyPath "C:\Users\tecnic.si\Downloads\gen-lang-client-0631419177-0773ceead21c.json"

  La clave de servicio NUNCA se commitea: se guarda como secreto en Secret Manager.
#>

param(
  [string]$Project   = "fmeta-f9aed",
  [string]$Region    = "europe-west4",
  [string]$Service   = "ticket-worker",
  [string]$GmailUser = "formeta@formeta.es",
  [string]$Bucket    = "fmeta-f9aed.firebasestorage.app",
  [Parameter(Mandatory = $true)][string]$GmailKeyPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $GmailKeyPath)) { throw "No se encuentra la clave Gmail: $GmailKeyPath" }

Write-Host "==> Proyecto $Project / región $Region" -ForegroundColor Cyan
gcloud config set project $Project | Out-Null

Write-Host "==> Habilitando APIs necesarias" -ForegroundColor Cyan
gcloud services enable run.googleapis.com cloudbuild.googleapis.com `
  secretmanager.googleapis.com artifactregistry.googleapis.com containerregistry.googleapis.com

# --- Secreto con la clave del service account de Gmail ---
Write-Host "==> Creando/actualizando secreto GMAIL_SERVICE_ACCOUNT_JSON" -ForegroundColor Cyan
$exists = (gcloud secrets list --filter="name:GMAIL_SERVICE_ACCOUNT_JSON" --format="value(name)" 2>$null)
if (-not $exists) {
  gcloud secrets create GMAIL_SERVICE_ACCOUNT_JSON --replication-policy=automatic | Out-Null
}
gcloud secrets versions add GMAIL_SERVICE_ACCOUNT_JSON --data-file="$GmailKeyPath" | Out-Null

# --- Service account de runtime del worker ---
$SaName  = "ticket-worker"
$SaEmail = "$SaName@$Project.iam.gserviceaccount.com"
$saExists = (gcloud iam service-accounts list --filter="email:$SaEmail" --format="value(email)" 2>$null)
if (-not $saExists) {
  Write-Host "==> Creando service account $SaEmail" -ForegroundColor Cyan
  gcloud iam service-accounts create $SaName --display-name="Ticket worker" | Out-Null
}

Write-Host "==> Concediendo permisos al runtime (Firestore, Storage, Secret, firma de URLs)" -ForegroundColor Cyan
foreach ($role in @("roles/datastore.user","roles/storage.objectAdmin","roles/secretmanager.secretAccessor","roles/iam.serviceAccountTokenCreator")) {
  gcloud projects add-iam-policy-binding $Project --member="serviceAccount:$SaEmail" --role=$role --condition=None | Out-Null
}

# --- Build del contenedor ---
Write-Host "==> Construyendo imagen con Cloud Build" -ForegroundColor Cyan
gcloud builds submit --config workers/ticket-mail/cloudbuild.yaml .

# --- Deploy en Cloud Run (worker always-on: min 1, CPU siempre asignada) ---
Write-Host "==> Desplegando en Cloud Run" -ForegroundColor Cyan
gcloud run deploy $Service `
  --image "gcr.io/$Project/ticket-worker:latest" `
  --region $Region `
  --service-account $SaEmail `
  --no-allow-unauthenticated `
  --min-instances 1 `
  --max-instances 1 `
  --no-cpu-throttling `
  --set-env-vars "GMAIL_USER=$GmailUser,FIREBASE_STORAGE_BUCKET=$Bucket,SUPPORT_EMAIL=$GmailUser" `
  --set-secrets "GMAIL_SERVICE_ACCOUNT_JSON=GMAIL_SERVICE_ACCOUNT_JSON:latest"

Write-Host "==> Listo. Healthcheck:" -ForegroundColor Green
gcloud run services describe $Service --region $Region --format="value(status.url)"
Write-Host "   (añade /health a la URL para ver el estado del worker)"
