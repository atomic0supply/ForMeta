import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";

export type UserRole = "admin" | "team";

export type UserProfileSettings = {
  geminiApiKey?: string;
};

type EnsureUserArgs = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: UserRole;
};

export async function ensureUserProfile({
  uid,
  email,
  displayName,
  role = "team",
}: EnsureUserArgs) {
  if (!db) {
    return;
  }

  // merge:true — never clobber role/roleId/active if the profile already exists
  // (e.g. an admin user logging in should stay admin).
  await setDoc(
    doc(db, "users", uid),
    {
      email,
      role,
      displayName,
      active: true,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateCurrentUserSettings(
  uid: string,
  data: UserProfileSettings,
) {
  if (!db) {
    throw new Error("Firebase no disponible");
  }

  await setDoc(
    doc(db, "users", uid),
    {
      ...data,
    },
    { merge: true },
  );
}
