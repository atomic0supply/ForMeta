// Shared expiry helpers used by domains, services, licenses and APIs.
// A YYYY-MM-DD string is expected; empty/invalid values are treated as "no expiry".

export type ExpiryStatus = "expired" | "critical" | "warning" | "ok" | "none";

export function daysUntilExpiry(expiryDate: string): number {
  const exp = new Date(expiryDate);
  exp.setHours(23, 59, 59, 999);
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
