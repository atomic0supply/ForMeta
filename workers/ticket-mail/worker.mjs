import crypto from "node:crypto";
import http from "node:http";

import admin from "firebase-admin";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import mammoth from "mammoth";
import nodemailer from "nodemailer";
import pdfParse from "pdf-parse";

const STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  "";

const DEFAULT_SETTINGS = {
  supportEmail: process.env.SUPPORT_EMAIL || "help@formeta.es",
  fromName: process.env.SUPPORT_FROM_NAME || "Formeta Soporte",
  imapHost: process.env.PROTON_BRIDGE_IMAP_HOST || "127.0.0.1",
  imapPort: Number(process.env.PROTON_BRIDGE_IMAP_PORT || 1143),
  smtpHost: process.env.PROTON_BRIDGE_SMTP_HOST || "127.0.0.1",
  smtpPort: Number(process.env.PROTON_BRIDGE_SMTP_PORT || 1025),
  bridgeUsername: process.env.PROTON_BRIDGE_USERNAME || "",
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
      const parsed = await pdfParse(buffer);
      return String(parsed.text || "").slice(0, 12000);
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
    result.push({
      id,
      filename: attachment.filename || "attachment",
      contentType: attachment.contentType || "application/octet-stream",
      size,
      storagePath,
      aiReadable: Boolean(textPreview),
      textPreview,
    });
  }
  return result;
}

async function createTicket(parsed, requester) {
  const client = await findClientByEmail(requester.email);
  const number = await nextTicketNumber();
  const ref = await db.collection("tickets").add({
    number,
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

async function appendInboundMessage(ticketId, parsed, requester, messageId) {
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
    text: parsed.text || "",
    html: parsed.html || "",
    messageId,
    inReplyTo: normalizeMessageId(parsed.inReplyTo),
    references,
    attachments,
    internal: false,
    author: null,
    createdAt: nowTimestamp(),
  });

  await ticketRef.update({
    inboundMessageCount: admin.firestore.FieldValue.increment(1),
    lastInboundAt: nowTimestamp(),
    lastMessageAt: nowTimestamp(),
    updatedAt: nowTimestamp(),
  });
}

function createMailer() {
  return nodemailer.createTransport({
    host: runtimeSettings.smtpHost,
    port: Number(runtimeSettings.smtpPort),
    secure: false,
    auth: {
      user: runtimeSettings.bridgeUsername || process.env.PROTON_BRIDGE_USERNAME,
      pass: process.env.PROTON_BRIDGE_PASSWORD,
    },
  });
}

async function sendAcknowledgement(ticketNumber, parsed, requester) {
  const mailer = createMailer();
  await mailer.sendMail({
    from: `"${runtimeSettings.fromName}" <${runtimeSettings.supportEmail}>`,
    to: requester.email,
    subject: `Re: [${ticketNumber}] ${parsed.subject || "Ticket recibido"}`,
    text: template("acknowledgement", {
      name: requester.name || "",
      ticketNumber,
    }),
  });
}

async function processParsedEmail(parsed) {
  const requester = cleanEmailAddress(parsed.from?.value?.[0]);
  if (!requester.email) return;
  const messageId = normalizeMessageId(parsed.messageId);
  const match = await findTicketByThread(parsed, messageId);
  if (match.duplicate) return;

  let ticketId = match.ticketId;
  let ticketNumber = extractTicketNumber(parsed.subject);
  let isNew = false;

  if (!ticketId) {
    const created = await createTicket(parsed, requester);
    ticketId = created.ticketId;
    ticketNumber = created.ticketNumber;
    isNew = true;
  }

  await appendInboundMessage(ticketId, parsed, requester, messageId);
  if (isNew) {
    await sendAcknowledgement(ticketNumber, parsed, requester);
  }
}

async function pollInbox() {
  const client = new ImapFlow({
    host: runtimeSettings.imapHost,
    port: Number(runtimeSettings.imapPort),
    secure: false,
    auth: {
      user: runtimeSettings.bridgeUsername || process.env.PROTON_BRIDGE_USERNAME,
      pass: process.env.PROTON_BRIDGE_PASSWORD,
    },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    const unseen = await client.search({ seen: false });
    for await (const msg of client.fetch(unseen, { source: true }, { uid: true })) {
      try {
        const parsed = await simpleParser(msg.source);
        await processParsedEmail(parsed);
        await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
      } catch (error) {
        await db.collection("ticketProcessingErrors").add({
          stage: "inbound",
          uid: msg.uid,
          error: error.message,
          createdAt: nowTimestamp(),
        });
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }
}

async function processOutbox() {
  const mailer = createMailer();
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
      await mailer.sendMail({
        from: `"${runtimeSettings.fromName}" <${runtimeSettings.supportEmail}>`,
        to: item.to.map((contact) => contact.email).join(", "),
        subject: item.subject,
        text: item.body,
      });

      const ticketRef = db.collection("tickets").doc(item.ticketId);
      await ticketRef.collection("messages").add({
        direction: "outbound",
        from: { name: runtimeSettings.fromName, email: runtimeSettings.supportEmail },
        to: item.to,
        subject: item.subject,
        text: item.body,
        html: "",
        messageId: "",
        inReplyTo: "",
        references: [],
        attachments: [],
        internal: false,
        author: item.approvedBy || null,
        createdAt: nowTimestamp(),
      });

      await ticketRef.update({
        outboundMessageCount: admin.firestore.FieldValue.increment(1),
        lastOutboundAt: nowTimestamp(),
        lastMessageAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
        "sla.firstRespondedAt": item.firstRespondedAt || nowTimestamp(),
      });
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

let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    await loadSettings();
    await pollInbox();
    await processOutbox();
  } catch (error) {
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
    response.end(JSON.stringify({ ok: true, running }));
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
