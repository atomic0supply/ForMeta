import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import * as QRCode from "qrcode";

import { db } from "@/lib/firebase";
import type { Invoice } from "@/lib/fiscal";

export type VerifactuMode = "disabled" | "sif" | "verifactu";
export type VerifactuEnvironment = "test" | "production";
export type VerifactuQueueStatus =
  | "draft"
  | "queued"
  | "sending"
  | "accepted"
  | "rejected"
  | "retrying"
  | "failed"
  | "certificate_required";

export type VerifactuConfig = {
  id: "default";
  mode: VerifactuMode;
  environment: VerifactuEnvironment;
  systemName: string;
  systemId: string;
  producerName: string;
  producerTaxId: string;
  certificateAlias: string;
  responsibleDeclarationAccepted: boolean;
  responsibleDeclarationText: string;
  updatedAt?: Timestamp | null;
};

export type VerifactuPayload = {
  issuerTaxId: string;
  issuerName: string;
  invoiceNumber: string;
  invoiceSeries: string;
  issueDate: string;
  operationDate: string;
  invoiceType: "F1" | "F2" | "R1";
  recipientName: string;
  recipientTaxId: string;
  regime: string;
  taxableBase: number;
  vatAmount: number;
  withholdingAmount: number;
  totalAmount: number;
  previousRecordHash: string;
  recordHash: string;
  generatedAt: string;
  system: {
    name: string;
    id: string;
    producerName: string;
    producerTaxId: string;
  };
};

export type VerifactuRecord = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  mode: VerifactuMode;
  qrUrl: string;
  qrSvg: string;
  payload: VerifactuPayload;
  recordHash: string;
  previousRecordHash: string;
  chainValid: boolean;
  status: VerifactuQueueStatus;
  attempts: number;
  nextRetryAt: string;
  lastError: string;
  aeatResponseCode: string;
  aeatResponseMessage: string;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
};

export type VerifactuChainCheck = {
  valid: boolean;
  checked: number;
  brokenAt?: string;
  reason?: string;
};

export const DEFAULT_VERIFACTU_CONFIG: VerifactuConfig = {
  id: "default",
  mode: "sif",
  environment: "test",
  systemName: "ForMeta",
  systemId: "FORMETA-SIF-001",
  producerName: "ForMeta",
  producerTaxId: "",
  certificateAlias: "",
  responsibleDeclarationAccepted: false,
  responsibleDeclarationText: [
    "ForMeta declara que el sistema genera registros de facturación íntegros, trazables e inalterables,",
    "calcula huella encadenada, conserva eventos y no permite borrar facturas emitidas.",
    "Esta declaración debe revisarse y firmarse por la persona o entidad productora antes de activar producción.",
  ].join(" "),
  updatedAt: null,
};

export function subscribeVerifactuConfig(callback: (config: VerifactuConfig) => void): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(doc(db, "verifactuConfig", "default"), (snap) => {
    callback({ ...DEFAULT_VERIFACTU_CONFIG, ...(snap.data() as Partial<VerifactuConfig> | undefined), id: "default" });
  });
}

export function subscribeVerifactuRecords(callback: (records: VerifactuRecord[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, "verifactuRecords"), orderBy("createdAt", "desc"), limit(100));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VerifactuRecord, "id">) })));
  });
}

export async function saveVerifactuConfig(config: VerifactuConfig): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await setDoc(doc(db, "verifactuConfig", "default"), {
    ...config,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function buildVerifactuArtifacts(
  invoice: Invoice,
  config: VerifactuConfig,
  previousRecord?: VerifactuRecord | null,
): Promise<Omit<VerifactuRecord, "id" | "createdAt" | "updatedAt">> {
  const previousRecordHash = previousRecord?.recordHash || invoice.previousLedgerHash || "GENESIS";
  const payloadBase = buildPayloadBase(invoice, config, previousRecordHash);
  const recordHash = await sha256(stableStringify(payloadBase));
  const payload = { ...payloadBase, recordHash };
  const qrUrl = buildVerifactuQrUrl(invoice);
  const qrSvg = await QRCode.toString(qrUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 164,
  });

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    mode: config.mode,
    qrUrl,
    qrSvg,
    payload,
    recordHash,
    previousRecordHash,
    chainValid: previousRecord ? previousRecord.recordHash === previousRecordHash : Boolean(previousRecordHash),
    status: config.mode === "disabled" ? "draft" : "queued",
    attempts: 0,
    nextRetryAt: new Date().toISOString(),
    lastError: "",
    aeatResponseCode: "",
    aeatResponseMessage: "",
  };
}

export async function enqueueVerifactuRecord(
  invoice: Invoice,
  config: VerifactuConfig,
  previousRecord?: VerifactuRecord | null,
): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const artifact = await buildVerifactuArtifacts(invoice, config, previousRecord);
  const ref = await addDoc(collection(db, "verifactuRecords"), {
    ...artifact,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function markVerifactuRecordStatus(
  recordId: string,
  patch: Partial<Pick<VerifactuRecord, "status" | "attempts" | "nextRetryAt" | "lastError" | "aeatResponseCode" | "aeatResponseMessage">>,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, "verifactuRecords", recordId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export function verifyVerifactuChain(records: VerifactuRecord[]): VerifactuChainCheck {
  const ordered = [...records].sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber));
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index].previousRecordHash !== ordered[index - 1].recordHash) {
      return {
        valid: false,
        checked: ordered.length,
        brokenAt: ordered[index].invoiceNumber,
        reason: `El hash anterior no coincide con ${ordered[index - 1].invoiceNumber}`,
      };
    }
  }
  return { valid: true, checked: ordered.length };
}

export function findLatestVerifactuRecord(records: VerifactuRecord[]): VerifactuRecord | null {
  return [...records].sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber))[0] ?? null;
}

export function verifactuStatusLabel(status: VerifactuQueueStatus): string {
  switch (status) {
    case "draft": return "Borrador";
    case "queued": return "En cola";
    case "sending": return "Enviando";
    case "accepted": return "Aceptado AEAT";
    case "rejected": return "Rechazado";
    case "retrying": return "Reintento";
    case "failed": return "Fallido";
    case "certificate_required": return "Falta certificado";
  }
}

function buildPayloadBase(
  invoice: Invoice,
  config: VerifactuConfig,
  previousRecordHash: string,
): Omit<VerifactuPayload, "recordHash"> {
  return {
    issuerTaxId: invoice.issuer.taxId,
    issuerName: invoice.issuer.legalName || invoice.issuer.tradeName,
    invoiceNumber: invoice.number,
    invoiceSeries: invoice.series,
    issueDate: invoice.issueDate,
    operationDate: invoice.issueDate,
    invoiceType: invoice.status === "cancelled" ? "R1" : "F1",
    recipientName: invoice.client.tax.fiscalName || invoice.client.name,
    recipientTaxId: invoice.client.tax.taxId || invoice.client.tax.vatNumber || "",
    regime: invoice.regime,
    taxableBase: invoice.totals.subtotal,
    vatAmount: invoice.totals.vat,
    withholdingAmount: invoice.totals.withholding,
    totalAmount: invoice.totals.total,
    previousRecordHash,
    generatedAt: new Date().toISOString(),
    system: {
      name: config.systemName,
      id: config.systemId,
      producerName: config.producerName,
      producerTaxId: config.producerTaxId,
    },
  };
}

function buildVerifactuQrUrl(invoice: Invoice): string {
  const params = new URLSearchParams({
    nif: invoice.issuer.taxId,
    numserie: invoice.number,
    fecha: invoice.issueDate,
    importe: invoice.totals.total.toFixed(2),
  });
  return `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?${params.toString()}`;
}

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(",")}}`;
}
