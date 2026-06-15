import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { ClientMailKind } from "@/lib/clientMailTemplates";

export type { ClientMailKind } from "@/lib/clientMailTemplates";

// Cola de notificaciones al cliente. Espeja el patrón ticketMailOutbox: el equipo
// compone (draft), previsualiza y aprueba; el worker solo envía las "approved".
export type ClientMailStatus = "draft" | "approved" | "sending" | "sent" | "failed";

export const CLIENT_MAIL_KINDS: ClientMailKind[] = [
  "proposal",
  "improvement_quote",
  "service_unavailable",
  "general",
];

const CLIENT_MAIL_KIND_LABELS: Record<ClientMailKind, string> = {
  proposal: "Propuesta",
  improvement_quote: "Presupuesto de mejora",
  service_unavailable: "Servicio no disponible",
  general: "General",
};

export function clientMailKindLabel(kind: ClientMailKind): string {
  return CLIENT_MAIL_KIND_LABELS[kind] ?? kind;
}

export type ClientMailRecipient = {
  name: string;
  email: string;
};

export type ClientMailApprover = {
  uid: string;
  name: string;
  email?: string;
};

export type ClientMailRelated = {
  type: "proposal" | "client" | "project" | "service" | "none";
  id: string;
};

export type ClientMailOutbox = {
  id: string;
  kind: ClientMailKind;
  to: ClientMailRecipient[];
  cc?: ClientMailRecipient[];
  subject: string;
  templateData: Record<string, unknown>;
  html: string; // contenido YA renderizado (el worker lo envía verbatim)
  text: string;
  status: ClientMailStatus;
  approvedBy: ClientMailApprover | null;
  relatedEntity: ClientMailRelated | null;
  clientId: string;
  sentAt: Timestamp | null;
  error: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type ClientNotificationInput = {
  kind: ClientMailKind;
  to: ClientMailRecipient[];
  cc?: ClientMailRecipient[];
  subject: string;
  templateData: Record<string, unknown>;
  html: string;
  text: string;
  clientId: string;
  relatedEntity?: ClientMailRelated | null;
};

const COL = "clientMailOutbox";

export function subscribeToClientMailOutbox(
  callback: (items: ClientMailOutbox[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClientMailOutbox, "id">) })),
    );
  });
}

export async function createClientNotification(
  input: ClientNotificationInput,
): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const ref = await addDoc(collection(db, COL), {
    kind: input.kind,
    to: input.to,
    cc: input.cc ?? [],
    subject: input.subject,
    templateData: input.templateData,
    html: input.html,
    text: input.text,
    clientId: input.clientId,
    relatedEntity: input.relatedEntity ?? null,
    status: "draft",
    approvedBy: null,
    sentAt: null,
    error: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateClientNotification(
  id: string,
  data: Partial<Omit<ClientMailOutbox, "id" | "createdAt">>,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

export async function approveClientNotification(
  id: string,
  approvedBy: ClientMailApprover,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, COL, id), {
    status: "approved",
    approvedBy,
    error: "",
    updatedAt: serverTimestamp(),
  });
}

export async function deleteClientNotification(id: string): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await deleteDoc(doc(db, COL, id));
}
