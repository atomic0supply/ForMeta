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

export type WikiPage = {
  id: string;
  title: string;
  content: string;
  emoji: string;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
};

export type WikiPageInput = {
  title: string;
  content: string;
  emoji: string;
  order: number;
  updatedBy: string;
};

function wikiCol(projectId: string) {
  if (!db) throw new Error("Firestore no disponible");
  return collection(db, "projects", projectId, "wiki");
}

export function subscribeToWikiPages(
  projectId: string,
  callback: (pages: WikiPage[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(wikiCol(projectId), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WikiPage)));
  });
}

export async function createWikiPage(
  projectId: string,
  input: WikiPageInput,
): Promise<string> {
  const ref = await addDoc(wikiCol(projectId), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateWikiPage(
  projectId: string,
  pageId: string,
  fields: Partial<Pick<WikiPage, "title" | "content" | "emoji" | "order">>,
  updatedBy: string,
): Promise<void> {
  if (!db) throw new Error("Firestore no disponible");
  await updateDoc(doc(db, "projects", projectId, "wiki", pageId), {
    ...fields,
    updatedBy,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteWikiPage(
  projectId: string,
  pageId: string,
): Promise<void> {
  if (!db) throw new Error("Firestore no disponible");
  await deleteDoc(doc(db, "projects", projectId, "wiki", pageId));
}
