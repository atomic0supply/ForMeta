import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import type { UserRole } from "@/lib/users";

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  roleId?: string | null;
  active: boolean;
  createdAt: { seconds: number } | null;
};

export function subscribeToAllUsers(
  callback: (users: UserProfile[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, "users"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const users = snap.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as Omit<UserProfile, "uid">),
    }));
    callback(users);
  });
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error("Sesión no válida");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseError(res: Response): Promise<never> {
  let message = "Error en la operación";
  try {
    const data = await res.json();
    if (data?.error) message = data.error;
  } catch {
    /* ignore */
  }
  throw new Error(message);
}

export type CreateUserArgs = {
  email: string;
  password: string;
  displayName?: string;
  role?: UserRole;
  roleId?: string | null;
};

export async function createUser(args: CreateUserArgs): Promise<string> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(args),
  });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.uid as string;
}

export type UpdateUserArgs = {
  role?: UserRole;
  roleId?: string | null;
  active?: boolean;
  displayName?: string | null;
};

export async function updateUser(uid: string, updates: UpdateUserArgs): Promise<void> {
  const res = await fetch(`/api/admin/users/${uid}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) await parseError(res);
}

export async function deleteUser(uid: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${uid}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) await parseError(res);
}

// Convenience wrappers kept for existing call sites.
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateUser(uid, { role });
}

export async function setUserActive(uid: string, active: boolean): Promise<void> {
  await updateUser(uid, { active });
}
