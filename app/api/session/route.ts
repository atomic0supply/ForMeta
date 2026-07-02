import { NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "formeta_session";
// Mantiene la duración histórica de la sesión de intranet (8 h).
const SESSION_MS = 8 * 60 * 60 * 1000;

// POST /api/session — intercambia un ID token de Firebase por una session
// cookie firmada por Google (HttpOnly). El middleware la verifica en cada
// petición a /intranet; el cliente nunca escribe la cookie directamente.
export async function POST(request: Request) {
  let idToken = "";
  try {
    const body = (await request.json()) as { idToken?: unknown };
    if (typeof body.idToken === "string") idToken = body.idToken;
  } catch {
    // body inválido → 400 más abajo
  }
  if (!idToken) {
    return NextResponse.json({ error: "Falta idToken" }, { status: 400 });
  }

  try {
    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MS,
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MS / 1000,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 });
  }
}

// DELETE /api/session — cierra la sesión borrando la cookie.
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
