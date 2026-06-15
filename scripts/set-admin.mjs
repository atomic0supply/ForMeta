/**
 * Marca a un usuario como administrador de la app (perfil Firestore role="admin"),
 * para que pueda usar el módulo Equipo (gestionar roles y usuarios).
 *
 * Autenticación (una de las dos):
 *   - gcloud auth application-default login   (proyecto fmeta-f9aed)
 *   - $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\ruta\clave-fmeta-f9aed.json"
 *
 * Uso:
 *   node scripts/set-admin.mjs romeret08@gmail.com [contraseñaTemporal]
 *
 * Si el usuario no existe en Firebase Auth, se crea (con la contraseña temporal
 * indicada, o una aleatoria que se imprime por consola).
 */

import crypto from "node:crypto";

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const email = process.argv[2];
const passwordArg = process.argv[3];

if (!email) {
  console.error("Uso: node scripts/set-admin.mjs <email> [contraseñaTemporal]");
  process.exit(1);
}

const projectId = process.env.GOOGLE_CLOUD_PROJECT || "fmeta-f9aed";

if (getApps().length === 0) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  initializeApp({
    credential: raw ? cert(JSON.parse(raw)) : applicationDefault(),
    projectId,
  });
}

const auth = getAuth();
const db = getFirestore();

async function main() {
  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`Usuario existente: ${user.uid}`);
  } catch {
    const password = passwordArg || crypto.randomBytes(9).toString("base64");
    user = await auth.createUser({ email, password, emailVerified: false });
    console.log(`Usuario creado: ${user.uid}`);
    if (!passwordArg) console.log(`Contraseña temporal: ${password}`);
  }

  await db.collection("users").doc(user.uid).set(
    {
      email,
      role: "admin",
      roleId: null,
      active: true,
      displayName: user.displayName ?? null,
    },
    { merge: true },
  );

  console.log(`✔ ${email} es ahora administrador de la app.`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
