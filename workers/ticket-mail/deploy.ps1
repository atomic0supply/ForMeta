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
  # Buzón impersonado = formeta@formeta.es. Remitentes (alias send-as verificados):
  [string]$SupportEmail    = "support@formeta.es", # tickets (From de acuses/respuestas)
  [string]$SupportAlias    = "support@formeta.es", # solo crea tickets el correo a este alias
  [string]$ClientFromEmail = "info@formeta.es",     # propuestas / comunicaciones
  [string]$ClientFromName  = "Formeta",
  # Frecuencia con la que Cloud Scheduler dispara /tick (cron). Cada 3 min por defecto.
  [string]$Schedule  = "*/3 * * * *",
  [Parameter(Mandatory = $true)][string]$GmailKeyPath
)

# Los warnings de gcloud van a stderr; evitamos que aborten el script.
$ErrorActionPreference = "Continue"
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
  $PSNativeCommandUseErrorActionPreference = $false
}

function Invoke-GcloudStep {
  param([string]$Label, [scriptblock]$Block)
  Write-Host "==> $Label" -ForegroundColor Cyan
  & $Block
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo en: $Label (exit $LASTEXITCODE)"
  }
}

if (-not (Test-Path $GmailKeyPath)) { throw "No se encuentra la clave Gmail: $GmailKeyPath" }

Write-Host "==> Proyecto $Project / region $Region" -ForegroundColor Cyan
gcloud config set project $Project | Out-Null

Invoke-GcloudStep "Habilitando APIs necesarias" {
  gcloud services enable run.googleapis.com cloudbuild.googleapis.com `
    secretmanager.googleapis.com artifactregistry.googleapis.com containerregistry.googleapis.com `
    cloudscheduler.googleapis.com
}

# --- Secreto con la clave del service account de Gmail ---
Write-Host "==> Creando/actualizando secreto GMAIL_SERVICE_ACCOUNT_JSON" -ForegroundColor Cyan
gcloud secrets describe GMAIL_SERVICE_ACCOUNT_JSON *> $null
if ($LASTEXITCODE -ne 0) {
  gcloud secrets create GMAIL_SERVICE_ACCOUNT_JSON --replication-policy=automatic | Out-Null
}
gcloud secrets versions add GMAIL_SERVICE_ACCOUNT_JSON --data-file="$GmailKeyPath" | Out-Null

# --- Service account de runtime del worker ---
$SaName  = "ticket-worker"
$SaEmail = "$SaName@$Project.iam.gserviceaccount.com"
Write-Host "==> Service account de runtime ($SaEmail)" -ForegroundColor Cyan
gcloud iam service-accounts describe $SaEmail *> $null
if ($LASTEXITCODE -ne 0) {
  gcloud iam service-accounts create $SaName --display-name="Ticket worker" | Out-Null
}

Write-Host "==> Concediendo permisos al runtime (Firestore, Storage, Secret, firma de URLs)" -ForegroundColor Cyan
foreach ($role in @("roles/datastore.user","roles/storage.objectAdmin","roles/secretmanager.secretAccessor","roles/iam.serviceAccountTokenCreator")) {
  gcloud projects add-iam-policy-binding $Project --member="serviceAccount:$SaEmail" --role=$role --condition=None | Out-Null
}

# --- Build del contenedor ---
Invoke-GcloudStep "Construyendo imagen con Cloud Build" {
  gcloud builds submit --config workers/ticket-mail/cloudbuild.yaml .
}

# --- Deploy en Cloud Run (scale-to-zero: min 0, CPU solo durante la peticion) ---
# El worker ya no sondea en bucle; Cloud Scheduler llama a /tick cada pocos minutos,
# asi que la instancia se apaga entre llamadas y el gasto cae ~a cero (capa gratuita).
Invoke-GcloudStep "Desplegando en Cloud Run" {
  gcloud run deploy $Service `
    --image "gcr.io/$Project/ticket-worker:latest" `
    --region $Region `
    --service-account $SaEmail `
    --no-allow-unauthenticated `
    --min-instances 0 `
    --max-instances 1 `
    --memory 256Mi `
    --set-env-vars "GMAIL_USER=$GmailUser,FIREBASE_STORAGE_BUCKET=$Bucket,SUPPORT_EMAIL=$SupportEmail,SUPPORT_ALIAS=$SupportAlias,CLIENT_FROM_EMAIL=$ClientFromEmail,CLIENT_FROM_NAME=$ClientFromName" `
    --set-secrets "GMAIL_SERVICE_ACCOUNT_JSON=GMAIL_SERVICE_ACCOUNT_JSON:latest"
}

$ServiceUrl = (gcloud run services describe $Service --region $Region --format="value(status.url)").Trim()
if (-not $ServiceUrl) { throw "No se pudo obtener la URL del servicio $Service" }

# --- Service account que Cloud Scheduler usa para invocar el worker (OIDC) ---
$SchedulerSaName  = "ticket-scheduler"
$SchedulerSaEmail = "$SchedulerSaName@$Project.iam.gserviceaccount.com"
Write-Host "==> Service account del scheduler ($SchedulerSaEmail)" -ForegroundColor Cyan
gcloud iam service-accounts describe $SchedulerSaEmail *> $null
if ($LASTEXITCODE -ne 0) {
  gcloud iam service-accounts create $SchedulerSaName --display-name="Ticket scheduler invoker" | Out-Null
}

# Permite a esa SA invocar el servicio (el worker sigue con --no-allow-unauthenticated).
Invoke-GcloudStep "Concediendo run.invoker al scheduler" {
  gcloud run services add-iam-policy-binding $Service `
    --region $Region `
    --member "serviceAccount:$SchedulerSaEmail" `
    --role "roles/run.invoker"
}

# --- Job de Cloud Scheduler que llama a <url>/tick cada $Schedule con auth OIDC ---
$JobName = "$Service-tick"
$TickUrl = "$ServiceUrl/tick"
Write-Host "==> Cloud Scheduler job '$JobName' -> $TickUrl ($Schedule)" -ForegroundColor Cyan
gcloud scheduler jobs describe $JobName --location $Region *> $null
if ($LASTEXITCODE -ne 0) {
  Invoke-GcloudStep "Creando job de Cloud Scheduler" {
    gcloud scheduler jobs create http $JobName `
      --location $Region `
      --schedule "$Schedule" `
      --uri "$TickUrl" `
      --http-method POST `
      --oidc-service-account-email $SchedulerSaEmail `
      --oidc-token-audience "$ServiceUrl" `
      --attempt-deadline "540s"
  }
} else {
  Invoke-GcloudStep "Actualizando job de Cloud Scheduler" {
    gcloud scheduler jobs update http $JobName `
      --location $Region `
      --schedule "$Schedule" `
      --uri "$TickUrl" `
      --http-method POST `
      --oidc-service-account-email $SchedulerSaEmail `
      --oidc-token-audience "$ServiceUrl" `
      --attempt-deadline "540s"
  }
}

Write-Host "==> Listo. URL del servicio: $ServiceUrl" -ForegroundColor Green
Write-Host "   /health  -> estado del worker"
Write-Host "   /tick    -> ejecuta un ciclo (lo llama Cloud Scheduler cada $Schedule)"
