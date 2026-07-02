"use client";

// Sesión de intranet basada en una session cookie de Firebase firmada por
// Google y marcada HttpOnly (la emite /api/session). El cliente nunca escribe
// la cookie directamente: intercambia su ID token por ella. El middleware
// verifica la firma en cada petición a /intranet.

export async function establishSession(idToken: string): Promise<void> {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    throw new Error("No se pudo establecer la sesión");
  }
}

export async function clearSession(): Promise<void> {
  await fetch("/api/session", { method: "DELETE" }).catch(() => {
    // Si la petición falla, la cookie expirará sola (max-age 8 h).
  });
}
