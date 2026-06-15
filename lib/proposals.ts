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
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { InvoiceLine } from "@/lib/fiscal";

// Propuesta = presupuesto enviado al cliente antes de facturar. Entidad ligera:
// el equipo marca aceptada/rechazada manualmente (sin página pública de aceptación).
export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export const PROPOSAL_STATUSES: ProposalStatus[] = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
];

const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Caducada",
};

export function proposalStatusLabel(status: ProposalStatus): string {
  return PROPOSAL_STATUS_LABELS[status] ?? status;
}

// Comparte forma con InvoiceLine para que la conversión a factura sea trivial.
export type ProposalLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxableBase: number;
};

export type ProposalTotals = {
  subtotal: number; // pre-impuestos; IVA/IRPF se calcula al emitir la factura
};

export type ProposalDecisionBy = {
  uid: string;
  name: string;
};

export type Proposal = {
  id: string;
  number: string; // "PROP-2026-00001"
  clientId: string;
  clientName: string; // snapshot denormalizado
  projectId: string; // opcional ("")
  projectName: string;
  title: string;
  scope: string;
  lines: ProposalLine[];
  totals: ProposalTotals;
  currency: string;
  validUntil: string; // "YYYY-MM-DD"
  status: ProposalStatus;
  sentAt: Timestamp | null;
  decidedAt: Timestamp | null;
  decidedBy: ProposalDecisionBy | null;
  convertedInvoiceId: string;
  convertedProjectId: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type ProposalInput = Omit<
  Proposal,
  | "id"
  | "number"
  | "sentAt"
  | "decidedAt"
  | "decidedBy"
  | "convertedInvoiceId"
  | "convertedProjectId"
  | "createdAt"
  | "updatedAt"
>;

const COL = "proposals";

/* ── Helpers ───────────────────────────────────────────────────────── */

function makeLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `p_${Math.abs(hashString(String(Date.now())))}`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function makeProposalLine(input: {
  description: string;
  quantity: number;
  unitPrice: number;
}): ProposalLine {
  const quantity = Number.isFinite(input.quantity) ? input.quantity : 0;
  const unitPrice = Number.isFinite(input.unitPrice) ? input.unitPrice : 0;
  return {
    id: makeLocalId(),
    description: input.description.trim(),
    quantity,
    unitPrice,
    taxableBase: roundMoney(quantity * unitPrice),
  };
}

export function calculateProposalSubtotal(lines: ProposalLine[]): number {
  return roundMoney(lines.reduce((sum, line) => sum + line.taxableBase, 0));
}

// Puente a facturación: convierte las líneas de propuesta en líneas de factura,
// arrastrando el proyecto vinculado si lo hay.
export function proposalLinesToInvoiceLines(proposal: Proposal): InvoiceLine[] {
  return proposal.lines.map((line) => ({
    id: line.id,
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    taxableBase: line.taxableBase,
    ...(proposal.projectId
      ? { projectId: proposal.projectId, projectName: proposal.projectName }
      : {}),
  }));
}

// Solo display: no muta Firestore. Marca como caducada visualmente.
export function isProposalExpired(proposal: Proposal): boolean {
  if (proposal.status === "accepted" || proposal.status === "rejected") return false;
  if (!proposal.validUntil) return false;
  const due = new Date(`${proposal.validUntil}T23:59:59`);
  return due.getTime() < Date.now();
}

function makeProposalNumber(): string {
  const year = new Date().getFullYear();
  // Esquema timestamp (como createManualTicket) para evitar el contador
  // systemCounters, cuyo write es admin-only.
  const suffix = String(Date.now()).slice(-5);
  return `PROP-${year}-${suffix}`;
}

/* ── Firestore I/O ─────────────────────────────────────────────────── */

export function subscribeToProposals(
  callback: (proposals: Proposal[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Proposal, "id">) })));
  });
}

export function subscribeToProposalsByClient(
  clientId: string,
  callback: (proposals: Proposal[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(
    collection(db, COL),
    where("clientId", "==", clientId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Proposal, "id">) })));
  });
}

export async function createProposal(input: ProposalInput): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const ref = await addDoc(collection(db, COL), {
    ...input,
    number: makeProposalNumber(),
    status: input.status ?? "draft",
    sentAt: null,
    decidedAt: null,
    decidedBy: null,
    convertedInvoiceId: "",
    convertedProjectId: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProposal(
  id: string,
  data: Partial<Omit<Proposal, "id" | "createdAt">>,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

export async function deleteProposal(id: string): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await deleteDoc(doc(db, COL, id));
}

export async function markProposalSent(id: string): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, COL, id), {
    status: "sent",
    sentAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function setProposalDecision(
  id: string,
  decision: "accepted" | "rejected",
  by: ProposalDecisionBy,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, COL, id), {
    status: decision,
    decidedAt: serverTimestamp(),
    decidedBy: by,
    updatedAt: serverTimestamp(),
  });
}
