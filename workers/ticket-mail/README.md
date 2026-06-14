# Formeta Ticket Mail Worker

Worker para Cloud Run que conecta Proton Mail Bridge con Firestore:

- Lee correos no vistos por IMAP desde `SUPPORT_EMAIL`.
- Crea tickets o añade mensajes al hilo existente por numero de ticket y headers.
- Sube adjuntos a Firebase Storage.
- Extrae texto de TXT, PDF y DOCX para la IA.
- Envia acuse automatico al crear ticket.
- Procesa `ticketMailOutbox` y envia respuestas aprobadas por SMTP.

## Despliegue

El contenedor espera que Proton Mail Bridge este disponible dentro del mismo entorno o como sidecar accesible por `PROTON_BRIDGE_IMAP_HOST` y `PROTON_BRIDGE_SMTP_HOST`.

Variables principales:

- `SUPPORT_EMAIL`
- `SUPPORT_FROM_NAME`
- `PROTON_BRIDGE_IMAP_HOST`
- `PROTON_BRIDGE_IMAP_PORT`
- `PROTON_BRIDGE_SMTP_HOST`
- `PROTON_BRIDGE_SMTP_PORT`
- `PROTON_BRIDGE_USERNAME`
- `PROTON_BRIDGE_PASSWORD`
- `FIREBASE_SERVICE_ACCOUNT_JSON` o Application Default Credentials
- `FIREBASE_STORAGE_BUCKET`

Healthcheck:

```txt
GET /health
```
