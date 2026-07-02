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

export type EndpointMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiEndpoint = {
  id: string;
  name: string;
  url: string;
  method: EndpointMethod;
  notes: string;
  createdAt: Timestamp | null;
};

export type ApiEndpointInput = Omit<ApiEndpoint, "id" | "createdAt">;

function endpointsCol(projectId: string) {
  if (!db) throw new Error("Firebase no disponible");
  return collection(db, "projects", projectId, "endpoints");
}

export function subscribeToEndpoints(
  projectId: string,
  callback: (endpoints: ApiEndpoint[]) => void,
): Unsubscribe {
  if (!db) return () => {};

  const q = query(
    collection(db, "projects", projectId, "endpoints"),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(
    q,
    (snap) => {
      const endpoints = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ApiEndpoint, "id">),
      }));
      callback(endpoints);
    },
    (error) => {
      // Sin este callback un fallo de Firestore dejaría la vista en "Cargando…" para siempre.
      console.error("subscribeToEndpoints:", error);
      callback([]);
    },
  );
}

export async function createEndpoint(
  projectId: string,
  data: ApiEndpointInput,
): Promise<string> {
  const col = endpointsCol(projectId);
  const ref = await addDoc(col, { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateEndpoint(
  projectId: string,
  endpointId: string,
  data: Partial<ApiEndpointInput>,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(
    doc(db, "projects", projectId, "endpoints", endpointId),
    data,
  );
}

export async function deleteEndpoint(
  projectId: string,
  endpointId: string,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await deleteDoc(doc(db, "projects", projectId, "endpoints", endpointId));
}
