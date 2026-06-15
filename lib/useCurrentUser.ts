"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import type { UserRole } from "@/lib/users";
import { ADMIN_ONLY_MODULES, ALL_MODULE_KEYS, type ModuleKey } from "@/lib/modules";
import type { Role } from "@/lib/roles";

// Modules a regular user without an explicit role can see. Keeps existing
// "team" users working until an admin assigns them a dynamic role.
const DEFAULT_TEAM_MODULES: ModuleKey[] = ALL_MODULE_KEYS.filter(
  (k) => !ADMIN_ONLY_MODULES.includes(k),
);

export type CurrentUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  roleId: string | null;
  modules: ModuleKey[];
  active: boolean;
  geminiApiKey?: string;
};

async function resolveModules(role: UserRole, roleId: string | null): Promise<ModuleKey[]> {
  // Admins always have access to every module.
  if (role === "admin") return [...ALL_MODULE_KEYS];
  // No explicit role yet → fall back to the default team module set.
  if (!db || !roleId) return [...DEFAULT_TEAM_MODULES];
  try {
    const snap = await getDoc(doc(db, "roles", roleId));
    if (!snap.exists()) return [...DEFAULT_TEAM_MODULES];
    const data = snap.data() as Omit<Role, "id"> | undefined;
    return Array.isArray(data?.modules) ? (data.modules as ModuleKey[]) : [];
  } catch {
    return [...DEFAULT_TEAM_MODULES];
  }
}

export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser || !db) {
        setUser(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        const data = snap.data();
        const role = (data?.role as UserRole) ?? "team";
        const roleId = typeof data?.roleId === "string" ? data.roleId : null;
        const modules = await resolveModules(role, roleId);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName ?? data?.displayName ?? null,
          role,
          roleId,
          modules,
          active: data?.active ?? true,
          geminiApiKey:
            typeof data?.geminiApiKey === "string" ? data.geminiApiKey : "",
        });
      } catch {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          role: "team",
          roleId: null,
          modules: [],
          active: true,
          geminiApiKey: "",
        });
      }
    });
    return unsub;
  }, []);

  return user;
}
