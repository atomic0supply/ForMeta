import type { TimeEntry } from "@/lib/timeEntries";
import type { Project } from "@/lib/projects";
import type { Client } from "@/lib/clients";

export function calcBillableAmount(entries: TimeEntry[], hourlyRate: number): number {
  const totalHours = entries.reduce((acc, e) => acc + e.durationSeconds / 3600, 0);
  return totalHours * hourlyRate;
}

export function calcTotalHours(entries: TimeEntry[]): number {
  return entries.reduce((acc, e) => acc + e.durationSeconds / 3600, 0);
}

type InvoiceLineItem = {
  date: string;
  description: string;
  hours: number;
  amount: number;
};

function fmt(ts: { seconds: number }) {
  return new Date(ts.seconds * 1000);
}

// Escapa valores interpolados en el HTML de la factura para evitar XSS / HTML roto
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Clave de día en horario local (getFullYear/getMonth/getDate) para que las
// sesiones nocturnas no se agrupen en el día UTC equivocado
function localDayKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function generateInvoiceHtml(
  project: Project,
  client: Client | null,
  entries: TimeEntry[],
  hourlyRate: number,
  currency = "EUR",
): string {
  const totalHours = calcTotalHours(entries);
  const totalAmount = calcBillableAmount(entries, hourlyRate);

  const byDay = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    const key = localDayKey(fmt(e.startedAt));
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }

  const lineItems: InvoiceLineItem[] = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, dayEntries]) => {
      const hours = dayEntries.reduce((acc, e) => acc + e.durationSeconds / 3600, 0);
      const dateLabel = new Date(key + "T12:00:00").toLocaleDateString("es-ES", {
        day: "numeric", month: "long", year: "numeric",
      });
      return {
        date: dateLabel,
        description: project.name,
        hours,
        amount: hours * hourlyRate,
      };
    });

  const currencySymbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency;
  const issueDate = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  const rows = lineItems.map((item) => `
    <tr>
      <td>${escapeHtml(item.date)}</td>
      <td>${escapeHtml(item.description)}</td>
      <td style="text-align:right">${item.hours.toFixed(2)} h</td>
      <td style="text-align:right">${escapeHtml(currencySymbol)}${(hourlyRate).toFixed(2)}/h</td>
      <td style="text-align:right">${escapeHtml(currencySymbol)}${item.amount.toFixed(2)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Factura — ${escapeHtml(project.name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Mono', monospace; font-size: 12px; color: #2c2c28; padding: 60px; max-width: 820px; margin: auto; }
  h1 { font-size: 28px; font-weight: 300; margin-bottom: 4px; letter-spacing: -0.01em; }
  .meta { color: #7a7870; font-size: 11px; margin-bottom: 48px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 48px; }
  .label { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #b8896a; margin-bottom: 6px; }
  .value { font-size: 13px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: #7a7870; padding: 8px 12px; border-bottom: 1px solid #e2ddd4; text-align: left; }
  td { padding: 10px 12px; border-bottom: 1px solid #f0ece4; font-size: 11px; }
  .total-row td { border-top: 2px solid #2c2c28; border-bottom: none; font-weight: 600; font-size: 13px; padding-top: 16px; }
  @media print { body { padding: 30px; } }
</style>
</head>
<body>
  <h1>Factura</h1>
  <p class="meta">Emitida el ${escapeHtml(issueDate)}</p>

  <div class="grid">
    <div>
      <p class="label">Emisor</p>
      <p class="value">ForMeta<br>hola@fmeta.es</p>
    </div>
    <div>
      <p class="label">Cliente</p>
      <p class="value">${escapeHtml(client?.name ?? "—")}<br>${escapeHtml(client?.email ?? "")}</p>
    </div>
    <div>
      <p class="label">Proyecto</p>
      <p class="value">${escapeHtml(project.name)}</p>
    </div>
    <div>
      <p class="label">Tarifa</p>
      <p class="value">${escapeHtml(currencySymbol)}${hourlyRate.toFixed(2)} / hora</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Descripción</th>
        <th style="text-align:right">Horas</th>
        <th style="text-align:right">Tarifa</th>
        <th style="text-align:right">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="2">Total</td>
        <td style="text-align:right">${totalHours.toFixed(2)} h</td>
        <td></td>
        <td style="text-align:right">${escapeHtml(currencySymbol)}${totalAmount.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}

export function exportInvoice(html: string, projectName: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `factura-${projectName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
