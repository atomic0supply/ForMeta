import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export type ApiEnvironment = "prod" | "test" | "dev";

export type ExternalApi = {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  docUrl: string;
  environment: ApiEnvironment;
  notes: string;
  expiresAt?: string; // "YYYY-MM-DD" — caducidad de la API/clave
  createdAt: Timestamp | null;
};

export type ExternalApiInput = Omit<ExternalApi, "id" | "createdAt">;

// API enriquecida con el proyecto al que pertenece (vista global de Servicios).
export type ExternalApiWithProject = ExternalApi & {
  projectId: string;
  projectName: string | null;
};

export function subscribeToExternalApis(
  projectId: string,
  callback: (apis: ExternalApi[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(
    collection(db, "projects", projectId, "externalApis"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      const apis = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ExternalApi, "id">),
      }));
      callback(apis);
    },
    (error) => {
      // Sin este callback un fallo de Firestore dejaría la vista en "Cargando…" para siempre.
      console.error("subscribeToExternalApis:", error);
      callback([]);
    },
  );
}

export async function createExternalApi(
  projectId: string,
  data: ExternalApiInput,
): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const ref = await addDoc(
    collection(db, "projects", projectId, "externalApis"),
    { ...data, createdAt: serverTimestamp() },
  );
  return ref.id;
}

export async function updateExternalApi(
  projectId: string,
  apiId: string,
  data: Partial<ExternalApiInput>,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(
    doc(db, "projects", projectId, "externalApis", apiId),
    data,
  );
}

export async function deleteExternalApi(
  projectId: string,
  apiId: string,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await deleteDoc(doc(db, "projects", projectId, "externalApis", apiId));
}

/**
 * Suscripción a TODAS las APIs de todos los proyectos (collectionGroup).
 * Resuelve el id del proyecto desde la ruta del documento; el nombre del
 * proyecto se resuelve con el mapa que pase el llamante.
 */
export function subscribeToAllExternalApis(
  callback: (apis: ExternalApiWithProject[]) => void,
  resolveProjectName: (projectId: string) => string | null = () => null,
): Unsubscribe {
  if (!db) return () => {};
  // Sin orderBy: una query collectionGroup con orden requeriría un índice
  // COLLECTION_GROUP dedicado. El orden se hace en cliente (AllApisTab).
  // limit(500): la vista global no debe descargar un número ilimitado de docs.
  // NOTA: los documentos incluyen el campo secreto `apiKey` (Firestore no
  // permite proyectar campos en cliente); separarlo requeriría una migración
  // de datos. Mientras tanto, la vista global (AllApisTab) no debe mostrarlo.
  const q = query(collectionGroup(db, "externalApis"), limit(500));
  return onSnapshot(
    q,
    (snap) => {
      const apis = snap.docs.map((d) => {
        const projectId = d.ref.parent.parent?.id ?? "";
        return {
          id: d.id,
          ...(d.data() as Omit<ExternalApi, "id">),
          projectId,
          projectName: resolveProjectName(projectId),
        };
      });
      callback(apis);
    },
    (error) => {
      // Sin este callback un fallo de Firestore dejaría la vista en "Cargando…" para siempre.
      console.error("subscribeToAllExternalApis:", error);
      callback([]);
    },
  );
}
