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
import { daysUntilExpiry } from "@/lib/expiry";

/* ── Types ──────────────────────────────────────────────────────────────── */

export type DomainLink = {
  label: string;
  url: string;
};

export type Domain = {
  id: string;
  name: string;              // "example.com"
  registrar: string;         // "GoDaddy", "Namecheap"…
  registrationDate: string;  // "YYYY-MM-DD"
  expiryDate: string;        // "YYYY-MM-DD"
  autoRenew: boolean;
  price: number;
  currency: string;          // "EUR" | "USD"
  projectId: string | null;
  projectName: string | null;
  dnsNotes: string;
  links: DomainLink[];
  notes: string;
  createdAt: Timestamp | null;
};

export type DomainInput = Omit<Domain, "id" | "createdAt">;

/* ── Expiry helpers (shared) ────────────────────────────────────────────── */

export {
  expiryStatus,
  expiryLabel,
  type ExpiryStatus,
} from "@/lib/expiry";
export { daysUntilExpiry };

/* ── Firestore CRUD ─────────────────────────────────────────────────────── */

const COL = "domains";

export function subscribeToDomains(
  callback: (domains: Domain[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, COL), orderBy("expiryDate", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Domain, "id">) })));
  });
}

/** Devuelve los dominios que vencen dentro de los próximos `days` días (incluye ya vencidos). */
export function subscribeToExpiringDomains(
  callback: (domains: Domain[]) => void,
  days = 60,
): Unsubscribe {
  return subscribeToDomains((all) => {
    callback(all.filter((d) => daysUntilExpiry(d.expiryDate) < days));
  });
}

export async function createDomain(data: DomainInput): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDomain(id: string, data: Partial<DomainInput>): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>);
}

export async function deleteDomain(id: string): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await deleteDoc(doc(db, COL, id));
}
