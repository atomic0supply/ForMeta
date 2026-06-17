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
  where,
} from "firebase/firestore";

import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { logActivity } from "@/lib/activityLog";

export type ProjectStatus = "activo" | "pausado" | "cerrado";

export type Project = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  status: ProjectStatus;
  description: string;
  tags: string[];
  notes: string;
  githubUrl: string;
  firebaseUrl: string;
  localPath: string;
  devUrl: string;
  externalUrl: string;
  hourlyRate?: number;
  budgetHours?: number | null;
  currency?: string;
  taskPlanningSummary?: string;
  taskPlanningUpdatedAt?: Timestamp | null;
  driveFolderId?: string; // carpeta raíz del proyecto en la Unidad compartida de Drive
  createdAt: Timestamp | null;
};

export type ProjectInput = Omit<Project, "id" | "createdAt">;

export function subscribeToProjects(
  callback: (projects: Project[]) => void,
): Unsubscribe {
  if (!db) return () => {};

  const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snap) => {
    const projects = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Project, "id">),
    }));
    callback(projects);
  });
}

export function subscribeToProjectsByClient(
  clientId: string,
  callback: (projects: Project[]) => void,
): Unsubscribe {
  if (!db) return () => {};

  const q = query(
    collection(db, "projects"),
    where("clientId", "==", clientId),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(q, (snap) => {
    const projects = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Project, "id">),
    }));
    callback(projects);
  });
}

export async function getProject(id: string): Promise<Project | null> {
  if (!db) return null;

  const snap = await getDoc(doc(db, "projects", id));
  if (!snap.exists()) return null;

  return { id: snap.id, ...(snap.data() as Omit<Project, "id">) };
}

export async function createProject(data: ProjectInput): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");

  const ref = await addDoc(collection(db, "projects"), {
    ...data,
    createdAt: serverTimestamp(),
  });

  const actor = auth?.currentUser;
  void logActivity({
    type: "project_created",
    actorUid: actor?.uid ?? "",
    actorName: actor?.displayName ?? actor?.email ?? "Usuario",
    projectId: ref.id,
    projectName: data.name,
    payload: {},
  });

  return ref.id;
}

export async function updateProject(
  id: string,
  data: Partial<ProjectInput>,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, "projects", id), data);
  if (data.name) {
    const actor = auth?.currentUser;
    void logActivity({
      type: "project_updated",
      actorUid: actor?.uid ?? "",
      actorName: actor?.displayName ?? actor?.email ?? "Usuario",
      projectId: id,
      projectName: data.name,
      payload: {},
    });
  }
}

export async function deleteProject(id: string): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await deleteDoc(doc(db, "projects", id));
}
