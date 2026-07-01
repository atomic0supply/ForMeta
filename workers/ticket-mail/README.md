# Formeta Ticket Mail Worker

Worker para Cloud Run que conecta **Gmail Workspace** con Firestore mediante la
**Gmail API** (sin contraseñas, sin IMAP/SMTP):

- Lee correos no leídos del buzón de soporte con la Gmail API.
- Crea tickets o añade mensajes al hilo existente por número de ticket y headers.
- Sube adjuntos a Firebase Storage y genera URL de descarga firmada.
- Extrae texto de TXT, PDF y DOCX para la IA.
- Envía acuse automático al crear ticket (con cabeceras de threading + `threadId`).
- Procesa `ticketMailOutbox` y envía respuestas aprobadas, manteniendo el hilo.

## Autenticación (domain-wide delegation)

El worker usa la cuenta de servicio de `FIREBASE_SERVICE_ACCOUNT_JSON` para
**impersonar** el buzón `GMAIL_USER`. Pasos en Google:

1. Habilitar la **Gmail API** en el proyecto GCP (`fmeta-f9aed`).
2. En Google Admin → *Security → API Controls → Domain-wide delegation*,
   autorizar el **Client ID** de la cuenta de servicio con los scopes:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.send`

## Variables principales

- `SUPPORT_EMAIL` — dirección que aparece como remitente (From).
- `SUPPORT_FROM_NAME` — nombre del remitente.
- `GMAIL_USER` — buzón de Workspace a impersonar (normalmente = `SUPPORT_EMAIL`).
- `FIREBASE_SERVICE_ACCOUNT_JSON` — clave de la cuenta de servicio (con delegation).
- `FIREBASE_STORAGE_BUCKET` — bucket para adjuntos.
- `TICKET_MAX_ATTACHMENT_MB`, `TICKET_REOPEN_WINDOW_DAYS`.

## Modelo de ejecución (scale-to-zero + Cloud Scheduler)

El worker **no** sondea en bucle. Expone un endpoint que ejecuta **un** ciclo
(`pollInbox` + `processOutbox` + `processClientOutbox`) y termina; **Cloud
Scheduler** lo llama cada ~3 min con auth **OIDC**. Así la instancia de Cloud Run
escala a cero entre llamadas (`--min-instances 0`, sin `--no-cpu-throttling`) y el
gasto cae de ~42 €/mes a ~0 (capa gratuita). La latencia de proceso de correo pasa
de 60 s a unos minutos, aceptable para tickets/notificaciones. El envío es
idempotente (reclamo atómico `approved→sending`), así que los reintentos del
scheduler son seguros.

Endpoints:

```txt
GET  /health        →  { ok, running, provider, mailbox, lastTickAt, lastError }
POST /tick (o /run) →  ejecuta un ciclo; 200 si OK, 500 si falló (para reintento)
```

## Despliegue automatizado

Requisitos: tener instalado **Google Cloud SDK** (`gcloud`) y autenticarse una vez:

```powershell
gcloud auth login
gcloud auth application-default login   # opcional, para los scripts admin
```

Despliegue del worker (build + Cloud Run + secreto Gmail, todo en uno):

```powershell
cd C:\Users\tecnic.si\proyectos\FMETA
.\workers\ticket-mail\deploy.ps1 -GmailKeyPath "C:\Users\tecnic.si\Downloads\gen-lang-client-0631419177-0773ceead21c.json"
```

El script: habilita APIs (incluida Cloud Scheduler), sube la clave del service
account de Gmail a Secret Manager (`GMAIL_SERVICE_ACCOUNT_JSON`), crea la service
account de runtime con permisos (Firestore, Storage, firma de URLs), construye la
imagen y despliega en Cloud Run *scale-to-zero* (`--min-instances 0 --memory
256Mi`). Después crea/actualiza una service account `ticket-scheduler` con
`roles/run.invoker` y un job de **Cloud Scheduler** (`ticket-worker-tick`) que
llama a `<url>/tick` cada 3 min con OIDC. Ajusta la frecuencia con `-Schedule`.

> Importante (domain-wide delegation): en Google Admin →
> *Security → API Controls → Domain-wide delegation*, autoriza el **Client ID**
> `103561982254968330209` con los scopes `gmail.modify` y `gmail.send`. Sin esto,
> la impersonación de `formeta@formeta.es` devolverá 403.

## Permisos de propietario y admin de la app

Propietario del proyecto GCP/Firebase (gestión total):

```powershell
.\scripts\grant-access.ps1 -User romeret08@gmail.com
```

Administrador de la app (acceso al módulo Equipo para gestionar roles/usuarios):

```powershell
# requiere ADC o GOOGLE_APPLICATION_CREDENTIALS de fmeta-f9aed
node scripts/set-admin.mjs romeret08@gmail.com
```

