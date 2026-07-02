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

// Licencias = software con proveedor, asientos, caducidad y coste.
export type License = {
  id: string;
  name: string;
  vendor: string;
  seats: number;
  cost: number;
  currency: string;
  purchaseDate: string; // "YYYY-MM-DD"
  expiryDate: string; // "YYYY-MM-DD"
  autoRenew: boolean;
  projectId: string | null;
  projectName: string | null;
  licenseKey: string;
  notes: string;
  createdAt: Timestamp | null;
};

export type LicenseInput = Omit<License, "id" | "createdAt">;

const COL = "licenses";

export function subscribeToLicenses(callback: (licenses: License[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, COL), orderBy("expiryDate", "asc"));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<License, "id">) })));
    },
    (error) => {
      // Sin este callback un fallo de Firestore dejaría la vista en "Cargando…" para siempre.
      console.error("subscribeToLicenses:", error);
      callback([]);
    },
  );
}

export async function createLicense(data: LicenseInput): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const ref = await addDoc(collection(db, COL), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateLicense(id: string, data: Partial<LicenseInput>): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>);
}

export async function deleteLicense(id: string): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await deleteDoc(doc(db, COL, id));
}
