// Renderizador único de emails de marca Formeta. Lo usa tanto el frontend (para
// la previsualización) como para generar el html/text que se guarda en el doc de
// clientMailOutbox. El worker envía ese html/text VERBATIM → WYSIWYG garantizado.
//
// Reglas para email: estilos inline, layout con <table>, sin CSS externo, sin
// variables CSS, sin SVG. Probado mentalmente contra Gmail/Outlook/Apple Mail.

export type ClientMailKind =
  | "proposal"
  | "improvement_quote"
  | "service_unavailable"
  | "ticket_opened"
  | "general";

export type MailLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxableBase: number;
};

export type RenderMailVars = {
  clientName?: string;
  title?: string;
  intro?: string;
  scope?: string;
  message?: string; // texto libre (general); se respeta el salto de línea
  lines?: MailLine[];
  subtotal?: number;
  currency?: string;
  validUntil?: string; // "YYYY-MM-DD"
  proposalNumber?: string;
  // service_unavailable
  serviceName?: string;
  fromDate?: string;
  toDate?: string;
  reason?: string;
  // ticket_opened
  ticketNumber?: string;
  ticketSubject?: string;
};

export type RenderedMail = {
  subject: string;
  html: string;
  text: string;
};

export type RenderMailOptions = {
  // HTML del contenido interior del pie (firma configurable de info@). Si se omite
  // se usa DEFAULT_CLIENT_FOOTER_HTML (el pie de marca histórico).
  signatureHtml?: string;
};

// Marca Formeta (hex literales — los clientes de correo no entienden CSS vars).
const INK = "#2c2c28";
const TERRA = "#b8896a";
const SAND = "#f4f0e8";
const MUTED = "#7a7870";
const BORDER = "#e2ddd4";

// PNG del wordmark servido por URL absoluta. Prerrequisito: publicar este archivo
// (los clientes de correo bloquean SVG de forma inconsistente).
const BRAND_LOGO_URL = "https://formeta.es/brand/wordmark-email.png";
const BRAND_SITE = "https://formeta.es";
const BRAND_EMAIL = "info@formeta.es";

const FONT_HEAD = "Georgia, 'Times New Roman', serif";
const FONT_BODY = "Arial, Helvetica, sans-serif";

// Contenido interior del pie por defecto (firma de info@). Espejo de
// DEFAULT_CLIENT_SIGNATURE en lib/ticketSettings.ts — se mantiene aquí para que
// este módulo puro no dependa de firebase. Si cambias uno, cambia el otro.
export const DEFAULT_CLIENT_FOOTER_HTML =
  `<strong style="color:${INK};font-family:${FONT_HEAD};font-size:14px;">Formeta</strong><br>` +
  `<a href="mailto:${BRAND_EMAIL}" style="color:${TERRA};text-decoration:none;">${BRAND_EMAIL}</a> · ` +
  `<a href="${BRAND_SITE}" style="color:${TERRA};text-decoration:none;">formeta.es</a>`;

// Pie para correos de SOPORTE (tickets). Apunta a support@formeta.es porque ese
// es el único buzón de tickets: el acuse sale de ahí y las respuestas vuelven ahí.
const SUPPORT_EMAIL = "support@formeta.es";
export const DEFAULT_SUPPORT_FOOTER_HTML =
  `<strong style="color:${INK};font-family:${FONT_HEAD};font-size:14px;">Soporte · Formeta</strong><br>` +
  `<a href="mailto:${SUPPORT_EMAIL}" style="color:${TERRA};text-decoration:none;">${SUPPORT_EMAIL}</a> · ` +
  `<a href="${BRAND_SITE}" style="color:${TERRA};text-decoration:none;">formeta.es</a>`;

/* ── Helpers ───────────────────────────────────────────────────────── */

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(value: number, currency = "EUR"): string {
  const symbol = currency === "EUR" ? "€" : currency;
  const amount = (Number.isFinite(value) ? value : 0).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount} ${symbol}`;
}

function formatDate(value?: string): string {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function paragraphs(text: string): string {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 14px;line-height:1.6;">${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// Deriva texto plano desde el HTML de la firma (para el fallback de texto del email).
export function htmlToPlain(html: string): string {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, i, arr) => line.length > 0 || (i > 0 && arr[i - 1].length > 0))
    .join("\n")
    .trim();
}

/* ── Layout wrapper ────────────────────────────────────────────────── */

function layout(bodyHtml: string, footerHtml: string = DEFAULT_CLIENT_FOOTER_HTML): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:${SAND};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${SAND};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:28px 36px 16px;border-bottom:2px solid ${TERRA};">
            <img src="${BRAND_LOGO_URL}" alt="Formeta" width="150" style="display:block;height:auto;border:0;outline:none;text-decoration:none;">
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px 8px;color:${INK};font-family:${FONT_BODY};font-size:15px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px 28px;border-top:1px solid ${BORDER};color:${MUTED};font-family:${FONT_BODY};font-size:12px;line-height:1.6;">
            ${footerHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;color:${INK};font-family:${FONT_HEAD};font-size:24px;font-weight:normal;line-height:1.25;">${escapeHtml(
    text,
  )}</h1>`;
}

function greeting(name?: string): string {
  const who = name ? `, ${escapeHtml(name)}` : "";
  return `<p style="margin:0 0 14px;line-height:1.6;">Hola${who}:</p>`;
}

function linesTable(lines: MailLine[], subtotal: number, currency: string): string {
  if (!lines.length) return "";
  const rows = lines
    .map(
      (line) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid ${BORDER};font-size:14px;">${escapeHtml(
          line.description,
        )}</td>
        <td align="center" style="padding:10px 8px;border-bottom:1px solid ${BORDER};font-size:14px;white-space:nowrap;">${escapeHtml(
          line.quantity,
        )}</td>
        <td align="right" style="padding:10px 8px;border-bottom:1px solid ${BORDER};font-size:14px;white-space:nowrap;">${formatMoney(
          line.unitPrice,
          currency,
        )}</td>
        <td align="right" style="padding:10px 8px;border-bottom:1px solid ${BORDER};font-size:14px;white-space:nowrap;">${formatMoney(
          line.taxableBase,
          currency,
        )}</td>
      </tr>`,
    )
    .join("");
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;border-collapse:collapse;">
    <tr>
      <th align="left" style="padding:8px;border-bottom:2px solid ${INK};font-family:${FONT_BODY};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:${MUTED};">Concepto</th>
      <th align="center" style="padding:8px;border-bottom:2px solid ${INK};font-family:${FONT_BODY};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:${MUTED};">Cant.</th>
      <th align="right" style="padding:8px;border-bottom:2px solid ${INK};font-family:${FONT_BODY};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:${MUTED};">Precio</th>
      <th align="right" style="padding:8px;border-bottom:2px solid ${INK};font-family:${FONT_BODY};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:${MUTED};">Importe</th>
    </tr>
    ${rows}
    <tr>
      <td colspan="3" align="right" style="padding:12px 8px;font-family:${FONT_HEAD};font-size:15px;color:${INK};">Subtotal</td>
      <td align="right" style="padding:12px 8px;font-family:${FONT_HEAD};font-size:16px;color:${INK};white-space:nowrap;"><strong>${formatMoney(
        subtotal,
        currency,
      )}</strong></td>
    </tr>
  </table>
  <p style="margin:0 0 14px;color:${MUTED};font-size:12px;">Importes sin impuestos. Los impuestos aplicables se reflejarán en la factura.</p>`;
}

function noteBox(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;">
    <tr><td style="padding:14px 16px;background-color:${SAND};border-left:3px solid ${TERRA};font-size:14px;line-height:1.55;color:${INK};">${text}</td></tr>
  </table>`;
}

/* ── Cuerpos por tipo ──────────────────────────────────────────────── */

function proposalBody(vars: RenderMailVars, isImprovement: boolean): string {
  const title =
    vars.title || (isImprovement ? "Presupuesto de mejora" : "Propuesta de colaboración");
  const ref = vars.proposalNumber ? ` (${escapeHtml(vars.proposalNumber)})` : "";
  const lead = isImprovement
    ? "Te enviamos el presupuesto de la mejora solicitada, con el detalle de lo que incluye:"
    : "Te enviamos nuestra propuesta con el alcance y el detalle económico:";
  const validity = vars.validUntil
    ? `<p style="margin:0 0 14px;color:${MUTED};font-size:13px;">Válida hasta el <strong style="color:${INK};">${formatDate(
        vars.validUntil,
      )}</strong>.</p>`
    : "";
  const scope = vars.scope ? noteBox(paragraphs(vars.scope)) : "";
  return [
    heading(`${title}${ref}`),
    greeting(vars.clientName),
    `<p style="margin:0 0 14px;line-height:1.6;">${escapeHtml(lead)}</p>`,
    scope,
    linesTable(vars.lines ?? [], vars.subtotal ?? 0, vars.currency ?? "EUR"),
    validity,
    `<p style="margin:0 0 14px;line-height:1.6;">Para aceptar la propuesta, responde a este mismo correo. Quedamos a tu disposición para cualquier ajuste.</p>`,
  ].join("");
}

function serviceUnavailableBody(vars: RenderMailVars): string {
  const window =
    vars.fromDate || vars.toDate
      ? `<p style="margin:0 0 14px;line-height:1.6;">Periodo afectado: <strong>${escapeHtml(
          formatDate(vars.fromDate),
        )}${vars.toDate ? ` – ${escapeHtml(formatDate(vars.toDate))}` : ""}</strong>.</p>`
      : "";
  return [
    heading(vars.title || "Aviso de disponibilidad de servicio"),
    greeting(vars.clientName),
    `<p style="margin:0 0 14px;line-height:1.6;">Te informamos de que el servicio <strong>${escapeHtml(
      vars.serviceName || "indicado",
    )}</strong> no estará disponible temporalmente.</p>`,
    window,
    vars.reason ? noteBox(paragraphs(vars.reason)) : "",
    vars.message
      ? `<p style="margin:0 0 14px;line-height:1.6;">${paragraphs(vars.message)}</p>`
      : "",
    `<p style="margin:0 0 14px;line-height:1.6;">Disculpa las molestias. Te avisaremos en cuanto quede restablecido.</p>`,
  ].join("");
}

function ticketOpenedBody(vars: RenderMailVars): string {
  const ref = vars.ticketNumber
    ? ` <strong style="color:${INK};">${escapeHtml(vars.ticketNumber)}</strong>`
    : "";
  const subjectNote = vars.ticketSubject
    ? noteBox(`<strong>Asunto:</strong> ${escapeHtml(vars.ticketSubject)}`)
    : "";
  return [
    heading(vars.title || "Hemos recibido tu solicitud"),
    greeting(vars.clientName),
    `<p style="margin:0 0 14px;line-height:1.6;">Hemos registrado tu solicitud y creado el ticket${ref}. Nuestro equipo ya lo está revisando y te responderemos lo antes posible.</p>`,
    subjectNote,
    vars.message ? paragraphs(vars.message) : "",
    `<p style="margin:0 0 14px;line-height:1.6;">Si necesitas añadir información, responde a este mismo correo y la sumaremos al seguimiento.</p>`,
  ].join("");
}

function generalBody(vars: RenderMailVars): string {
  return [
    heading(vars.title || "Comunicación de Formeta"),
    greeting(vars.clientName),
    vars.intro ? `<p style="margin:0 0 14px;line-height:1.6;">${escapeHtml(vars.intro)}</p>` : "",
    paragraphs(vars.message || ""),
  ].join("");
}

/* ── Texto plano (fallback) ────────────────────────────────────────── */

function plainText(kind: ClientMailKind, vars: RenderMailVars, signatureText?: string): string {
  const out: string[] = [];
  const hello = vars.clientName ? `Hola, ${vars.clientName}:` : "Hola:";
  out.push(hello, "");
  if (kind === "proposal" || kind === "improvement_quote") {
    out.push(vars.title || "Propuesta", "");
    if (vars.scope) out.push(vars.scope, "");
    for (const line of vars.lines ?? []) {
      out.push(
        `- ${line.description} · ${line.quantity} × ${formatMoney(
          line.unitPrice,
          vars.currency ?? "EUR",
        )} = ${formatMoney(line.taxableBase, vars.currency ?? "EUR")}`,
      );
    }
    out.push("", `Subtotal: ${formatMoney(vars.subtotal ?? 0, vars.currency ?? "EUR")}`);
    out.push("(Importes sin impuestos.)");
    if (vars.validUntil) out.push("", `Válida hasta el ${formatDate(vars.validUntil)}.`);
    out.push("", "Para aceptar, responde a este correo.");
  } else if (kind === "service_unavailable") {
    out.push(
      `El servicio ${vars.serviceName || "indicado"} no estará disponible temporalmente.`,
    );
    if (vars.fromDate || vars.toDate) {
      out.push(
        `Periodo: ${formatDate(vars.fromDate)}${vars.toDate ? ` – ${formatDate(vars.toDate)}` : ""}.`,
      );
    }
    if (vars.reason) out.push("", vars.reason);
    if (vars.message) out.push("", vars.message);
  } else if (kind === "ticket_opened") {
    out.push(
      vars.ticketNumber
        ? `Hemos registrado tu solicitud y creado el ticket ${vars.ticketNumber}.`
        : "Hemos registrado tu solicitud.",
    );
    if (vars.ticketSubject) out.push("", `Asunto: ${vars.ticketSubject}`);
    if (vars.message) out.push("", vars.message);
    out.push("", "Si necesitas añadir información, responde a este correo.");
  } else {
    if (vars.intro) out.push(vars.intro, "");
    out.push(vars.message || "");
  }
  const footer = signatureText?.trim() || htmlToPlain(DEFAULT_CLIENT_FOOTER_HTML);
  out.push("", "—", ...footer.split("\n"));
  return out.join("\n");
}

/* ── API ───────────────────────────────────────────────────────────── */

const SUBJECT_PREFIX: Record<ClientMailKind, string> = {
  proposal: "Propuesta",
  improvement_quote: "Presupuesto de mejora",
  service_unavailable: "Aviso de servicio",
  ticket_opened: "Hemos recibido tu solicitud",
  general: "Formeta",
};

export function defaultSubject(kind: ClientMailKind, vars: RenderMailVars): string {
  if (vars.title) return vars.title;
  if (kind === "proposal" && vars.proposalNumber) return `Propuesta ${vars.proposalNumber}`;
  if (kind === "service_unavailable" && vars.serviceName) {
    return `Aviso de servicio: ${vars.serviceName}`;
  }
  if (kind === "ticket_opened" && vars.ticketNumber) {
    return `Hemos abierto tu ticket ${vars.ticketNumber}`;
  }
  return SUBJECT_PREFIX[kind];
}

export function renderClientMail(
  kind: ClientMailKind,
  vars: RenderMailVars,
  options: RenderMailOptions = {},
): RenderedMail {
  let body: string;
  switch (kind) {
    case "proposal":
      body = proposalBody(vars, false);
      break;
    case "improvement_quote":
      body = proposalBody(vars, true);
      break;
    case "service_unavailable":
      body = serviceUnavailableBody(vars);
      break;
    case "ticket_opened":
      body = ticketOpenedBody(vars);
      break;
    default:
      body = generalBody(vars);
      break;
  }
  const footerHtml = options.signatureHtml?.trim() || DEFAULT_CLIENT_FOOTER_HTML;
  const signatureText = htmlToPlain(footerHtml);
  return {
    subject: defaultSubject(kind, vars),
    html: layout(body, footerHtml),
    text: plainText(kind, vars, signatureText),
  };
}
