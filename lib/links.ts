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

export type Link = {
  id: string;
  title: string;
  url: string;
  category: string;
  description: string;
  createdAt: Timestamp | null;
};

export type LinkInput = Omit<Link, "id" | "createdAt">;

export function subscribeToLinks(
  callback: (links: Link[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, "links"), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => {
      const links = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Link, "id">),
      }));
      callback(links);
    },
    (error) => {
      // Sin este callback un fallo de Firestore dejaría la vista en "Cargando…" para siempre.
      console.error("subscribeToLinks:", error);
      callback([]);
    },
  );
}

export async function createLink(data: LinkInput): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const ref = await addDoc(collection(db, "links"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateLink(
  id: string,
  data: Partial<LinkInput>,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, "links", id), data);
}

export async function deleteLink(id: string): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await deleteDoc(doc(db, "links", id));
}
