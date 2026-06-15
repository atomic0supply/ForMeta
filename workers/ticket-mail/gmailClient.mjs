import crypto from "node:crypto";

import { google } from "googleapis";
import MailComposer from "nodemailer/lib/mail-composer/index.js";

// Gmail Workspace client via service-account domain-wide delegation.
// The service account (FIREBASE_SERVICE_ACCOUNT_JSON) impersonates the support
// mailbox (GMAIL_USER) to read and send mail through the Gmail API — no
// passwords, no IMAP/SMTP.

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
];

let cachedClient = null;
let cachedSubject = null;

function serviceAccount() {
  // La cuenta de servicio de Gmail puede ser distinta a la de Firebase
  // (la delegation en Workspace va por su client_id). Preferimos
  // GMAIL_SERVICE_ACCOUNT_JSON y caemos a FIREBASE_SERVICE_ACCOUNT_JSON.
  const raw =
    process.env.GMAIL_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error(
      "GMAIL_SERVICE_ACCOUNT_JSON (o FIREBASE_SERVICE_ACCOUNT_JSON) es obligatorio para Gmail (domain-wide delegation)",
    );
  }
  return JSON.parse(raw);
}

export function getGmailClient(subject) {
  if (cachedClient && cachedSubject === subject) return cachedClient;
  const sa = serviceAccount();
  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: GMAIL_SCOPES,
    subject, // mailbox to impersonate, e.g. soporte@formeta.es
  });
  cachedClient = google.gmail({ version: "v1", auth });
  cachedSubject = subject;
  return cachedClient;
}

function base64UrlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function makeMessageId(domain) {
  const host = domain || "formeta.es";
  return `<${crypto.randomUUID()}@${host}>`;
}

/**
 * Lista los correos no leídos del buzón. Devuelve [{ id, threadId, raw(Buffer) }].
 * filterQuery permite acotar (p. ej. al alias de soporte) con sintaxis de Gmail.
 */
export async function listUnread(subject, maxResults = 25, filterQuery = "") {
  const gmail = getGmailClient(subject);
  const q = ["is:unread", "-in:chats", "-in:sent", filterQuery].filter(Boolean).join(" ");
  const list = await gmail.users.messages.list({
    userId: "me",
    q,
    maxResults,
  });
  const messages = list.data.messages || [];
  const results = [];
  for (const ref of messages) {
    const full = await gmail.users.messages.get({
      userId: "me",
      id: ref.id,
      format: "raw",
    });
    const raw = Buffer.from(full.data.raw, "base64");
    results.push({ id: ref.id, threadId: full.data.threadId, raw });
  }
  return results;
}

/** Marca un mensaje como leído (quita la etiqueta UNREAD). */
export async function markRead(subject, messageId) {
  const gmail = getGmailClient(subject);
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

/**
 * Envía un correo construyendo el MIME (con cabeceras de threading) y usando
 * la Gmail API. Devuelve { id, threadId, messageId }.
 */
export async function sendMail(subject, { from, to, subjectLine, text, html, inReplyTo, references, threadId, messageId }) {
  const gmail = getGmailClient(subject);

  const composer = new MailComposer({
    from,
    to,
    subject: subjectLine,
    text: text || undefined,
    html: html || undefined,
    inReplyTo: inReplyTo || undefined,
    references: references && references.length ? references : undefined,
    messageId: messageId || undefined,
  });

  const mime = await composer.compile().build();
  const raw = base64UrlEncode(mime);

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: threadId ? { raw, threadId } : { raw },
  });

  return { id: res.data.id, threadId: res.data.threadId, messageId };
}
