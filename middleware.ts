import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeProtectedHeader, importX509, jwtVerify } from "jose";

const INTRANET_COOKIE = "formeta_session";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "fmeta-f9aed";

// Certificados públicos con los que Google firma las session cookies de
// Firebase (JWT RS256). Se cachean en el scope del módulo según Cache-Control.
const PUBLIC_KEYS_URL =
  "https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys";

let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getPublicCert(kid: string): Promise<string | null> {
  if (!certCache || Date.now() > certCache.expiresAt) {
    const response = await fetch(PUBLIC_KEYS_URL);
    if (!response.ok) return null;
    const certs = (await response.json()) as Record<string, string>;
    const maxAge = Number(
      response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? 3600,
    );
    certCache = { certs, expiresAt: Date.now() + maxAge * 1000 };
  }
  return certCache.certs[kid] ?? null;
}

// Verifica firma, emisor, audiencia y expiración de la session cookie.
// Antes el middleware solo comprobaba que la cookie existiera, lo que permitía
// forjarla con document.cookie; ahora una cookie inventada no pasa.
async function verifySessionCookie(token: string): Promise<boolean> {
  try {
    const { kid } = decodeProtectedHeader(token);
    if (!kid) return false;
    const pem = await getPublicCert(kid);
    if (!pem) return false;
    const key = await importX509(pem, "RS256");
    await jwtVerify(token, key, {
      issuer: `https://session.firebase.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/intranet")) {
    return NextResponse.next();
  }

  const session = request.cookies.get(INTRANET_COOKIE)?.value;

  if (!session || !(await verifySessionCookie(session))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    const response = NextResponse.redirect(loginUrl);
    // Borra la cookie inválida/expirada para no redirigir en bucle.
    response.cookies.set(INTRANET_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/intranet/:path*"],
};
