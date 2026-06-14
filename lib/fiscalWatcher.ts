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

import { db } from "@/lib/firebase";

export type FiscalWatcherSourceId =
  | "boe_verifactu"
  | "boe_reta"
  | "aeat_calendar"
  | "aeat_model_303"
  | "aeat_model_130"
  | "aeat_model_349"
  | "seguridad_social_reta"
  | "eu_vies"
  | "illes_balears_irpf";

export type FiscalWatcherSeverity = "info" | "review" | "urgent";
export type FiscalWatcherStatus = "new" | "reviewing" | "validated" | "dismissed";

export type FiscalWatcherSource = {
  id: FiscalWatcherSourceId;
  label: string;
  url: string;
  source: "BOE" | "AEAT" | "Seguridad Social" | "Comisión Europea" | "Illes Balears";
  affects: string[];
  keywords: string[];
};

export type FiscalWatcherAlert = {
  id: string;
  sourceId: FiscalWatcherSourceId;
  source: FiscalWatcherSource["source"];
  sourceLabel: string;
  url: string;
  detectedAt: Timestamp | null;
  sourceDate: string;
  title: string;
  summary: string;
  possibleImpact: string;
  affectedConstant: string;
  requiresValidation: boolean;
  severity: FiscalWatcherSeverity;
  status: FiscalWatcherStatus;
  signature: string;
  previousSignature?: string;
  evidence: string[];
};

export type FiscalWatcherSourceSnapshot = {
  sourceId: FiscalWatcherSourceId;
  signature: string;
  checkedAt: Timestamp | null;
};

export type FiscalWatcherRunResult = {
  checkedAt: string;
  checkedSources: number;
  createdAlerts: number;
  snapshots: Omit<FiscalWatcherSourceSnapshot, "checkedAt">[];
  alerts: Omit<FiscalWatcherAlert, "id" | "detectedAt" | "status">[];
};

export const FISCAL_WATCHER_SOURCES: FiscalWatcherSource[] = [
  {
    id: "boe_verifactu",
    label: "BOE · Verifactu / sistemas de facturación",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840",
    source: "BOE",
    affects: ["fiscal_constants/verifactu.json", "invoice_pdf", "ledger"],
    keywords: ["verifactu", "sistemas informáticos de facturación", "factura verificable", "registros de facturación"],
  },
  {
    id: "boe_reta",
    label: "BOE · bases y cotización RETA",
    url: "https://www.boe.es/buscar/boe.php?campo%5B0%5D=TITULO&dato%5B0%5D=cotizaci%C3%B3n+aut%C3%B3nomos",
    source: "BOE",
    affects: ["fiscal_constants/reta.json"],
    keywords: ["trabajadores por cuenta propia", "autónomos", "bases de cotización", "rendimientos netos"],
  },
  {
    id: "aeat_calendar",
    label: "AEAT · calendario del contribuyente",
    url: "https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html",
    source: "AEAT",
    affects: ["fiscal_constants/calendar.json"],
    keywords: ["calendario del contribuyente", "modelo 303", "modelo 130", "modelo 349", "renta"],
  },
  {
    id: "aeat_model_303",
    label: "AEAT · Modelo 303",
    url: "https://sede.agenciatributaria.gob.es/Sede/iva/presentar-declaracion-iva-modelo-303.html",
    source: "AEAT",
    affects: ["fiscal_constants/model_303.json"],
    keywords: ["modelo 303", "iva", "autoliquidación"],
  },
  {
    id: "aeat_model_130",
    label: "AEAT · Modelo 130",
    url: "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/irpf/modelo-130-irpf-empresarios-profesionales-estimacion-directa-pago-fraccionado.html",
    source: "AEAT",
    affects: ["fiscal_constants/model_130.json"],
    keywords: ["modelo 130", "pago fraccionado", "estimación directa", "retención"],
  },
  {
    id: "aeat_model_349",
    label: "AEAT · Modelo 349",
    url: "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-349-declaracion-recapitulativa-operaciones-intracomunitarias.html",
    source: "AEAT",
    affects: ["fiscal_constants/model_349.json"],
    keywords: ["modelo 349", "operaciones intracomunitarias", "declaración recapitulativa"],
  },
  {
    id: "seguridad_social_reta",
    label: "Seguridad Social · tramos RETA",
    url: "https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/10721/10724/1320/1322?changeLanguage=es",
    source: "Seguridad Social",
    affects: ["fiscal_constants/reta.json"],
    keywords: ["tabla de rendimientos", "base mínima", "base máxima", "trabajadores autónomos"],
  },
  {
    id: "eu_vies",
    label: "Comisión Europea · VIES",
    url: "https://ec.europa.eu/taxation_customs/vies/#/vat-validation",
    source: "Comisión Europea",
    affects: ["vies_validation", "client_tax_profiles"],
    keywords: ["vies", "vat validation", "check vat"],
  },
  {
    id: "illes_balears_irpf",
    label: "Illes Balears · escala autonómica IRPF",
    url: "https://www.caib.es/sites/tributs/es/impuesto_sobre_la_renta_de_las_personas_fisicas/",
    source: "Illes Balears",
    affects: ["fiscal_constants/irpf_illes_balears.json"],
    keywords: ["irpf", "escala autonómica", "illes balears", "renta"],
  },
];

export function subscribeFiscalWatcherAlerts(
  callback: (alerts: FiscalWatcherAlert[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, "fiscalWatcherAlerts"), orderBy("detectedAt", "desc"), limit(80));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FiscalWatcherAlert, "id">) })));
  });
}

export function subscribeFiscalWatcherSourceSignatures(
  callback: (signatures: Record<string, string>) => void,
): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(collection(db, "fiscalWatcherSources"), (snap) => {
    callback(Object.fromEntries(snap.docs.map((d) => [d.id, (d.data() as FiscalWatcherSourceSnapshot).signature])));
  });
}

export async function updateFiscalWatcherAlertStatus(
  id: string,
  status: FiscalWatcherStatus,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, "fiscalWatcherAlerts", id), { status });
}

export async function createFiscalWatcherAlert(
  alert: Omit<FiscalWatcherAlert, "id" | "detectedAt" | "status">,
): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const ref = await addDoc(collection(db, "fiscalWatcherAlerts"), {
    ...alert,
    status: "new",
    detectedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function saveFiscalWatcherSourceSignature(
  sourceId: FiscalWatcherSourceId,
  signature: string,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await setDoc(doc(db, "fiscalWatcherSources", sourceId), {
    sourceId,
    signature,
    checkedAt: serverTimestamp(),
  });
}

export async function runFiscalWatcher(previousSignatures: Record<string, string>): Promise<FiscalWatcherRunResult> {
  const alerts: Omit<FiscalWatcherAlert, "id" | "detectedAt" | "status">[] = [];
  const snapshots: Omit<FiscalWatcherSourceSnapshot, "checkedAt">[] = [];

  for (const source of FISCAL_WATCHER_SOURCES) {
    const snapshot = await inspectSource(source);
    snapshots.push({ sourceId: source.id, signature: snapshot.signature });
    const previousSignature = previousSignatures[source.id] ?? "";
    if (previousSignature && previousSignature !== snapshot.signature) {
      alerts.push(buildAlert(source, snapshot, previousSignature));
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    checkedSources: FISCAL_WATCHER_SOURCES.length,
    createdAlerts: alerts.length,
    snapshots,
    alerts,
  };
}

async function inspectSource(source: FiscalWatcherSource): Promise<{
  signature: string;
  sourceDate: string;
  title: string;
  summary: string;
  evidence: string[];
}> {
  try {
    const response = await fetch(source.url, {
      headers: { Accept: "text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.8" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const text = await response.text();
    const normalized = normalizeText(text).slice(0, 120000);
    const keywordEvidence = source.keywords
      .map((keyword) => findEvidence(normalized, keyword))
      .filter(Boolean)
      .slice(0, 5) as string[];
    const lastModified = response.headers.get("last-modified") ?? "";
    const signature = await sha256(`${response.status}|${lastModified}|${source.url}|${normalized}`);
    const sourceDate = extractDate(normalized) || lastModified || new Date().toISOString().slice(0, 10);

    return {
      signature,
      sourceDate,
      title: source.label,
      summary: keywordEvidence[0] ?? `Contenido de ${source.label} comprobado.`,
      evidence: keywordEvidence.length > 0 ? keywordEvidence : [`HTTP ${response.status}`],
    };
  } catch (error) {
    const signature = await sha256(`${source.url}|error|${error instanceof Error ? error.message : "unknown"}`);
    return {
      signature,
      sourceDate: new Date().toISOString().slice(0, 10),
      title: source.label,
      summary: "No se pudo comprobar la fuente. Requiere revisión de conectividad.",
      evidence: [error instanceof Error ? error.message : "Error desconocido"],
    };
  }
}

function buildAlert(
  source: FiscalWatcherSource,
  snapshot: Awaited<ReturnType<typeof inspectSource>>,
  previousSignature: string,
): Omit<FiscalWatcherAlert, "id" | "detectedAt" | "status"> {
  return {
    sourceId: source.id,
    source: source.source,
    sourceLabel: source.label,
    url: source.url,
    sourceDate: snapshot.sourceDate,
    title: `${source.label}: posible novedad detectada`,
    summary: snapshot.summary,
    possibleImpact: possibleImpact(source),
    affectedConstant: source.affects.join(", "),
    requiresValidation: true,
    severity: source.id.includes("boe") || source.id.includes("reta") ? "urgent" : "review",
    signature: snapshot.signature,
    previousSignature,
    evidence: snapshot.evidence,
  };
}

function possibleImpact(source: FiscalWatcherSource): string {
  if (source.id.includes("reta")) return "Puede cambiar la cuota mensual estimada de autónomos y proyecciones de caja.";
  if (source.id.includes("303")) return "Puede cambiar el resumen de IVA trimestral o los plazos de presentación.";
  if (source.id.includes("130")) return "Puede cambiar la estimación de pagos fraccionados IRPF.";
  if (source.id.includes("349")) return "Puede cambiar obligaciones de operaciones intracomunitarias.";
  if (source.id.includes("verifactu")) return "Puede afectar numeración, QR/verificación, registros de facturación y PDF.";
  if (source.id.includes("vies")) return "Puede afectar validación de clientes UE.";
  if (source.id.includes("illes")) return "Puede afectar simulaciones de renta autonómica.";
  return "Puede afectar calendario fiscal, obligaciones o constantes.";
}

function normalizeText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findEvidence(text: string, keyword: string): string | null {
  const normalizedKeyword = keyword.toLowerCase();
  const index = text.indexOf(normalizedKeyword);
  if (index === -1) return null;
  return text.slice(Math.max(0, index - 120), Math.min(text.length, index + normalizedKeyword.length + 180));
}

function extractDate(text: string): string {
  const match = text.match(/(\d{1,2})[/-](\d{1,2})[/-](20\d{2})/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
