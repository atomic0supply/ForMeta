import {
  calculateFiscalPaymentDashboard,
  calculateQuarterlyClosure,
  determineInvoiceRegime,
  expenseCategoryLabel,
  formatMoney,
  invoiceRegimeLabel,
  type Expense,
  type FiscalProfile,
  type Invoice,
  type QuarterlyClosure,
} from "@/lib/fiscal";
import type { Client } from "@/lib/clients";
import type { Project } from "@/lib/projects";
import {
  buildKnowledgeGraphFromForMeta,
  queryKnowledgeGraph,
  summarizeKnowledgeGraph,
} from "@/lib/knowledgeGraph";

export type FiscalAssistantToolName =
  | "query_sql"
  | "consultar_facturas"
  | "consultar_gastos"
  | "calcular_iva_trimestre"
  | "calcular_modelo_130"
  | "proyectar_impuestos"
  | "proyectar_renta"
  | "validar_vies"
  | "listar_obligaciones"
  | "detectar_anomalias"
  | "explicar_factura"
  | "buscar_cambios_normativos"
  | "consultar_grafo";

export type FiscalAssistantContext = {
  profile: FiscalProfile;
  invoices: Invoice[];
  expenses: Expense[];
  clients: Client[];
  projects?: Project[];
  closures: QuarterlyClosure[];
  year?: number;
  quarter?: 1 | 2 | 3 | 4;
};

export type FiscalAssistantToolResult = {
  tool: FiscalAssistantToolName;
  title: string;
  summary: string;
  data: Record<string, unknown>;
};

export type FiscalAssistantPreparedAnswer = {
  intent: string;
  answer: string;
  toolResults: FiscalAssistantToolResult[];
  guardrail: string;
};

const NORMATIVE_SOURCES = [
  {
    label: "AEAT Modelo 303",
    url: "https://sede.agenciatributaria.gob.es/Sede/iva/presentar-declaracion-iva-modelo-303.html",
  },
  {
    label: "AEAT Modelo 130",
    url: "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/irpf/modelo-130-irpf-empresarios-profesionales-estimacion-directa-pago-fraccionado.html",
  },
  {
    label: "AEAT Modelo 349",
    url: "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-349-declaracion-recapitulativa-operaciones-intracomunitarias.html",
  },
  {
    label: "VIES Comisión Europea",
    url: "https://ec.europa.eu/taxation_customs/vies/#/vat-validation",
  },
];

export function prepareFiscalAssistantAnswer(
  question: string,
  context: FiscalAssistantContext,
): FiscalAssistantPreparedAnswer {
  const normalized = normalize(question);
  const year = context.year ?? new Date().getFullYear();
  const quarter = context.quarter ?? ((Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4);
  const toolResults: FiscalAssistantToolResult[] = [];

  const wantsMonthlyPlan = includesAny(normalized, ["que deberia hacer este mes", "qué debería hacer este mes", "hacer este mes", "recomendaciones este mes", "este mes"]);
  const wantsQuarterPayment = includesAny(normalized, ["cuanto tengo que pagar", "pagar este trimestre", "este trimestre", "trimestre"]);
  const wantsVatWhy = includesAny(normalized, ["por que me sale", "por qué me sale", "iva"]);
  const wants349 = includesAny(normalized, ["349", "ue", "intracomunitaria", "intracomunitarias"]);
  const wantsExpenses = includesAny(normalized, ["gastos", "deducir", "deducible", "deducciones"]);
  const wants130 = includesAny(normalized, ["130", "retencion", "retención"]);
  const wantsProjection = includesAny(normalized, ["reservar", "cliente", "2000", "2.000", "proyect"]);
  const wantsAnomalies = includesAny(normalized, ["anomalia", "anomalía", "anomalías", "detecta", "errores"]);
  const wantsInvoiceExplanation = includesAny(normalized, ["explica", "factura"]);
  const wantsNormative = includesAny(normalized, ["normativ", "cambios", "ley", "aeat"]);
  const wantsGestoria = includesAny(normalized, ["gestoria", "gestoría", "mensaje", "email", "asesor"]);
  const wantsGraph = includesAny(normalized, ["grafo", "graphrag", "relacion", "relación", "semant", "contexto", "conocimiento"]);

  const closure = calculateQuarterlyClosure(context.invoices, context.expenses, context.profile, year, quarter);
  const dashboard = calculateFiscalPaymentDashboard(context.invoices, context.profile, context.expenses);
  const knowledgeGraph = buildKnowledgeGraphFromForMeta({
    profile: context.profile,
    clients: context.clients,
    projects: context.projects ?? [],
    invoices: context.invoices,
    expenses: context.expenses,
    closures: context.closures,
  });

  if (wantsMonthlyPlan || wantsAnomalies || wantsGestoria || wantsGraph) {
    const monthlySnapshot = queryFiscalDataForCurrentMonth(context, dashboard, closure);
    toolResults.push({
      tool: "query_sql",
      title: "Lectura controlada de datos ForMeta",
      summary: `${monthlySnapshot.monthLabel}: ${monthlySnapshot.invoicesCount} facturas, ${monthlySnapshot.expensesCount} gastos, ${monthlySnapshot.pendingInvoicesCount} cobros pendientes.`,
      data: monthlySnapshot,
    });
  }

  if (wantsGraph || wantsMonthlyPlan || wants349 || wantsExpenses || wantsInvoiceExplanation) {
    const summary = summarizeKnowledgeGraph(knowledgeGraph);
    const graphResult = queryKnowledgeGraph(knowledgeGraph, question);
    toolResults.push({
      tool: "consultar_grafo",
      title: "GraphRAG ForMeta",
      summary: `${summary.nodes} nodos, ${summary.edges} relaciones; ${graphResult.paths.length} camino(s) semántico(s) relevantes.`,
      data: {
        summary,
        graphRag: graphResult,
        truthSource: knowledgeGraph.truthSource,
      },
    });
  }

  if (wantsMonthlyPlan || wantsQuarterPayment || wantsProjection || wants130 || wantsVatWhy) {
    toolResults.push({
      tool: "proyectar_impuestos",
      title: "Proyección fiscal calculada",
      summary: `Reserva real sugerida: IVA ${formatMoney(dashboard.cash.reservedVat)}, IRPF ${formatMoney(dashboard.cash.reservedIrpf)}, RETA ${formatMoney(dashboard.cash.reservedReta)}.`,
      data: {
        availableReal: dashboard.cash.availableReal,
        reservedVat: dashboard.cash.reservedVat,
        reservedIrpf: dashboard.cash.reservedIrpf,
        reservedReta: dashboard.cash.reservedReta,
        quarterModel303: closure.snapshot.model303,
        quarterModel130: closure.snapshot.model130,
        projectedAnnualNetIncome: dashboard.projectedAnnualNetIncome,
        retainedIncomeRatio: dashboard.retainedIncomeRatio,
      },
    });
  }

  if (wantsMonthlyPlan || wantsAnomalies || wantsExpenses) {
    const anomalies = detectFiscalAnomalies(context, closure);
    toolResults.push({
      tool: "detectar_anomalias",
      title: "Anomalías fiscales detectadas",
      summary: anomalies.length === 0
        ? "No hay anomalías críticas en los datos actuales."
        : `${anomalies.length} anomalías o revisiones pendientes.`,
      data: { anomalies },
    });
  }

  if (wantsQuarterPayment || wantsVatWhy || wants130 || wants349) {
    toolResults.push({
      tool: "calcular_iva_trimestre",
      title: `IVA T${quarter} ${year}`,
      summary: `Modelo 303 estimado: ${formatMoney(closure.snapshot.model303.amount)}.`,
      data: {
        outputVat: closure.snapshot.outputVat,
        inputVat: closure.snapshot.inputVat,
        amount: closure.snapshot.model303.amount,
        dueDate: closure.snapshot.model303.dueDate,
      },
    });
  }

  if (wantsQuarterPayment || wants130 || wantsMonthlyPlan) {
    toolResults.push({
      tool: "calcular_modelo_130",
      title: `Modelo 130 T${quarter} ${year}`,
      summary: closure.snapshot.model130.required
        ? `Modelo 130 estimado: ${formatMoney(closure.snapshot.model130.amount)}.`
        : `Modelo 130 no obligatorio: ${closure.snapshot.model130.reason}.`,
      data: closure.snapshot.model130,
    });
  }

  if (wantsQuarterPayment || wants349 || wantsMonthlyPlan) {
    toolResults.push({
      tool: "listar_obligaciones",
      title: "Obligaciones del trimestre",
      summary: closure.snapshot.calendar
        .map((item) => `${item.model}: ${item.status} hasta ${item.dueDate}`)
        .join(" · "),
      data: {
        calendar: closure.snapshot.calendar,
        checklist: closure.snapshot.checklist,
      },
    });
  }

  if (wants349) {
    toolResults.push({
      tool: "query_sql",
      title: "Facturas UE para Modelo 349",
      summary: closure.snapshot.model349.required
        ? `${closure.snapshot.model349Operations.length} clientes UE declarables.`
        : "No hay operaciones UE declarables para Modelo 349 en este trimestre.",
      data: {
        operations: closure.snapshot.model349Operations,
      },
    });
  }

  if (wantsExpenses || wantsAnomalies) {
    const riskyExpenses = context.expenses.filter((expense) => expense.alerts.length > 0);
    toolResults.push({
      tool: wantsAnomalies ? "detectar_anomalias" : "query_sql",
      title: "Gastos y deducciones",
      summary: `${formatMoney(dashboard.ytdDeductibleExpenses)} de gastos deducibles YTD y ${formatMoney(dashboard.ytdInputVatDeductible)} de IVA soportado deducible.`,
      data: {
        deductibleExpensesYtd: dashboard.ytdDeductibleExpenses,
        deductibleVatYtd: dashboard.ytdInputVatDeductible,
        riskyExpenses: riskyExpenses.slice(0, 8).map((expense) => ({
          supplierName: expense.supplierName,
          category: expenseCategoryLabel(expense.categoryId),
          total: expense.total,
          alerts: expense.alerts,
        })),
      },
    });
  }

  if (wantsProjection) {
    const monthlyBase = extractMonthlyAmount(normalized) ?? 2000;
    const projectedMonthlyInvoice = simulateMonthlyClient(monthlyBase, context.profile.defaultVatRate, context.profile.defaultWithholdingRate);
    toolResults.push({
      tool: "proyectar_renta",
      title: "Escenario nuevo cliente mensual",
      summary: `Un cliente de ${formatMoney(monthlyBase)}/mes añadiría una reserva aproximada de ${formatMoney(projectedMonthlyInvoice.reserve)}/mes.`,
      data: projectedMonthlyInvoice,
    });
  }

  if (wantsInvoiceExplanation) {
    const invoice = findInvoiceForQuestion(normalized, context.invoices) ?? context.invoices[0] ?? null;
    toolResults.push({
      tool: "explicar_factura",
      title: invoice ? `Factura ${invoice.number}` : "Factura no encontrada",
      summary: invoice
        ? `${invoice.number}: base ${formatMoney(invoice.totals.subtotal)}, IVA ${formatMoney(invoice.totals.vat)}, retención ${formatMoney(invoice.totals.withholding)}, total ${formatMoney(invoice.totals.total)}.`
        : "No he encontrado una factura concreta en el contexto cargado.",
      data: invoice ? explainInvoice(invoice) : {},
    });
  }

  if (wantsExpenses || wantsInvoiceExplanation || wantsVatWhy || wants349) {
    toolResults.push({
      tool: "validar_vies",
      title: "Estado VIES de clientes",
      summary: summarizeVies(context.clients),
      data: {
        clients: context.clients.map((client) => ({
          name: client.name,
          countryCode: client.tax.countryCode,
          vatNumber: client.tax.vatNumber,
          viesStatus: client.tax.viesStatus,
          regime: invoiceRegimeLabel(determineInvoiceRegime(client.tax)),
        })),
      },
    });
  }

  if (wantsNormative) {
    toolResults.push({
      tool: "buscar_cambios_normativos",
      title: "Fuentes normativas a revisar",
      summary: "No se actualizan importes desde IA. Revisa fuentes oficiales antes de cambiar reglas fiscales.",
      data: { sources: NORMATIVE_SOURCES },
    });
  }

  if (wantsGestoria || wantsMonthlyPlan) {
    toolResults.push({
      tool: "listar_obligaciones",
      title: "Borrador para gestoría",
      summary: "Mensaje preparado con importes calculados y puntos de revisión.",
      data: {
        message: buildGestoriaMessage(closure, detectFiscalAnomalies(context, closure)),
      },
    });
  }

  if (toolResults.length === 0) {
    toolResults.push({
      tool: "listar_obligaciones",
      title: "Resumen fiscal operativo",
      summary: `Disponible real: ${formatMoney(dashboard.cash.availableReal)}. Modelo 303 T${quarter}: ${formatMoney(closure.snapshot.model303.amount)}.`,
      data: {
        availableReal: dashboard.cash.availableReal,
        model303: closure.snapshot.model303,
        model130: closure.snapshot.model130,
        model349: closure.snapshot.model349,
      },
    });
  }

  return {
    intent: inferIntent(normalized),
    answer: buildDeterministicAnswer(toolResults),
    toolResults,
    guardrail: "Los importes proceden del motor fiscal de ForMeta. La IA solo resume, explica y recomienda verificación.",
  };
}

export function buildFiscalAssistantRecommendations(prepared: FiscalAssistantPreparedAnswer): string[] {
  const recommendations: string[] = [];
  const anomalyTool = prepared.toolResults.find((result) => result.tool === "detectar_anomalias");
  const projectionTool = prepared.toolResults.find((result) => result.tool === "proyectar_impuestos");
  const obligationsTool = prepared.toolResults.find((result) => result.tool === "listar_obligaciones");
  const graphTool = prepared.toolResults.find((result) => result.tool === "consultar_grafo");

  const anomalies = (anomalyTool?.data.anomalies as Array<{ severity?: string; title?: string; action?: string }> | undefined) ?? [];
  const high = anomalies.filter((item) => item.severity === "alta");
  if (high.length > 0) {
    recommendations.push(`Resuelve primero ${high.length} anomalía(s) alta(s): ${high.slice(0, 2).map((item) => item.title).join("; ")}.`);
  }

  const projection = projectionTool?.data as {
    reservedVat?: number;
    reservedIrpf?: number;
    reservedReta?: number;
    availableReal?: number;
  } | undefined;
  if (projection) {
    const reserve = roundMoney((projection.reservedVat ?? 0) + (projection.reservedIrpf ?? 0) + (projection.reservedReta ?? 0));
    recommendations.push(`Mantén separados ${formatMoney(reserve)} de reservas fiscales/RETA antes de considerar disponible la caja.`);
  }

  const checklist = (obligationsTool?.data.checklist as Array<{ done?: boolean; blocking?: boolean; label?: string }> | undefined) ?? [];
  const blockers = checklist.filter((item) => item.blocking && !item.done);
  if (blockers.length > 0) {
    recommendations.push(`No marques el cierre como presentado hasta resolver: ${blockers.map((item) => item.label).join("; ")}.`);
  }

  const graph = graphTool?.data.graphRag as { paths?: unknown[] } | undefined;
  if (graph?.paths && graph.paths.length > 0) {
    recommendations.push(`Usa los ${graph.paths.length} camino(s) GraphRAG como contexto para explicar relaciones, no para recalcular importes.`);
  }

  if (recommendations.length === 0) {
    recommendations.push("Actualiza cobros y gastos de este mes antes de cerrar la previsión.");
    recommendations.push("Prepara el export para gestoría si el cierre trimestral está cerca.");
  }

  return recommendations.slice(0, 4);
}

export function buildFiscalAssistantPrompt(question: string, prepared: FiscalAssistantPreparedAnswer): string {
  return `
Eres el asistente fiscal de ForMeta para un autonomo en Espana.

Regla absoluta:
- No calcules importes.
- No inventes cifras, obligaciones ni normativa.
- Usa exclusivamente TOOL_RESULTS para numeros y estados.
- Puedes recomendar acciones, explicar motivos, preparar textos y priorizar revisiones.
- No puedes modificar constantes fiscales, emitir facturas, cambiar estados ni validar VIES si no lo indica una herramienta.
- Si falta contexto, dilo.
- Tu salida es JSON valido.
- Responde en espanol claro, con tono de copiloto fiscal prudente.

Pregunta del usuario:
${question}

TOOL_RESULTS:
${JSON.stringify(prepared.toolResults, null, 2)}

GUARDRAIL:
${prepared.guardrail}

Devuelve este JSON exacto:
{
  "answer": "respuesta breve en markdown",
  "recommendations": ["accion concreta 1", "accion concreta 2"],
  "usedTools": ["nombre_tool_1", "nombre_tool_2"],
  "confidence": "alta | media | baja"
}
`.trim();
}

function buildDeterministicAnswer(results: FiscalAssistantToolResult[]): string {
  return results.map((result) => `**${result.title}**\n${result.summary}`).join("\n\n");
}

function queryFiscalDataForCurrentMonth(
  context: FiscalAssistantContext,
  dashboard: ReturnType<typeof calculateFiscalPaymentDashboard>,
  closure: QuarterlyClosure,
) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 12);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12);
  const invoices = context.invoices.filter((invoice) => {
    const date = parseDate(invoice.issueDate);
    return invoice.status !== "cancelled" && date >= monthStart && date <= monthEnd;
  });
  const expenses = context.expenses.filter((expense) => {
    const date = parseDate(expense.issueDate);
    return date >= monthStart && date <= monthEnd;
  });
  const pendingInvoices = invoices.filter((invoice) => invoice.paymentStatus !== "paid");
  const riskyExpenses = expenses.filter((expense) => expense.alerts.length > 0);

  return {
    monthLabel: now.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
    invoicesCount: invoices.length,
    expensesCount: expenses.length,
    pendingInvoicesCount: pendingInvoices.length,
    issuedBase: sum(invoices.map((invoice) => invoice.totals.subtotal)),
    collected: dashboard.cash.collected,
    availableReal: dashboard.cash.availableReal,
    reservedVat: dashboard.cash.reservedVat,
    reservedIrpf: dashboard.cash.reservedIrpf,
    reservedReta: dashboard.cash.reservedReta,
    riskyExpensesCount: riskyExpenses.length,
    closureStatus: closure.status,
    nextDueDate: closure.snapshot.model303.dueDate,
  };
}

function detectFiscalAnomalies(context: FiscalAssistantContext, closure: QuarterlyClosure) {
  const anomalies: Array<{
    severity: "alta" | "media" | "baja";
    title: string;
    detail: string;
    action: string;
  }> = [];

  for (const expense of context.expenses) {
    for (const alert of expense.alerts) {
      anomalies.push({
        severity: alert.includes("Factura completa") || alert.includes("IVA") ? "alta" : "media",
        title: `Revisar gasto: ${expense.supplierName || expense.description || "sin proveedor"}`,
        detail: alert,
        action: "Corrige documento, categoría o afectación antes del cierre.",
      });
    }
  }

  for (const invoice of context.invoices) {
    if (invoice.status === "issued" && invoice.paymentStatus !== "paid" && parseDate(invoice.dueDate) < new Date()) {
      anomalies.push({
        severity: "media",
        title: `Factura vencida pendiente de cobro: ${invoice.number}`,
        detail: `${invoice.client.name} vencía el ${invoice.dueDate}.`,
        action: "Actualiza cobro o reclama antes de estimar caja disponible.",
      });
    }
    if (invoice.regime === "eu_reverse_charge" && !invoice.client.tax.vatNumber) {
      anomalies.push({
        severity: "alta",
        title: `Factura UE sin VAT: ${invoice.number}`,
        detail: "Una operación UE B2B para 349 necesita VAT/NIF intracomunitario.",
        action: "Completa VAT del cliente y valida VIES.",
      });
    }
  }

  for (const item of closure.snapshot.checklist) {
    if (item.blocking && !item.done) {
      anomalies.push({
        severity: "alta",
        title: "Bloqueante de cierre",
        detail: item.label,
        action: "Resuelve este punto antes de marcar el cierre como presentado.",
      });
    }
  }

  const unvalidatedEuClients = context.clients.filter((client) =>
    client.tax.countryCode !== "ES" && client.tax.viesStatus !== "valid",
  );
  for (const client of unvalidatedEuClients) {
    anomalies.push({
      severity: "media",
      title: `Cliente UE sin VIES válido: ${client.name}`,
      detail: `${client.tax.countryCode} · ${client.tax.viesStatus}`,
      action: "Valida VIES antes de emitir nuevas facturas UE.",
    });
  }

  return anomalies.slice(0, 20);
}

function buildGestoriaMessage(closure: QuarterlyClosure, anomalies: ReturnType<typeof detectFiscalAnomalies>): string {
  const critical = anomalies.filter((item) => item.severity === "alta");
  return [
    `Hola, te paso el cierre T${closure.quarter} ${closure.year} generado desde ForMeta.`,
    `Modelo 303 estimado: ${formatMoney(closure.snapshot.model303.amount)}.`,
    closure.snapshot.model130.required
      ? `Modelo 130 estimado: ${formatMoney(closure.snapshot.model130.amount)}.`
      : `Modelo 130: no obligatorio según regla actual (${closure.snapshot.model130.reason}).`,
    closure.snapshot.model349.required
      ? `Modelo 349: hay ${closure.snapshot.model349Operations.length} operaciones UE por base ${formatMoney(closure.snapshot.model349.amount)}.`
      : "Modelo 349: sin operaciones UE declarables.",
    `Facturas emitidas: ${closure.snapshot.invoicesCount}. Gastos/facturas recibidas: ${closure.snapshot.expensesCount}.`,
    critical.length > 0
      ? `Puntos bloqueantes a revisar: ${critical.map((item) => item.title).join("; ")}.`
      : "No aparecen bloqueantes críticos en el checklist.",
    "Confírmame si ves algo que ajustar antes de presentar.",
  ].join("\n");
}

function explainInvoice(invoice: Invoice) {
  return {
    number: invoice.number,
    clientName: invoice.client.name,
    issueDate: invoice.issueDate,
    regime: invoiceRegimeLabel(invoice.regime),
    subtotal: invoice.totals.subtotal,
    vatRate: invoice.vatRate,
    vat: invoice.totals.vat,
    withholdingRate: invoice.withholdingRate,
    withholding: invoice.totals.withholding,
    total: invoice.totals.total,
    paymentStatus: invoice.paymentStatus,
    legalNote: invoice.legalNote,
  };
}

function simulateMonthlyClient(monthlyBase: number, vatRate: number, withholdingRate: number) {
  const vat = roundMoney(monthlyBase * (vatRate / 100));
  const withholding = roundMoney(monthlyBase * (withholdingRate / 100));
  const cashIn = roundMoney(monthlyBase + vat - withholding);
  const reserve = roundMoney(vat + Math.max(0, monthlyBase * 0.2 - withholding));
  return {
    monthlyBase,
    vat,
    withholding,
    cashIn,
    suggestedReserve: reserve,
    reserve,
    availableBeforeReta: roundMoney(cashIn - reserve),
    note: "Escenario simple nacional B2B con IVA y retención por defecto del perfil fiscal.",
  };
}

function summarizeVies(clients: Client[]): string {
  const valid = clients.filter((client) => client.tax.viesStatus === "valid").length;
  const unchecked = clients.filter((client) => client.tax.countryCode !== "ES" && client.tax.viesStatus !== "valid").length;
  return `${valid} clientes con VIES válido; ${unchecked} clientes UE/no ES pendientes o no válidos.`;
}

function findInvoiceForQuestion(normalizedQuestion: string, invoices: Invoice[]): Invoice | null {
  return invoices.find((invoice) => normalize(invoice.number) && normalizedQuestion.includes(normalize(invoice.number))) ?? null;
}

function extractMonthlyAmount(normalizedQuestion: string): number | null {
  const match = normalizedQuestion.match(/(\d{1,3}(?:[.\s]\d{3})*|\d+)(?:,\d{1,2})?\s*(?:€|eur|euros)?\s*\/?\s*mes/);
  if (!match) return null;
  const value = Number(match[1].replace(/[.\s]/g, ""));
  return Number.isFinite(value) ? value : null;
}

function inferIntent(normalizedQuestion: string): string {
  if (includesAny(normalizedQuestion, ["que deberia hacer este mes", "hacer este mes"])) return "recomendacion_mensual";
  if (includesAny(normalizedQuestion, ["349", "ue", "intracomunitaria"])) return "modelo_349";
  if (includesAny(normalizedQuestion, ["130", "retencion", "retención"])) return "modelo_130";
  if (includesAny(normalizedQuestion, ["gastos", "deducir", "deducible"])) return "deducciones";
  if (includesAny(normalizedQuestion, ["anomalia", "anomalía", "detecta"])) return "anomalias";
  if (includesAny(normalizedQuestion, ["reservar", "cliente", "proyect"])) return "proyeccion";
  if (includesAny(normalizedQuestion, ["factura", "explica"])) return "explicar_factura";
  return "resumen";
}

function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

function sum(values: number[]): number {
  return roundMoney(values.reduce((total, value) => total + value, 0));
}

function includesAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(normalize(needle)));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
