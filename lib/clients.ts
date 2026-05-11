import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* ── Types ─────────────────────────────────────────────────────────── */

export type ClientStatus = "activo" | "lead" | "pausado" | "archivado";

export const CLIENT_STATUSES: ClientStatus[] = ["activo", "lead", "pausado", "archivado"];

export function clientStatusLabel(s: ClientStatus): string {
  switch (s) {
    case "activo":     return "Activo";
    case "lead":       return "Lead";
    case "pausado":    return "Pausado";
    case "archivado":  return "Archivado";
  }
}

export type ClientContact = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
};

export type ClientLink = {
  id: string;
  label: string;
  url: string;
};

export type Client = {
  id: string;
  name: string;
  sector: string;
  // Primary contact
  contact: string;
  email: string;
  phone: string;
  // Extended (since v2)
  status: ClientStatus;
  website: string;
  contacts: ClientContact[];
  links: ClientLink[];
  notes: string;
  createdAt: Timestamp | null;
};

export type ClientInput = Omit<Client, "id" | "createdAt">;

/* ── Normalization (handles pre-v2 records) ────────────────────────── */

function normalizeClient(id: string, raw: Record<string, unknown>): Client {
  const data = raw as Partial<Client>;
  return {
    id,
    name:     data.name     ?? "",
    sector:   data.sector   ?? "",
    contact:  data.contact  ?? "",
    email:    data.email    ?? "",
    phone:    data.phone    ?? "",
    status:   (data.status as ClientStatus) ?? "activo",
    website:  data.website  ?? "",
    contacts: Array.isArray(data.contacts) ? data.contacts : [],
    links:    Array.isArray(data.links)    ? data.links    : [],
    notes:    data.notes    ?? "",
    createdAt: (data.createdAt as Timestamp | null) ?? null,
  };
}

/* ── Firestore I/O ─────────────────────────────────────────────────── */

export function subscribeToClients(
  callback: (clients: Client[]) => void,
): Unsubscribe {
  if (!db) return () => {};

  const q = query(collection(db, "clients"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snap) => {
    const clients = snap.docs.map((d) => normalizeClient(d.id, d.data() as Record<string, unknown>));
    callback(clients);
  });
}

export async function getClient(id: string): Promise<Client | null> {
  if (!db) return null;

  const snap = await getDoc(doc(db, "clients", id));
  if (!snap.exists()) return null;

  return normalizeClient(snap.id, snap.data() as Record<string, unknown>);
}

export async function createClient(data: ClientInput): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");

  const ref = await addDoc(collection(db, "clients"), {
    ...data,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function updateClient(
  id: string,
  data: Partial<ClientInput>,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, "clients", id), data);
}

export async function deleteClient(id: string): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await deleteDoc(doc(db, "clients", id));
}
