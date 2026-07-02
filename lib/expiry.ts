// Shared expiry helpers used by domains, services, licenses and APIs.
// A YYYY-MM-DD string is expected; empty/invalid values are treated as "no expiry".

export type ExpiryStatus = "expired" | "critical" | "warning" | "ok" | "none";

/**
 * Días hasta la caducidad (negativo si ya venció).
 * Devuelve NaN si la fecha está vacía o es inválida — los llamantes deben
 * tratar NaN como "sin caducidad" (ver expiryStatus/expiryLabel y domains.ts).
 * Se parsea YYYY-MM-DD como fecha LOCAL: `new Date("YYYY-MM-DD")` interpretaría
 * UTC y el posterior setHours local podría desplazar un día cerca de medianoche.
 */
export function daysUntilExpiry(expiryDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expiryDate?.trim() ?? "");
  if (!match) return NaN;
  const exp = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    23, 59, 59, 999,
  );
  if (Number.isNaN(exp.getTime())) return NaN;
  const now = new Date();
  return Math.ceil((exp.getTime() - now.getTime()) / 86400000);
}

export function expiryStatus(expiryDate: string): ExpiryStatus {
  if (!expiryDate) return "none";
  const days = daysUntilExpiry(expiryDate);
  if (Number.isNaN(days)) return "none";
  if (days < 0) return "expired";
  if (days < 30) return "critical";
  if (days < 90) return "warning";
  return "ok";
}

export function expiryLabel(expiryDate: string): string {
  if (!expiryDate) return "Sin caducidad";
  const days = daysUntilExpiry(expiryDate);
  if (Number.isNaN(days)) return "Sin caducidad";
  if (days < 0) return `Vencido hace ${Math.abs(days)}d`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  if (days < 90) return `Vence en ${days}d`;
  return new Date(expiryDate).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
