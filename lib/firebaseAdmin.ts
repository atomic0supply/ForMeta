import "server-only";

import {
  cert,
  getApps,
  initializeApp,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Server-side Firebase Admin SDK. Used by /api/admin/* routes (create/manage
// users) and any future server features (e.g. sending mail). Mirrors the init
// in workers/ticket-mail/worker.mjs.

let cachedApp: App | null = null;

function adminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp;
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    undefined;

  let credential;
  if (rawServiceAccount) {
    try {
      credential = cert(JSON.parse(rawServiceAccount));
    } catch (error) {
      // Fail-fast con mensaje claro en vez de un error críptico en el primer uso.
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_JSON no es un JSON válido: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  } else {
    credential = applicationDefault();
  }

  cachedApp = initializeApp({
    credential,
    storageBucket,
  });
  return cachedApp;
}

export function adminAuth() {
  return getAuth(adminApp());
}

export function adminDb() {
  return getFirestore(adminApp());
}

/**
 * Verify a Firebase ID token (sent by the client as a Bearer token) and ensure
 * the caller is an active admin. Returns the decoded uid on success, or throws
 * with a message suitable for a 401/403 response.
 */
export async function requireAdmin(authorizationHeader: string | null): Promise<{ uid: string }> {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new AdminAuthError("Falta el token de autenticación", 401);
  }

  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    throw new AdminAuthError("Token inválido o expirado", 401);
  }

  const profile = await adminDb().collection("users").doc(uid).get();
  const data = profile.data();
  if (!data || data.role !== "admin" || data.active === false) {
    throw new AdminAuthError("Se requieren permisos de administrador", 403);
  }

  return { uid };
}

/**
 * Verify a Firebase ID token and ensure the caller is an active user (any role).
 * Use for endpoints that any team member may call. Returns the decoded uid.
 */
export async function requireAuth(authorizationHeader: string | null): Promise<{ uid: string }> {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new AdminAuthError("Falta el token de autenticación", 401);
  }

  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    throw new AdminAuthError("Token inválido o expirado", 401);
  }

  const profile = await adminDb().collection("users").doc(uid).get();
  const data = profile.data();
  if (!data || data.active === false) {
    throw new AdminAuthError("Cuenta inactiva o inexistente", 403);
  }

  return { uid };
}

export class AdminAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}
