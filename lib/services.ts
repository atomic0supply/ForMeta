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

export type ServiceCategory = "hosting" | "infra" | "saas" | "otros";
export type BillingCycle = "monthly" | "yearly" | "quarterly" | "oneoff";

export type ServiceLink = {
  label: string;
  url: string;
};

// Servicios = infraestructura contratada (Google Cloud, Firebase, VPS, SaaS…).
export type Service = {
  id: string;
  name: string;
  provider: string;
  category: ServiceCategory;
  cost: number;
  currency: string;
  billingCycle: BillingCycle;
  renewalDate: string; // "YYYY-MM-DD"
  autoRenew: boolean;
  projectId: string | null;
  projectName: string | null;
  notes: string;
  links: ServiceLink[];
  createdAt: Timestamp | null;
};

export type ServiceInput = Omit<Service, "id" | "createdAt">;

const COL = "services";

export function subscribeToServices(callback: (services: Service[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, COL), orderBy("renewalDate", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Service, "id">) })));
  });
}

export async function createService(data: ServiceInput): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const ref = await addDoc(collection(db, COL), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateService(id: string, data: Partial<ServiceInput>): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>);
}

export async function deleteService(id: string): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await deleteDoc(doc(db, COL, id));
}
