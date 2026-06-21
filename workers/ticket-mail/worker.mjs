import crypto from "node:crypto";
import http from "node:http";

import admin from "firebase-admin";
import { simpleParser } from "mailparser";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import { listUnread, makeMessageId, markRead, sendMail } from "./gmailClient.mjs";

// Extrae texto plano desde HTML como fallback cuando simpleParser no devuelve texto.
function htmlToPlain(html) {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split("\n")
    .map((l) => l.trim())
    .filter((l, i, a) => l.length > 0 || (i > 0 && a[i - 1].length > 0))
    .join("\n")
    .trim();
}

const STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  "";

const DEFAULT_SETTINGS = {
  supportEmail: process.env.SUPPORT_EMAIL || "support@formeta.es",
  fromName: process.env.SUPPORT_FROM_NAME || "Formeta Soporte",
  provider: "gmail",
  // Buzón de Workspace que la cuenta de servicio impersona (domain-wide delegation).
  gmailUser: process.env.GMAIL_USER || process.env.SUPPORT_EMAIL || "formeta@formeta.es",
  // Solo se crean tickets de correos dirigidos a este alias.
  supportAlias: process.env.SUPPORT_ALIAS || "support@formeta.es",
  // Remitente de las notificaciones a clientes (alias send-as de gmailUser).
  clientFromEmail: process.env.CLIENT_FROM_EMAIL || "info@formeta.es",
  clientFromName: process.env.CLIENT_FROM_NAME || "Formeta",
  pollSeconds: Number(process.env.TICKET_WORKER_POLL_SECONDS || 60),
  maxAttachmentMb: Number(process.env.TICKET_MAX_ATTACHMENT_MB || 20),
  reopenWindowDays: Number(process.env.TICKET_REOPEN_WINDOW_DAYS || 14),
  sla: {
    low: { firstResponseHours: 24, resolutionHours: 240 },
    medium: { firstResponseHours: 8, resolutionHours: 120 },
    high: { firstResponseHours: 4, resolutionHours: 72 },
    critical: { firstResponseHours: 2, resolutionHours: 24 },
  },
  templates: {
    acknowledgement:
      "Hola {{name}},\n\nHemos recibido tu mensaje y hemos creado el ticket {{ticketNumber}}.\nEl equipo de Formeta lo revisara y respondera en este mismo hilo.\n\nGracias,\nFormeta",
    reopen:
      "Hola {{name}},\n\nHemos reabierto el ticket {{ticketNumber}} y lo revisamos de nuevo.\n\nGracias,\nFormeta",
  },
};

function initFirebase() {
  if (admin.apps.length > 0) return;

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const credential = rawServiceAccount
    ? admin.credential.cert(JSON.parse(rawServiceAccount))
    : admin.credential.applicationDefault();

  admin.initializeApp({
    credential,
    storageBucket: STORAGE_BUCKET || undefined,
  });
}

initFirebase();

const db = admin.firestore();
const bucket = admin.storage().bucket();

let runtimeSettings = DEFAULT_SETTINGS;

async function loadSettings() {
  try {
    const snap = await db.collection("ticketSettings").doc("system").get();
    const data = snap.exists ? snap.data() : {};
    runtimeSettings = {
      ...DEFAULT_SETTINGS,
      ...data,
      sla: {
        ...DEFAULT_SETTINGS.sla,
        ...(data?.sla || {}),
      },
      templates: {
        ...DEFAULT_SETTINGS.templates,
        ...(data?.templates || {}),
      },
    };
  } catch (error) {
    console.warn(`Using env ticket settings: ${error.message}`);
    runtimeSettings = DEFAULT_SETTINGS;
  }
  return runtimeSettings;
}

function template(name, values) {
  const source = runtimeSettings.templates?.[name] || DEFAULT_SETTINGS.templates[name] || "";
  return source.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
}

function nowTimestamp() {
  return admin.firestore.Timestamp.now();
}

function gmailSubject() {
  return runtimeSettings.gmailUser || runtimeSettings.supportEmail;
}

function supportDomain() {
  return String(runtimeSettings.supportEmail || "formeta.es").split("@")[1] || "formeta.es";
}

function supportAlias() {
  return String(runtimeSettings.supportAlias || "").trim().toLowerCase();
}

// Reúne todos los destinatarios visibles del correo (To, Cc, Bcc, Delivered-To).
function collectRecipients(parsed) {
  const out = [];
  const add = (field) => {
    for (const a of field?.value || []) {
      if (a.address) out.push(String(a.address).toLowerCase());
    }
  };
  add(parsed.to);
  add(parsed.cc);
  add(parsed.bcc);
  const dt = parsed.headers?.get?.("delivered-to");
  if (typeof dt === "string") out.push(dt.toLowerCase());
  else if (Array.isArray(dt)) for (const x of dt) out.push(String(x).toLowerCase());
  return out;
}

// True si el correo va dirigido al alias de soporte (o si no hay alias configurado).
function addressedToAlias(parsed) {
  const alias = supportAlias();
  if (!alias) return true;
  return collectRecipients(parsed).some((r) => r.includes(alias));
}

function normalizeMessageId(value) {
  return String(value || "").trim().replace(/^<|>$/g, "").toLowerCase();
}

function extractTicketNumber(subject) {
  const match = String(subject || "").match(/\[(FM-\d{4}-(?:\d{4,}|MANUAL-\d+))\]/i);
  return match?.[1]?.toUpperCase() || "";
}

function cleanEmailAddress(address) {
  return {
    name: address?.name || "",
    email: String(address?.address || "").toLowerCase(),
  };
}

function makeSla(severity = "medium") {
  const configured = runtimeSettings.sla?.[severity] || DEFAULT_SETTINGS.sla[severity];
  const firstResponseHours = configured.firstResponseHours;
  const resolutionHours = configured.resolutionHours;
  const now = Date.now();

  return {
    firstResponseDueAt: admin.firestore.Timestamp.fromMillis(now + firstResponseHours * 3600000),
    resolutionDueAt: admin.firestore.Timestamp.fromMillis(now + resolutionHours * 3600000),
    firstRespondedAt: null,
    resolvedAt: null,
  };
}

async function nextTicketNumber() {
  const year = new Date().getFullYear();
  const ref = db.collection("systemCounters").doc(`tickets-${year}`);
  const value = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = (snap.exists ? snap.data().count || 0 : 0) + 1;
    tx.set(ref, { count: next, updatedAt: nowTimestamp() }, { merge: true });
    return next;
  });
  return `FM-${year}-${String(value).padStart(4, "0")}`;
}

async function findClientByEmail(email) {
  if (!email) return null;
  const normalized = email.toLowerCase();
  const primary = await db
    .collection("clients")
    .where("email", "==", normalized)
    .limit(1)
    .get();
  if (!primary.empty) {
    const doc = primary.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  const all = await db.collection("clients").limit(500).get();
  for (const doc of all.docs) {
    const contacts = Array.isArray(doc.data().contacts) ? doc.data().contacts : [];
    if (contacts.some((contact) => String(contact.email || "").toLowerCase() === normalized)) {
      return { id: doc.id, ...doc.data() };
    }
  }

  return null;
}

async function findTicketByThread(parsed, messageId) {
  if (messageId) {
    const duplicate = await db
      .collectionGroup("messages")
      .where("messageId", "==", messageId)
      .limit(1)
      .get();
    if (!duplicate.empty) return { duplicate: true, ticketId: duplicate.docs[0].ref.parent.parent.id };
  }

  const number = extractTicketNumber(parsed.subject);
  if (number) {
    const byNumber = await db.collection("tickets").where("number", "==", number).limit(1).get();
    if (!byNumber.empty) return { duplicate: false, ticketId: byNumber.docs[0].id };
  }

  const ids = [
    normalizeMessageId(parsed.inReplyTo),
    ...(Array.isArray(parsed.references) ? parsed.references : [parsed.references])
      .filter(Boolean)
      .map(normalizeMessageId),
  ].filter(Boolean);

  for (const id of ids.slice(0, 10)) {
    const byReference = await db
      .collectionGroup("messages")
      .where("messageId", "==", id)
      .limit(1)
      .get();
    if (!byReference.empty) {
      return { duplicate: false, ticketId: byReference.docs[0].ref.parent.parent.id };
    }
  }

  return { duplicate: false, ticketId: "" };
}

async function extractAttachmentText(attachment) {
  const contentType = String(attachment.contentType || "").toLowerCase();
  const buffer = attachment.content;
  try {
    if (contentType.startsWith("text/")) return buffer.toString("utf8").slice(0, 12000);
    if (contentType === "application/pdf") {
      const parser = new PDFParse({ data: buffer });
      try {
        const res = await parser.getText();
        return String(res?.text || "").slice(0, 12000);
      } finally {
        await parser.destroy?.();
      }
    }
    if (
      contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      attachment.filename?.toLowerCase().endsWith(".docx")
    ) {
      const parsed = await mammoth.extractRawText({ buffer });
      return String(parsed.value || "").slice(0, 12000);
    }
  } catch (error) {
    return `No se ha podido extraer texto: ${error.message}`;
  }
  return "";
}

async function uploadAttachments(ticketId, messageDocId, attachments) {
  const result = [];
  for (const attachment of attachments || []) {
    const size = attachment.size || attachment.content?.length || 0;
    if (size > runtimeSettings.maxAttachmentMb * 1024 * 1024) {
      result.push({
        id: crypto.randomUUID(),
        filename: attachment.filename || "attachment",
        contentType: attachment.contentType || "application/octet-stream",
        size,
        storagePath: "",
        aiReadable: false,
        error: `Adjunto supera ${runtimeSettings.maxAttachmentMb}MB`,
      });
      continue;
    }

    const id = crypto.randomUUID();
    const safeName = (attachment.filename || "attachment").replace(/[^\w.\-]+/g, "_");
    const storagePath = `tickets/${ticketId}/messages/${messageDocId}/${id}-${safeName}`;
    const file = bucket.file(storagePath);
    await file.save(attachment.content, {
      contentType: attachment.contentType || "application/octet-stream",
      resumable: false,
      metadata: {
        metadata: {
          ticketId,
          messageDocId,
        },
      },
    });

    const textPreview = await extractAttachmentText(attachment);

    // URL de descarga firmada (lectura) para que la UI pueda abrir el adjunto.
    let downloadUrl = "";
    try {
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 año
      });
      downloadUrl = url;
    } catch (error) {
      console.warn(`No se pudo firmar URL de adjunto: ${error.message}`);
    }

    result.push({
      id,
      filename: attachment.filename || "attachment",
      contentType: attachment.contentType || "application/octet-stream",
      size,
      storagePath,
      downloadUrl,
      aiReadable: Boolean(textPreview),
      textPreview,
    });
  }
  return result;
}

async function createTicket(parsed, requester, gmailThreadId = "") {
  const client = await findClientByEmail(requester.email);
  const number = await nextTicketNumber();
  const ref = await db.collection("tickets").add({
    number,
    gmailThreadId,
    subject: parsed.subject || "(sin asunto)",
    status: "nuevo",
    priority: "medium",
    severity: "medium",
    intent: "other",
    confidential: false,
    requester,
    clientId: client?.id || "",
    clientName: client?.name || "",
    projectId: "",
    projectName: "",
    owner: null,
    watchers: [],
    tags: [],
    summary: "",
    duplicateOfTicketId: "",
    duplicateOfTicketNumber: "",
    triage: {
      environment: "",
      affectedUrl: "",
      affectedUser: "",
      browserDevice: "",
      stepsToReproduce: "",
      expectedResult: "",
      actualResult: "",
    },
    ai: null,
    sla: makeSla("medium"),
    taskLinks: [],
    inboundMessageCount: 0,
    outboundMessageCount: 0,
    lastInboundAt: null,
    lastOutboundAt: null,
    lastMessageAt: nowTimestamp(),
    satisfactionScore: null,
    createdAt: nowTimestamp(),
    updatedAt: nowTimestamp(),
    closedAt: null,
  });

  return { ticketId: ref.id, ticketNumber: number };
}

async function maybeReopenTicket(ticketRef) {
  const snap = await ticketRef.get();
  if (!snap.exists) return;
  const data = snap.data();
  const closedAt = data.closedAt?.toMillis?.() || 0;
  const canReopen =
    data.status === "cerrado" &&
    closedAt > Date.now() - runtimeSettings.reopenWindowDays * 86400000;
  if (canReopen) {
    await ticketRef.update({
      status: "triage",
      closedAt: null,
      updatedAt: nowTimestamp(),
    });
  }
}

async function appendInboundMessage(ticketId, parsed, requester, messageId, gmailThreadId = "") {
  const ticketRef = db.collection("tickets").doc(ticketId);
  await maybeReopenTicket(ticketRef);

  const messageRef = ticketRef.collection("messages").doc();
  const attachments = await uploadAttachments(ticketId, messageRef.id, parsed.attachments || []);
  const references = Array.isArray(parsed.references)
    ? parsed.references.map(normalizeMessageId)
    : [normalizeMessageId(parsed.references)].filter(Boolean);

  await messageRef.set({
    direction: "inbound",
    from: requester,
    to: parsed.to?.value?.map(cleanEmailAddress) || [],
    subject: parsed.subject || "",
    text: parsed.text || htmlToPlain(parsed.html || ""),
    html: parsed.html || "",
    messageId,
    inReplyTo: normalizeMessageId(parsed.inReplyTo),
    references,
    attachments,
    internal: false,
    author: null,
    createdAt: nowTimestamp(),
  });

  const ticketUpdate = {
    inboundMessageCount: admin.firestore.FieldValue.increment(1),
    lastInboundAt: nowTimestamp(),
    lastMessageAt: nowTimestamp(),
    updatedAt: nowTimestamp(),
  };
  if (gmailThreadId) ticketUpdate.gmailThreadId = gmailThreadId;
  await ticketRef.update(ticketUpdate);
}

async function sendAcknowledgement(ticketNumber, parsed, requester, gmailThreadId) {
  const incomingId = parsed.messageId ? String(parsed.messageId).trim() : "";
  await sendMail(gmailSubject(), {
    from: `"${runtimeSettings.fromName}" <${runtimeSettings.supportEmail}>`,
    to: requester.email,
    subjectLine: `Re: [${ticketNumber}] ${parsed.subject || "Ticket recibido"}`,
    text: template("acknowledgement", {
      name: requester.name || "",
      ticketNumber,
    }),
    inReplyTo: incomingId,
    references: incomingId ? [incomingId] : [],
    threadId: gmailThreadId || undefined,
    messageId: makeMessageId(supportDomain()),
  });
}

async function processParsedEmail(parsed, gmailThreadId = "") {
  const requester = cleanEmailAddress(parsed.from?.value?.[0]);
  if (!requester.email) return;
  const messageId = normalizeMessageId(parsed.messageId);
  const match = await findTicketByThread(parsed, messageId);
  if (match.duplicate) return;

  let ticketId = match.ticketId;
  let ticketNumber = extractTicketNumber(parsed.subject);
  let isNew = false;

  if (!ticketId) {
    const created = await createTicket(parsed, requester, gmailThreadId);
    ticketId = created.ticketId;
    ticketNumber = created.ticketNumber;
    isNew = true;
  }

  await appendInboundMessage(ticketId, parsed, requester, messageId, gmailThreadId);
  if (isNew) {
    await sendAcknowledgement(ticketNumber, parsed, requester, gmailThreadId);
  }
}

async function pollInbox() {
  // Solo correos dirigidos al alias de soporte se convierten en tickets.
  const alias = supportAlias();
  const filter = alias ? `(to:${alias} OR cc:${alias} OR deliveredto:${alias})` : "";
  const messages = await listUnread(gmailSubject(), 25, filter);
  for (const msg of messages) {
    try {
      const parsed = await simpleParser(msg.raw);
      // Doble verificación en código (no tocar correos ajenos al alias).
      if (!addressedToAlias(parsed)) continue;
      await processParsedEmail(parsed, msg.threadId || "");
      await markRead(gmailSubject(), msg.id);
    } catch (error) {
      await db.collection("ticketProcessingErrors").add({
        stage: "inbound",
        gmailId: msg.id,
        error: error.message,
        createdAt: nowTimestamp(),
      });
    }
  }
}

/** Recupera datos de threading del ticket: gmailThreadId + último Message-ID entrante. */
async function getThreadContext(ticketRef) {
  const ticketSnap = await ticketRef.get();
  const ticketData = ticketSnap.exists ? ticketSnap.data() : {};
  const gmailThreadId = ticketData.gmailThreadId || "";
  const firstResponded = ticketData?.sla?.firstRespondedAt || null;

  let lastInboundMessageId = "";
  const lastInbound = await ticketRef
    .collection("messages")
    .where("direction", "==", "inbound")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  if (!lastInbound.empty) {
    const raw = lastInbound.docs[0].data().messageId || "";
    lastInboundMessageId = raw ? `<${String(raw).replace(/^<|>$/g, "")}>` : "";
  }

  return { gmailThreadId, lastInboundMessageId, firstResponded };
}

async function processOutbox() {
  const snap = await db
    .collection("ticketMailOutbox")
    .where("status", "==", "approved")
    .orderBy("createdAt", "asc")
    .limit(10)
    .get();

  for (const doc of snap.docs) {
    const item = doc.data();
    try {
      await doc.ref.update({ status: "sending", updatedAt: nowTimestamp() });

      const ticketRef = db.collection("tickets").doc(item.ticketId);
      const { gmailThreadId, lastInboundMessageId, firstResponded } =
        await getThreadContext(ticketRef);
      const outboundMessageId = makeMessageId(supportDomain());

      await sendMail(gmailSubject(), {
        from: `"${runtimeSettings.fromName}" <${runtimeSettings.supportEmail}>`,
        to: item.to.map((contact) => contact.email).join(", "),
        subjectLine: item.subject,
        text: item.body,
        inReplyTo: lastInboundMessageId,
        references: lastInboundMessageId ? [lastInboundMessageId] : [],
        threadId: gmailThreadId || undefined,
        messageId: outboundMessageId,
      });

      await ticketRef.collection("messages").add({
        direction: "outbound",
        from: { name: runtimeSettings.fromName, email: runtimeSettings.supportEmail },
        to: item.to,
        subject: item.subject,
        text: item.body,
        html: "",
        messageId: normalizeMessageId(outboundMessageId),
        inReplyTo: normalizeMessageId(lastInboundMessageId),
        references: lastInboundMessageId ? [normalizeMessageId(lastInboundMessageId)] : [],
        attachments: [],
        internal: false,
        author: item.approvedBy || null,
        createdAt: nowTimestamp(),
      });

      const ticketUpdate = {
        outboundMessageCount: admin.firestore.FieldValue.increment(1),
        lastOutboundAt: nowTimestamp(),
        lastMessageAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
      };
      // Solo fijar la primera respuesta SLA si aún no se había registrado.
      if (!firstResponded) {
        ticketUpdate["sla.firstRespondedAt"] = item.firstRespondedAt || nowTimestamp();
      }
      await ticketRef.update(ticketUpdate);
      await doc.ref.update({ status: "sent", sentAt: nowTimestamp(), updatedAt: nowTimestamp() });
    } catch (error) {
      await doc.ref.update({
        status: "failed",
        error: error.message,
        updatedAt: nowTimestamp(),
      });
      await db.collection("ticketProcessingErrors").add({
        stage: "outbox",
        outboxId: doc.id,
        error: error.message,
        createdAt: nowTimestamp(),
      });
    }
  }
}

// Procesa la cola de notificaciones a clientes (clientMailOutbox). Aditivo y
// aislado del flujo de tickets: son correos independientes (hilo nuevo) enviados
// desde el alias de cliente (info@formeta.es), con el HTML ya renderizado.
async function processClientOutbox() {
  const snap = await db
    .collection("clientMailOutbox")
    .where("status", "==", "approved")
    .orderBy("createdAt", "asc")
    .limit(10)
    .get();

  for (const doc of snap.docs) {
    // Reclamo atómico: solo un tick/instancia puede pasar approved→sending. Si
    // otro ya lo reclamó (o cambió de estado), se omite. Garantiza envío único.
    const item = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      if (!fresh.exists || fresh.data().status !== "approved") return null;
      tx.update(doc.ref, { status: "sending", updatedAt: nowTimestamp() });
      return fresh.data();
    });
    if (!item) continue;

    try {
      const to = (item.to || []).map((contact) => contact.email).filter(Boolean).join(", ");
      const cc = (item.cc || []).map((contact) => contact.email).filter(Boolean).join(", ");
      if (!to) throw new Error("Sin destinatarios");

      // El acuse de apertura de ticket es un correo de SOPORTE: sale de
      // support@formeta.es (único buzón de tickets), no del alias de cliente.
      // El resto de notificaciones siguen saliendo de info@formeta.es.
      const isTicketAck = item.kind === "ticket_opened";
      const fromEmail = isTicketAck
        ? runtimeSettings.supportEmail || DEFAULT_SETTINGS.supportEmail
        : runtimeSettings.clientFromEmail || DEFAULT_SETTINGS.clientFromEmail;
      const fromName = isTicketAck
        ? runtimeSettings.fromName || DEFAULT_SETTINGS.fromName
        : runtimeSettings.clientFromName || DEFAULT_SETTINGS.clientFromName;

      await sendMail(gmailSubject(), {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        cc: cc || undefined,
        subjectLine: item.subject,
        text: item.text || "",
        html: item.html || "",
        messageId: makeMessageId(supportDomain()),
      });

      await doc.ref.update({ status: "sent", sentAt: nowTimestamp(), updatedAt: nowTimestamp() });
    } catch (error) {
      await doc.ref.update({
        status: "failed",
        error: error.message,
        updatedAt: nowTimestamp(),
      });
      await db.collection("clientMailProcessingErrors").add({
        stage: "clientOutbox",
        outboxId: doc.id,
        error: error.message,
        createdAt: nowTimestamp(),
      });
    }
  }
}

let running = false;
let lastTickAt = null;
let lastError = null;

async function tick() {
  if (running) return;
  running = true;
  try {
    await loadSettings();
    await pollInbox();
    await processOutbox();
    await processClientOutbox();
    lastTickAt = new Date().toISOString();
    lastError = null;
  } catch (error) {
    lastError = error.message;
    await db.collection("ticketProcessingErrors").add({
      stage: "worker",
      error: error.message,
      createdAt: nowTimestamp(),
    });
  } finally {
    running = false;
  }
}

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({
      ok: true,
      running,
      provider: runtimeSettings.provider || "gmail",
      mailbox: gmailSubject(),
      lastTickAt,
      lastError,
    }));
    return;
  }
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("Formeta ticket worker\n");
});

server.listen(Number(process.env.PORT || 8080), () => {
  console.log(`Ticket worker listening on ${process.env.PORT || 8080}`);
});

void tick();
setInterval(() => void tick(), Math.max(15, runtimeSettings.pollSeconds) * 1000);
