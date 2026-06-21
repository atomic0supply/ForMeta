import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

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

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // Perfil nuevo: se crea con el rol por defecto (o el indicado).
    await setDoc(ref, {
      email,
      role,
      displayName,
      active: true,
      createdAt: serverTimestamp(),
    });
    return;
  }

  // Perfil existente: solo refresca datos de identidad.
  // Nunca tocar role/roleId/active aqui, o un admin que inicia sesion
  // veria su rol sobrescrito al valor por defecto.
  await setDoc(ref, { email, displayName }, { merge: true });
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
