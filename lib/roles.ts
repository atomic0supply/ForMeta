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
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { ModuleKey } from "@/lib/modules";

export type Role = {
  id: string;
  name: string;
  description: string;
  modules: ModuleKey[];
  isSystem: boolean;
  createdAt: Timestamp | null;
};

export type RoleInput = Omit<Role, "id" | "createdAt">;

export function subscribeToRoles(callback: (roles: Role[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, "roles"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const roles = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Role, "id">),
    }));
    callback(roles);
  });
}

export async function createRole(data: RoleInput): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const ref = await addDoc(collection(db, "roles"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRole(roleId: string, data: Partial<RoleInput>): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, "roles", roleId), data);
}

export async function deleteRole(roleId: string): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await deleteDoc(doc(db, "roles", roleId));
}
