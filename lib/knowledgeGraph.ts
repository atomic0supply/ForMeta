import {
  calculateQuarterlyClosure,
  determineInvoiceRegime,
  expenseCategoryLabel,
  fiscalCustomerKindLabel,
  invoiceRegimeLabel,
  type Expense,
  type FiscalProfile,
  type Invoice,
  type InvoiceRegime,
  type QuarterlyClosure,
} from "@/lib/fiscal";
import type { Client } from "@/lib/clients";
import type { Project } from "@/lib/projects";

export type KnowledgeNodeType =
  | "client"
  | "project"
  | "invoice"
  | "payment"
  | "expense"
  | "deduction_rule"
  | "period"
  | "obligation"
  | "tax_regime"
  | "country";

export type KnowledgeEdgeType =
  | "owns_project"
  | "billed_by"
  | "imputed_to"
  | "has_payment"
  | "uses_regime"
  | "located_in"
  | "classified_by"
  | "affects_deduction"
  | "period_has_obligation"
  | "country_allows_regime"
  | "requires_review";

export type KnowledgeNode = {
  id: string;
  type: KnowledgeNodeType;
  label: string;
  sourceTable: string;
  sourceId: string;
  attributes: Record<string, string | number | boolean | null>;
};

export type KnowledgeEdge = {
  id: string;
  type: KnowledgeEdgeType;
  from: string;
  to: string;
  label: string;
  attributes?: Record<string, string | number | boolean | null>;
};

export type KnowledgeGraph = {
  generatedAt: string;
  source: "runtime_projection" | "sqlite_projection";
  truthSource: "SQLite" | "ForMeta runtime";
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
};

export type KnowledgeGraphSummary = {
  nodes: number;
  edges: number;
  clients: number;
  projects: number;
  invoices: number;
  expenses: number;
  obligations: number;
  taxRegimes: number;
  pendingPayments: number;
  riskyDeductions: number;
};

export type GraphRagResult = {
  query: string;
  answer: string;
  paths: Array<{
    title: string;
    nodes: string[];
    edges: string[];
  }>;
  citations: Array<{
    nodeId: string;
    label: string;
    type: KnowledgeNodeType;
  }>;
};

export type SQLiteProjectionRows = {
  clients: Array<{
    id: string;
    name: string;
    countryCode?: string;
    customerKind?: string;
    vatNumber?: string;
    viesStatus?: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    clientId: string;
    status?: string;
  }>;
  invoices: Array<{
    id: string;
    number: string;
    clientId: string;
    projectIds?: string[];
    countryCode?: string;
    customerKind?: string;
    regime?: InvoiceRegime;
    issueDate: string;
    period?: string;
    status?: string;
    paymentStatus?: string;
    subtotal: number;
    vat: number;
    withholding: number;
    total: number;
  }>;
  payments?: Array<{
    id: string;
    invoiceId: string;
    status: string;
    amount: number;
    paidAt?: string;
  }>;
  expenses: Array<{
    id: string;
    supplierName: string;
    categoryId: string;
    documentType: string;
    issueDate: string;
    period?: string;
    base: number;
    deductibleBase: number;
    deductibleVat: number;
    affectionPercent: number;
    alerts?: string[];
  }>;
  obligations?: Array<{
    id: string;
    period: string;
    model: "303" | "130" | "349";
    amount: number;
    required: boolean;
    dueDate: string;
    status: string;
  }>;
  regimes?: Array<{
    id: string;
    countryCode: string;
    customerKind: string;
    regime: InvoiceRegime;
    label: string;
  }>;
};

export function buildKnowledgeGraphFromForMeta(input: {
  profile: FiscalProfile;
  clients: Client[];
  projects: Project[];
  invoices: Invoice[];
  expenses: Expense[];
  closures: QuarterlyClosure[];
}): KnowledgeGraph {
  const graph = createGraph("runtime_projection", "ForMeta runtime");
  const activeInvoices = input.invoices.filter((invoice) => invoice.status !== "cancelled");
  const closures = input.closures.length > 0
    ? input.closures
    : [calculateQuarterlyClosure(activeInvoices, input.expenses, input.profile, new Date().getFullYear(), ((Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4))];

  for (const client of input.clients) {
    addNode(graph, {
      id: nodeId("client", client.id),
      type: "client",
      label: client.name,
      sourceTable: "clients",
      sourceId: client.id,
      attributes: {
        countryCode: client.tax.countryCode,
        customerKind: client.tax.customerKind,
        fiscalKind: fiscalCustomerKindLabel(client.tax.customerKind),
        vatNumber: client.tax.vatNumber,
        viesStatus: client.tax.viesStatus,
      },
    });
    addCountryAndRegime(graph, client.tax.countryCode, client.tax.customerKind, determineInvoiceRegime(client.tax));
    addEdge(graph, "located_in", nodeId("client", client.id), nodeId("country", client.tax.countryCode), "reside/opera en");
    addEdge(graph, "uses_regime", nodeId("client", client.id), regimeNodeId(client.tax.countryCode, client.tax.customerKind, determineInvoiceRegime(client.tax)), "régimen fiscal por defecto");
  }

  for (const project of input.projects) {
    addNode(graph, {
      id: nodeId("project", project.id),
      type: "project",
      label: project.name,
      sourceTable: "projects",
      sourceId: project.id,
      attributes: {
        status: project.status,
        clientId: project.clientId,
        hourlyRate: project.hourlyRate ?? null,
        budgetHours: project.budgetHours ?? null,
      },
    });
    if (project.clientId) {
      addEdge(graph, "owns_project", nodeId("client", project.clientId), nodeId("project", project.id), "cliente-proyecto");
    }
  }

  for (const invoice of activeInvoices) {
    addInvoiceProjection(graph, invoice);
  }

  for (const expense of input.expenses) {
    addExpenseProjection(graph, {
      id: expense.id,
      supplierName: expense.supplierName,
      categoryId: expense.categoryId,
      categoryLabel: expenseCategoryLabel(expense.categoryId),
      documentType: expense.documentType,
      issueDate: expense.issueDate,
      period: periodFromDate(expense.issueDate),
      base: expense.base,
      deductibleBase: expense.deductibleBase,
      deductibleVat: expense.deductibleVat,
      affectionPercent: expense.affectionPercent,
      alerts: expense.alerts,
    });
  }

  for (const closure of closures) {
    addClosureProjection(graph, closure);
  }

  return graph;
}

export function buildKnowledgeGraphFromSQLiteProjection(rows: SQLiteProjectionRows): KnowledgeGraph {
  const graph = createGraph("sqlite_projection", "SQLite");

  for (const client of rows.clients) {
    const countryCode = normalizeCountry(client.countryCode);
    const customerKind = normalizeCustomerKind(client.customerKind);
    const regime = rows.regimes?.find((item) =>
      normalizeCountry(item.countryCode) === countryCode && item.customerKind === customerKind,
    )?.regime ?? inferRegime(countryCode, customerKind);
    addNode(graph, {
      id: nodeId("client", client.id),
      type: "client",
      label: client.name,
      sourceTable: "clients",
      sourceId: client.id,
      attributes: {
        countryCode,
        customerKind,
        vatNumber: client.vatNumber ?? "",
        viesStatus: client.viesStatus ?? "not_checked",
      },
    });
    addCountryAndRegime(graph, countryCode, customerKind, regime);
    addEdge(graph, "located_in", nodeId("client", client.id), nodeId("country", countryCode), "reside/opera en");
    addEdge(graph, "uses_regime", nodeId("client", client.id), regimeNodeId(countryCode, customerKind, regime), "régimen fiscal por defecto");
  }

  for (const project of rows.projects) {
    addNode(graph, {
      id: nodeId("project", project.id),
      type: "project",
      label: project.name,
      sourceTable: "projects",
      sourceId: project.id,
      attributes: { clientId: project.clientId, status: project.status ?? "" },
    });
    addEdge(graph, "owns_project", nodeId("client", project.clientId), nodeId("project", project.id), "cliente-proyecto");
  }

  for (const invoice of rows.invoices) {
    addGenericInvoiceProjection(graph, invoice);
  }

  for (const payment of rows.payments ?? []) {
    addPaymentProjection(graph, payment.invoiceId, payment.id, payment.status, payment.amount, payment.paidAt ?? "");
  }

  for (const expense of rows.expenses) {
    addExpenseProjection(graph, {
      id: expense.id,
      supplierName: expense.supplierName,
      categoryId: expense.categoryId,
      categoryLabel: expense.categoryId,
      documentType: expense.documentType,
      issueDate: expense.issueDate,
      period: expense.period ?? periodFromDate(expense.issueDate),
      base: expense.base,
      deductibleBase: expense.deductibleBase,
      deductibleVat: expense.deductibleVat,
      affectionPercent: expense.affectionPercent,
      alerts: expense.alerts ?? [],
    });
  }

  for (const obligation of rows.obligations ?? []) {
    addPeriodNode(graph, obligation.period);
    const obligationId = nodeId("obligation", obligation.id);
    addNode(graph, {
      id: obligationId,
      type: "obligation",
      label: `Modelo ${obligation.model} · ${obligation.period}`,
      sourceTable: "obligations",
      sourceId: obligation.id,
      attributes: {
        model: obligation.model,
        amount: obligation.amount,
        required: obligation.required,
        dueDate: obligation.dueDate,
        status: obligation.status,
      },
    });
    addEdge(graph, "period_has_obligation", nodeId("period", obligation.period), obligationId, "obligación del periodo");
  }

  for (const regime of rows.regimes ?? []) {
    addCountryAndRegime(graph, regime.countryCode, regime.customerKind, regime.regime);
  }

  return graph;
}

export function summarizeKnowledgeGraph(graph: KnowledgeGraph): KnowledgeGraphSummary {
  return {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    clients: countNodes(graph, "client"),
    projects: countNodes(graph, "project"),
    invoices: countNodes(graph, "invoice"),
    expenses: countNodes(graph, "expense"),
    obligations: countNodes(graph, "obligation"),
    taxRegimes: countNodes(graph, "tax_regime"),
    pendingPayments: graph.nodes.filter((node) => node.type === "payment" && node.attributes.status !== "paid").length,
    riskyDeductions: graph.edges.filter((edge) => edge.type === "requires_review").length,
  };
}

export function queryKnowledgeGraph(graph: KnowledgeGraph, query: string): GraphRagResult {
  const normalized = normalize(query);
  const paths: GraphRagResult["paths"] = [];

  if (includesAny(normalized, ["cliente", "proyecto", "factura", "pago", "cobro"])) {
    paths.push(...clientProjectInvoicePaymentPaths(graph).slice(0, 8));
  }
  if (includesAny(normalized, ["gasto", "deducc", "regla", "iva soportado"])) {
    paths.push(...expenseDeductionPaths(graph).slice(0, 8));
  }
  if (includesAny(normalized, ["obligacion", "obligación", "periodo", "303", "130", "349", "trimestre"])) {
    paths.push(...obligationPaths(graph).slice(0, 8));
  }
  if (includesAny(normalized, ["regimen", "régimen", "pais", "país", "cliente ue", "vies"])) {
    paths.push(...taxRegimePaths(graph).slice(0, 8));
  }

  if (paths.length === 0) {
    paths.push(...genericSemanticMatches(graph, normalized).slice(0, 8));
  }

  const uniquePaths = dedupePaths(paths).slice(0, 10);
  const citations = uniquePaths
    .flatMap((path) => path.nodes)
    .map((id) => graph.nodes.find((node) => node.id === id))
    .filter((node): node is KnowledgeNode => Boolean(node))
    .filter((node, index, arr) => arr.findIndex((item) => item.id === node.id) === index)
    .slice(0, 12)
    .map((node) => ({ nodeId: node.id, label: node.label, type: node.type }));

  return {
    query,
    answer: buildGraphAnswer(graph, uniquePaths),
    paths: uniquePaths,
    citations,
  };
}

function createGraph(source: KnowledgeGraph["source"], truthSource: KnowledgeGraph["truthSource"]): KnowledgeGraph {
  return {
    generatedAt: new Date().toISOString(),
    source,
    truthSource,
    nodes: [],
    edges: [],
  };
}

function addNode(graph: KnowledgeGraph, node: KnowledgeNode): void {
  if (!graph.nodes.some((item) => item.id === node.id)) graph.nodes.push(node);
}

function addEdge(
  graph: KnowledgeGraph,
  type: KnowledgeEdgeType,
  from: string,
  to: string,
  label: string,
  attributes: KnowledgeEdge["attributes"] = {},
): void {
  if (from === to) return;
  const id = `${type}:${from}->${to}`;
  if (!graph.edges.some((edge) => edge.id === id)) {
    graph.edges.push({ id, type, from, to, label, attributes });
  }
}

function addCountryAndRegime(
  graph: KnowledgeGraph,
  countryCode: string,
  customerKind: string,
  regime: InvoiceRegime,
): void {
  const country = normalizeCountry(countryCode);
  const regimeId = regimeNodeId(country, customerKind, regime);
  addNode(graph, {
    id: nodeId("country", country),
    type: "country",
    label: country,
    sourceTable: "tax_regime_rules",
    sourceId: country,
    attributes: { countryCode: country },
  });
  addNode(graph, {
    id: regimeId,
    type: "tax_regime",
    label: `${country} · ${customerKind} · ${invoiceRegimeLabel(regime)}`,
    sourceTable: "tax_regime_rules",
    sourceId: `${country}-${customerKind}-${regime}`,
    attributes: { countryCode: country, customerKind, regime, label: invoiceRegimeLabel(regime) },
  });
  addEdge(graph, "country_allows_regime", nodeId("country", country), regimeId, "régimen por país/tipo");
}

function addInvoiceProjection(graph: KnowledgeGraph, invoice: Invoice): void {
  addGenericInvoiceProjection(graph, {
    id: invoice.id,
    number: invoice.number,
    clientId: invoice.client.id,
    projectIds: invoice.projectIds,
    countryCode: invoice.client.tax.countryCode,
    customerKind: invoice.client.tax.customerKind,
    regime: invoice.regime,
    issueDate: invoice.issueDate,
    period: periodFromDate(invoice.issueDate),
    status: invoice.status,
    paymentStatus: invoice.paymentStatus,
    subtotal: invoice.totals.subtotal,
    vat: invoice.totals.vat,
    withholding: invoice.totals.withholding,
    total: invoice.totals.total,
  });
  addPaymentProjection(
    graph,
    invoice.id,
    invoice.id,
    invoice.paymentStatus,
    invoice.paidAmount ?? invoice.totals.total,
    invoice.paidAt ? invoice.paidAt.toDate().toISOString() : "",
  );
}

function addGenericInvoiceProjection(graph: KnowledgeGraph, invoice: SQLiteProjectionRows["invoices"][number]): void {
  const countryCode = normalizeCountry(invoice.countryCode);
  const customerKind = normalizeCustomerKind(invoice.customerKind);
  const regime = invoice.regime ?? inferRegime(countryCode, customerKind);
  const invoiceId = nodeId("invoice", invoice.id);
  addCountryAndRegime(graph, countryCode, customerKind, regime);
  addPeriodNode(graph, invoice.period ?? periodFromDate(invoice.issueDate));
  addNode(graph, {
    id: invoiceId,
    type: "invoice",
    label: invoice.number,
    sourceTable: "invoices",
    sourceId: invoice.id,
    attributes: {
      number: invoice.number,
      issueDate: invoice.issueDate,
      status: invoice.status ?? "issued",
      paymentStatus: invoice.paymentStatus ?? "pending",
      subtotal: invoice.subtotal,
      vat: invoice.vat,
      withholding: invoice.withholding,
      total: invoice.total,
      regime,
    },
  });
  addEdge(graph, "billed_by", nodeId("client", invoice.clientId), invoiceId, "cliente-factura", { total: invoice.total });
  addEdge(graph, "uses_regime", invoiceId, regimeNodeId(countryCode, customerKind, regime), "régimen aplicado");
  addEdge(graph, "period_has_obligation", nodeId("period", invoice.period ?? periodFromDate(invoice.issueDate)), invoiceId, "actividad del periodo");
  for (const projectId of invoice.projectIds ?? []) {
    addEdge(graph, "imputed_to", invoiceId, nodeId("project", projectId), "factura imputada a proyecto");
  }
}

function addPaymentProjection(
  graph: KnowledgeGraph,
  invoiceId: string,
  paymentId: string,
  status: string,
  amount: number,
  paidAt: string,
): void {
  const id = nodeId("payment", paymentId);
  addNode(graph, {
    id,
    type: "payment",
    label: status === "paid" ? "Cobro registrado" : "Cobro pendiente",
    sourceTable: "payments",
    sourceId: paymentId,
    attributes: { status, amount, paidAt },
  });
  addEdge(graph, "has_payment", nodeId("invoice", invoiceId), id, "factura-pago", { status, amount });
}

function addExpenseProjection(
  graph: KnowledgeGraph,
  expense: {
    id: string;
    supplierName: string;
    categoryId: string;
    categoryLabel: string;
    documentType: string;
    issueDate: string;
    period: string;
    base: number;
    deductibleBase: number;
    deductibleVat: number;
    affectionPercent: number;
    alerts: string[];
  },
): void {
  const expenseId = nodeId("expense", expense.id);
  const ruleId = nodeId("deduction_rule", `${expense.categoryId}-${expense.documentType}-${expense.affectionPercent}`);
  addPeriodNode(graph, expense.period);
  addNode(graph, {
    id: expenseId,
    type: "expense",
    label: expense.supplierName || expense.categoryLabel,
    sourceTable: "expenses",
    sourceId: expense.id,
    attributes: {
      categoryId: expense.categoryId,
      categoryLabel: expense.categoryLabel,
      documentType: expense.documentType,
      issueDate: expense.issueDate,
      base: expense.base,
      deductibleBase: expense.deductibleBase,
      deductibleVat: expense.deductibleVat,
      affectionPercent: expense.affectionPercent,
      alerts: expense.alerts.length,
    },
  });
  addNode(graph, {
    id: ruleId,
    type: "deduction_rule",
    label: `${expense.categoryLabel} · ${expense.documentType} · ${expense.affectionPercent}%`,
    sourceTable: "deduction_rules",
    sourceId: ruleId,
    attributes: {
      categoryId: expense.categoryId,
      documentType: expense.documentType,
      affectionPercent: expense.affectionPercent,
      requiresCompleteInvoice: expense.deductibleVat > 0,
    },
  });
  addEdge(graph, "classified_by", expenseId, ruleId, "gasto-regla");
  addEdge(graph, "affects_deduction", ruleId, expenseId, "regla-deducción", {
    deductibleBase: expense.deductibleBase,
    deductibleVat: expense.deductibleVat,
  });
  addEdge(graph, "period_has_obligation", nodeId("period", expense.period), expenseId, "gasto del periodo");
  if (expense.alerts.length > 0) {
    addEdge(graph, "requires_review", expenseId, ruleId, "alerta de deducción", { alerts: expense.alerts.join(" · ") });
  }
}

function addClosureProjection(graph: KnowledgeGraph, closure: QuarterlyClosure): void {
  const period = `${closure.year}-Q${closure.quarter}`;
  addPeriodNode(graph, period);
  for (const model of [closure.snapshot.model303, closure.snapshot.model130, closure.snapshot.model349]) {
    const id = nodeId("obligation", `${period}-${model.model}`);
    addNode(graph, {
      id,
      type: "obligation",
      label: `Modelo ${model.model} · ${period}`,
      sourceTable: "quarterly_closures",
      sourceId: `${closure.id}-${model.model}`,
      attributes: {
        model: model.model,
        amount: model.amount,
        required: model.required,
        dueDate: model.dueDate,
        reason: model.reason,
        status: closure.status,
      },
    });
    addEdge(graph, "period_has_obligation", nodeId("period", period), id, "obligación del periodo");
  }
}

function addPeriodNode(graph: KnowledgeGraph, period: string): void {
  addNode(graph, {
    id: nodeId("period", period),
    type: "period",
    label: period,
    sourceTable: "periods",
    sourceId: period,
    attributes: { period },
  });
}

function clientProjectInvoicePaymentPaths(graph: KnowledgeGraph): GraphRagResult["paths"] {
  return graph.edges
    .filter((edge) => edge.type === "billed_by")
    .map((edge) => {
      const invoicePayment = graph.edges.find((candidate) => candidate.type === "has_payment" && candidate.from === edge.to);
      const invoiceProject = graph.edges.find((candidate) => candidate.type === "imputed_to" && candidate.from === edge.to);
      return {
        title: "Relación cliente-proyecto-factura-pago",
        nodes: [edge.from, edge.to, invoiceProject?.to, invoicePayment?.to].filter(Boolean) as string[],
        edges: [edge.id, invoiceProject?.id, invoicePayment?.id].filter(Boolean) as string[],
      };
    });
}

function expenseDeductionPaths(graph: KnowledgeGraph): GraphRagResult["paths"] {
  return graph.edges
    .filter((edge) => edge.type === "classified_by")
    .map((edge) => {
      const review = graph.edges.find((candidate) => candidate.type === "requires_review" && candidate.from === edge.from);
      return {
        title: review ? "Gasto con regla de deducción a revisar" : "Relación gasto-regla-deducción",
        nodes: [edge.from, edge.to],
        edges: [edge.id, review?.id].filter(Boolean) as string[],
      };
    });
}

function obligationPaths(graph: KnowledgeGraph): GraphRagResult["paths"] {
  return graph.edges
    .filter((edge) => edge.type === "period_has_obligation" && graph.nodes.find((node) => node.id === edge.to)?.type === "obligation")
    .map((edge) => ({
      title: "Obligación por periodo",
      nodes: [edge.from, edge.to],
      edges: [edge.id],
    }));
}

function taxRegimePaths(graph: KnowledgeGraph): GraphRagResult["paths"] {
  return graph.edges
    .filter((edge) => edge.type === "uses_regime" || edge.type === "country_allows_regime")
    .map((edge) => ({
      title: "Régimen fiscal por país/tipo de cliente",
      nodes: [edge.from, edge.to],
      edges: [edge.id],
    }));
}

function genericSemanticMatches(graph: KnowledgeGraph, normalizedQuery: string): GraphRagResult["paths"] {
  const tokens = normalizedQuery.split(/\s+/).filter((token) => token.length > 2);
  return graph.nodes
    .filter((node) => tokens.some((token) => normalize(`${node.label} ${Object.values(node.attributes).join(" ")}`).includes(token)))
    .map((node) => ({
      title: `Nodo semántico: ${node.label}`,
      nodes: [node.id],
      edges: graph.edges.filter((edge) => edge.from === node.id || edge.to === node.id).slice(0, 3).map((edge) => edge.id),
    }));
}

function buildGraphAnswer(graph: KnowledgeGraph, paths: GraphRagResult["paths"]): string {
  const summary = summarizeKnowledgeGraph(graph);
  if (paths.length === 0) {
    return `Grafo proyectado desde ${graph.truthSource}: ${summary.nodes} nodos y ${summary.edges} relaciones. No hay caminos relevantes para esa consulta.`;
  }
  return [
    `Grafo proyectado desde ${graph.truthSource}: ${summary.nodes} nodos, ${summary.edges} relaciones.`,
    `He encontrado ${paths.length} camino(s) semántico(s).`,
    summary.pendingPayments > 0 ? `${summary.pendingPayments} cobro(s) pendiente(s).` : "Sin cobros pendientes en el grafo.",
    summary.riskyDeductions > 0 ? `${summary.riskyDeductions} gasto(s) con revisión de deducción.` : "Sin alertas de deducción en el grafo.",
  ].join(" ");
}

function dedupePaths(paths: GraphRagResult["paths"]): GraphRagResult["paths"] {
  const seen = new Set<string>();
  return paths.filter((path) => {
    const key = `${path.title}:${path.nodes.join(">")}:${path.edges.join(">")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countNodes(graph: KnowledgeGraph, type: KnowledgeNodeType): number {
  return graph.nodes.filter((node) => node.type === type).length;
}

function inferRegime(countryCode: string, customerKind: string): InvoiceRegime {
  if (customerKind === "individual") return "private_es_eu";
  if (countryCode === "ES") return "national";
  if (isEuCountry(countryCode)) return "eu_reverse_charge";
  return "services_export";
}

function periodFromDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "unknown";
  return `${parsed.getFullYear()}-Q${Math.floor(parsed.getMonth() / 3) + 1}`;
}

function nodeId(type: KnowledgeNodeType, id: string): string {
  return `${type}:${id || "unknown"}`;
}

function regimeNodeId(countryCode: string, customerKind: string, regime: InvoiceRegime): string {
  return nodeId("tax_regime", `${normalizeCountry(countryCode)}-${customerKind}-${regime}`);
}

function normalizeCountry(countryCode: string | undefined): string {
  return (countryCode || "ES").trim().toUpperCase() || "ES";
}

function normalizeCustomerKind(value: string | undefined): string {
  if (value === "self_employed" || value === "individual") return value;
  return "business";
}

function isEuCountry(countryCode: string): boolean {
  return [
    "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR",
    "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO",
    "SE", "SI", "SK",
  ].includes(normalizeCountry(countryCode));
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
