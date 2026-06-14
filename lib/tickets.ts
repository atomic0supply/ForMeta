import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type {
  TicketAiSuggestion,
  TicketIntent,
  TicketSeverity,
} from "@/lib/ticketAi";
import type { TicketMailSettings } from "@/lib/ticketSettings";
import type { TaskPriority, TaskStatus } from "@/lib/tasks";

export type TicketStatus =
  | "nuevo"
  | "triage"
  | "esperando_cliente"
  | "planificado"
  | "en_progreso"
  | "esperando_release"
  | "resuelto"
  | "cerrado"
  | "spam";

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketMessageDirection = "inbound" | "outbound" | "internal";
export type TicketOutboxStatus = "draft" | "approved" | "sending" | "sent" | "failed";

export const TICKET_STATUSES: TicketStatus[] = [
  "nuevo",
  "triage",
  "esperando_cliente",
  "planificado",
  "en_progreso",
  "esperando_release",
  "resuelto",
  "cerrado",
  "spam",
];

export const TICKET_PRIORITIES: TicketPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

export const TICKET_SEVERITIES: TicketSeverity[] = [
  "low",
  "medium",
  "high",
  "critical",
];

export function ticketStatusLabel(status: TicketStatus): string {
  switch (status) {
    case "nuevo": return "Nuevo";
    case "triage": return "Triage";
    case "esperando_cliente": return "Esperando cliente";
    case "planificado": return "Planificado";
    case "en_progreso": return "En progreso";
    case "esperando_release": return "Esperando release";
    case "resuelto": return "Resuelto";
    case "cerrado": return "Cerrado";
    case "spam": return "Spam";
  }
}

export function ticketPriorityLabel(priority: TicketPriority): string {
  switch (priority) {
    case "low": return "Baja";
    case "medium": return "Media";
    case "high": return "Alta";
    case "urgent": return "Urgente";
  }
}

export function ticketSeverityLabel(severity: TicketSeverity): string {
  switch (severity) {
    case "low": return "Baja";
    case "medium": return "Media";
    case "high": return "Alta";
    case "critical": return "Crítica";
  }
}

export function ticketIntentLabel(intent: TicketIntent): string {
  switch (intent) {
    case "bug": return "Incidencia";
    case "request": return "Petición";
    case "question": return "Duda";
    case "access": return "Acceso";
    case "billing": return "Facturación";
    case "improvement": return "Mejora";
    case "other": return "Otro";
  }
}

export type TicketPerson = {
  uid: string;
  name: string;
  email?: string;
};

export type TicketContact = {
  name: string;
  email: string;
};

export type TicketAttachment = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  storagePath: string;
  downloadUrl?: string;
  textPreview?: string;
  aiReadable: boolean;
  error?: string;
};

export type TicketTriageChecklist = {
  environment: string;
  affectedUrl: string;
  affectedUser: string;
  browserDevice: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
};

export type TicketTaskLink = {
  projectId: string;
  projectName: string;
  taskId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Timestamp | null;
};

export type TicketSla = {
  firstResponseDueAt: Timestamp | null;
  resolutionDueAt: Timestamp | null;
  firstRespondedAt: Timestamp | null;
  resolvedAt: Timestamp | null;
};

export type Ticket = {
  id: string;
  number: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  severity: TicketSeverity;
  intent: TicketIntent;
  confidential: boolean;
  requester: TicketContact;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  owner: TicketPerson | null;
  watchers: TicketPerson[];
  tags: string[];
  summary: string;
  duplicateOfTicketId: string;
  duplicateOfTicketNumber: string;
  triage: TicketTriageChecklist;
  ai: TicketAiSuggestion | null;
  sla: TicketSla;
  taskLinks: TicketTaskLink[];
  inboundMessageCount: number;
  outboundMessageCount: number;
  lastInboundAt: Timestamp | null;
  lastOutboundAt: Timestamp | null;
  lastMessageAt: Timestamp | null;
  satisfactionScore: number | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  closedAt: Timestamp | null;
};

export type TicketMessage = {
  id: string;
  direction: TicketMessageDirection;
  from: TicketContact;
  to: TicketContact[];
  subject: string;
  text: string;
  html: string;
  messageId: string;
  inReplyTo: string;
  references: string[];
  attachments: TicketAttachment[];
  internal: boolean;
  author: TicketPerson | null;
  createdAt: Timestamp | null;
};

export type TicketOutbox = {
  id: string;
  ticketId: string;
  ticketNumber: string;
  to: TicketContact[];
  subject: string;
  body: string;
  status: TicketOutboxStatus;
  approvedBy: TicketPerson | null;
  sentAt: Timestamp | null;
  error: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type TicketInput = Partial<Omit<Ticket, "id" | "createdAt" | "updatedAt">>;
export type NewTicketInput = {
  subject: string;
  requester: TicketContact;
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  text?: string;
};

export type TicketQueue = {
  all: Ticket[];
  nuevos: Ticket[];
  mios: Ticket[];
  urgentes: Ticket[];
  esperandoCliente: Ticket[];
  sinAsignar: Ticket[];
  vencenHoy: Ticket[];
  cerrados: Ticket[];
};

const emptyTriage: TicketTriageChecklist = {
  environment: "",
  affectedUrl: "",
  affectedUser: "",
  browserDevice: "",
  stepsToReproduce: "",
  expectedResult: "",
  actualResult: "",
};

function asTimestamp(value: unknown): Timestamp | null {
  return value instanceof Timestamp ? value : null;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeTicket(id: string, raw: Record<string, unknown>): Ticket {
  const data = raw as Partial<Ticket>;
  const sla = data.sla as Partial<TicketSla> | undefined;
  const requester = data.requester as Partial<TicketContact> | undefined;
  const triage = data.triage as Partial<TicketTriageChecklist> | undefined;

  return {
    id,
    number: data.number ?? "",
    subject: data.subject ?? "",
    status: data.status ?? "nuevo",
    priority: data.priority ?? "medium",
    severity: data.severity ?? "medium",
    intent: data.intent ?? "other",
    confidential: Boolean(data.confidential),
    requester: {
      name: requester?.name ?? "",
      email: requester?.email ?? "",
    },
    clientId: data.clientId ?? "",
    clientName: data.clientName ?? "",
    projectId: data.projectId ?? "",
    projectName: data.projectName ?? "",
    owner: data.owner ?? null,
    watchers: asArray<TicketPerson>(data.watchers),
    tags: asArray<string>(data.tags),
    summary: data.summary ?? "",
    duplicateOfTicketId: data.duplicateOfTicketId ?? "",
    duplicateOfTicketNumber: data.duplicateOfTicketNumber ?? "",
    triage: {
      ...emptyTriage,
      ...triage,
    },
    ai: data.ai ?? null,
    sla: {
      firstResponseDueAt: asTimestamp(sla?.firstResponseDueAt),
      resolutionDueAt: asTimestamp(sla?.resolutionDueAt),
      firstRespondedAt: asTimestamp(sla?.firstRespondedAt),
      resolvedAt: asTimestamp(sla?.resolvedAt),
    },
    taskLinks: asArray<TicketTaskLink>(data.taskLinks),
    inboundMessageCount: data.inboundMessageCount ?? 0,
    outboundMessageCount: data.outboundMessageCount ?? 0,
    lastInboundAt: asTimestamp(data.lastInboundAt),
    lastOutboundAt: asTimestamp(data.lastOutboundAt),
    lastMessageAt: asTimestamp(data.lastMessageAt),
    satisfactionScore: data.satisfactionScore ?? null,
    createdAt: asTimestamp(data.createdAt),
    updatedAt: asTimestamp(data.updatedAt),
    closedAt: asTimestamp(data.closedAt),
  };
}

function normalizeMessage(id: string, raw: Record<string, unknown>): TicketMessage {
  const data = raw as Partial<TicketMessage>;
  return {
    id,
    direction: data.direction ?? "inbound",
    from: data.from ?? { name: "", email: "" },
    to: asArray<TicketContact>(data.to),
    subject: data.subject ?? "",
    text: data.text ?? "",
    html: data.html ?? "",
    messageId: data.messageId ?? "",
    inReplyTo: data.inReplyTo ?? "",
    references: asArray<string>(data.references),
    attachments: asArray<TicketAttachment>(data.attachments),
    internal: Boolean(data.internal),
    author: data.author ?? null,
    createdAt: asTimestamp(data.createdAt),
  };
}

function normalizeOutbox(id: string, raw: Record<string, unknown>): TicketOutbox {
  const data = raw as Partial<TicketOutbox>;
  return {
    id,
    ticketId: data.ticketId ?? "",
    ticketNumber: data.ticketNumber ?? "",
    to: asArray<TicketContact>(data.to),
    subject: data.subject ?? "",
    body: data.body ?? "",
    status: data.status ?? "draft",
    approvedBy: data.approvedBy ?? null,
    sentAt: asTimestamp(data.sentAt),
    error: data.error ?? "",
    createdAt: asTimestamp(data.createdAt),
    updatedAt: asTimestamp(data.updatedAt),
  };
}

export function subscribeToTickets(
  callback: (tickets: Ticket[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, "tickets"), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((item) =>
        normalizeTicket(item.id, item.data() as Record<string, unknown>),
      ),
    );
  });
}

export function buildTicketSla(
  severity: TicketSeverity,
  settings?: TicketMailSettings | null,
): TicketSla {
  const now = Date.now();
  const configured = settings?.sla?.[severity];
  const firstResponseHours = configured?.firstResponseHours ??
    (severity === "critical" ? 2 : severity === "high" ? 4 : severity === "medium" ? 8 : 24);
  const resolutionHours = configured?.resolutionHours ??
    (severity === "critical" ? 24 : severity === "high" ? 72 : severity === "medium" ? 120 : 240);

  return {
    firstResponseDueAt: Timestamp.fromMillis(now + firstResponseHours * 60 * 60 * 1000),
    resolutionDueAt: Timestamp.fromMillis(now + resolutionHours * 60 * 60 * 1000),
    firstRespondedAt: null,
    resolvedAt: null,
  };
}

export async function createManualTicket(input: NewTicketInput): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const year = new Date().getFullYear();
  const localNumber = `FM-${year}-MANUAL-${Date.now().toString().slice(-5)}`;
  const ref = await addDoc(collection(db, "tickets"), {
    number: localNumber,
    subject: input.subject.trim(),
    status: "nuevo",
    priority: "medium",
    severity: "medium",
    intent: "other",
    confidential: false,
    requester: input.requester,
    clientId: input.clientId ?? "",
    clientName: input.clientName ?? "",
    projectId: input.projectId ?? "",
    projectName: input.projectName ?? "",
    owner: null,
    watchers: [],
    tags: [],
    summary: "",
    duplicateOfTicketId: "",
    duplicateOfTicketNumber: "",
    triage: emptyTriage,
    ai: null,
    sla: buildTicketSla("medium"),
    taskLinks: [],
    inboundMessageCount: input.text?.trim() ? 1 : 0,
    outboundMessageCount: 0,
    lastInboundAt: input.text?.trim() ? serverTimestamp() : null,
    lastOutboundAt: null,
    lastMessageAt: serverTimestamp(),
    satisfactionScore: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    closedAt: null,
  });

  if (input.text?.trim()) {
    await addDoc(collection(db, "tickets", ref.id, "messages"), {
      direction: "inbound",
      from: input.requester,
      to: [],
      subject: input.subject.trim(),
      text: input.text.trim(),
      html: "",
      messageId: "",
      inReplyTo: "",
      references: [],
      attachments: [],
      internal: false,
      author: null,
      createdAt: serverTimestamp(),
    });
  }

  return ref.id;
}

export function subscribeToTicketMessages(
  ticketId: string,
  callback: (messages: TicketMessage[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(
    collection(db, "tickets", ticketId, "messages"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((item) =>
        normalizeMessage(item.id, item.data() as Record<string, unknown>),
      ),
    );
  });
}

export function subscribeToTicketOutbox(
  ticketId: string,
  callback: (items: TicketOutbox[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(
    collection(db, "ticketMailOutbox"),
    where("ticketId", "==", ticketId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((item) =>
        normalizeOutbox(item.id, item.data() as Record<string, unknown>),
      ),
    );
  });
}

export async function updateTicket(
  ticketId: string,
  data: TicketInput,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, "tickets", ticketId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function addInternalTicketNote(
  ticketId: string,
  text: string,
  author: TicketPerson,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await addDoc(collection(db, "tickets", ticketId, "messages"), {
    direction: "internal",
    from: { name: author.name, email: author.email ?? "" },
    to: [],
    subject: "Nota interna",
    text: text.trim(),
    html: "",
    messageId: "",
    inReplyTo: "",
    references: [],
    attachments: [],
    internal: true,
    author,
    createdAt: serverTimestamp(),
  });
  await updateTicket(ticketId, { lastMessageAt: Timestamp.now() });
}

export async function createTicketReplyOutbox(
  ticket: Ticket,
  body: string,
  approvedBy: TicketPerson,
): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const ref = await addDoc(collection(db, "ticketMailOutbox"), {
    ticketId: ticket.id,
    ticketNumber: ticket.number,
    to: [ticket.requester],
    subject: `Re: [${ticket.number}] ${ticket.subject}`,
    body: body.trim(),
    status: "approved",
    approvedBy,
    sentAt: null,
    error: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateTicket(ticket.id, {
    status: "esperando_cliente",
    "sla.firstRespondedAt": ticket.sla.firstRespondedAt ?? Timestamp.now(),
  } as TicketInput);
  return ref.id;
}

export async function findRecentTicketsByClient(
  clientId: string,
  maxCount = 8,
): Promise<Ticket[]> {
  if (!db || !clientId) return [];
  const q = query(
    collection(db, "tickets"),
    where("clientId", "==", clientId),
    orderBy("updatedAt", "desc"),
    limit(maxCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map((item) =>
    normalizeTicket(item.id, item.data() as Record<string, unknown>),
  );
}

export function isTicketClosed(ticket: Ticket): boolean {
  return ticket.status === "cerrado" || ticket.status === "spam";
}

export function isTicketUrgent(ticket: Ticket): boolean {
  return ticket.priority === "urgent" || ticket.severity === "critical";
}

export function ticketDueState(ticket: Ticket): "ok" | "risk" | "overdue" {
  const target =
    ticket.sla.firstRespondedAt || ticket.sla.firstResponseDueAt
      ? ticket.sla.resolutionDueAt
      : ticket.sla.firstResponseDueAt;

  if (!target || isTicketClosed(ticket)) return "ok";
  const dueMs = target.toMillis();
  const now = Date.now();
  if (dueMs < now) return "overdue";
  if (dueMs - now < 12 * 60 * 60 * 1000) return "risk";
  return "ok";
}

export function buildTicketQueues(
  tickets: Ticket[],
  currentUid: string | undefined,
): TicketQueue {
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayMs = todayEnd.getTime();

  return {
    all: tickets,
    nuevos: tickets.filter((ticket) => ticket.status === "nuevo" || ticket.status === "triage"),
    mios: tickets.filter((ticket) => ticket.owner?.uid && ticket.owner.uid === currentUid),
    urgentes: tickets.filter((ticket) => isTicketUrgent(ticket) || ticketDueState(ticket) === "overdue"),
    esperandoCliente: tickets.filter((ticket) => ticket.status === "esperando_cliente"),
    sinAsignar: tickets.filter((ticket) => !ticket.owner && !isTicketClosed(ticket)),
    vencenHoy: tickets.filter((ticket) => {
      const due = ticket.sla.resolutionDueAt ?? ticket.sla.firstResponseDueAt;
      return !!due && due.toMillis() <= todayMs && !isTicketClosed(ticket);
    }),
    cerrados: tickets.filter((ticket) => ticket.status === "cerrado" || ticket.status === "resuelto"),
  };
}

export function formatTicketDate(ts: Timestamp | null): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
