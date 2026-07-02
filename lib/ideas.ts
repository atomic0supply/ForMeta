import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export type IdeaStatus = "draft" | "analyzing" | "questioned" | "reported" | "archived";

export type IdeaCategory =
  | "saas"
  | "ecommerce"
  | "marketplace"
  | "consulting"
  | "app_movil"
  | "automatizacion"
  | "contenido"
  | "hardware"
  | "otro";

export type AiQuestion = {
  id: string;
  text: string;
  options: string[];
};

export type IdeaLink = {
  id: string;
  label: string;
  url: string;
};

export type Idea = {
  id: string;
  title: string;
  description: string;
  status: IdeaStatus;
  category?: IdeaCategory;
  viabilityScore?: number;
  aiSummary?: string;
  aiConclusions?: string[];
  aiQuestions?: AiQuestion[];
  answers?: Record<string, string>;
  aiReport?: string;
  aiModel?: string;
  links?: IdeaLink[];
  projectId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId: string;
};

export type IdeaDraft = {
  title: string;
  description: string;
  userId: string;
};

const IDEAS_COLLECTION = "ideas";

export async function createIdea(draft: IdeaDraft): Promise<string> {
  if (!db) throw new Error("Firestore no disponible");

  const ref = await addDoc(collection(db, IDEAS_COLLECTION), {
    title: draft.title.trim(),
    description: draft.description.trim(),
    status: "draft" as IdeaStatus,
    userId: draft.userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function updateIdea(
  ideaId: string,
  fields: Partial<Omit<Idea, "id" | "createdAt">>,
): Promise<void> {
  if (!db) throw new Error("Firestore no disponible");

  const ref = doc(db, IDEAS_COLLECTION, ideaId);
  await updateDoc(ref, { ...fields, updatedAt: serverTimestamp() });
}

export async function deleteIdea(ideaId: string): Promise<void> {
  if (!db) throw new Error("Firestore no disponible");

  await deleteDoc(doc(db, IDEAS_COLLECTION, ideaId));
}

export async function listIdeas(userId: string): Promise<Idea[]> {
  if (!db) throw new Error("Firestore no disponible");

  // Acota la lectura a las 200 ideas más recientes del usuario.
  const q = query(
    collection(db, IDEAS_COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(200),
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Idea));
}

export const IDEA_CATEGORY_LABELS: Record<IdeaCategory, string> = {
  saas: "SaaS",
  ecommerce: "E-commerce",
  marketplace: "Marketplace",
  consulting: "Consultoría",
  app_movil: "App Móvil",
  automatizacion: "Automatización",
  contenido: "Contenido / Media",
  hardware: "Hardware / IoT",
  otro: "Otro",
};

export const STATUS_LABELS: Record<IdeaStatus, string> = {
  draft: "Borrador",
  analyzing: "Analizando...",
  questioned: "En preguntas",
  reported: "Con informe",
  archived: "Archivada",
};
