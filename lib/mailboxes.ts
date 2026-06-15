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

// Correo = alias / direcciones de Workspace y a qué buzón real entregan,
// con una descripción de para qué se usa cada uno.
export type Mailbox = {
  id: string;
  alias: string; // dirección o alias (p. ej. soporte@formeta.es)
  account: string; // cuenta/buzón real al que entrega (p. ej. formeta@formeta.es)
  description: string; // para qué se usa este buzón
  tool: string; // herramienta de Workspace (p. ej. "API de Gmail")
  active: boolean;
  notes: string;
  createdAt: Timestamp | null;
};

export type MailboxInput = Omit<Mailbox, "id" | "createdAt">;

const COL = "mailboxes";

export function subscribeToMailboxes(callback: (mailboxes: Mailbox[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, COL), orderBy("alias", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Mailbox, "id">) })));
  });
}

export async function createMailbox(data: MailboxInput): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const ref = await addDoc(collection(db, COL), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateMailbox(id: string, data: Partial<MailboxInput>): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>);
}

export async function deleteMailbox(id: string): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await deleteDoc(doc(db, COL, id));
}
