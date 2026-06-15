"use client";

import { Timestamp } from "firebase/firestore";
import {
  AlertTriangle,
  Ban,
  Banknote,
  BookOpen,
  CalendarClock,
  Check,
  Bot,
  Download,
  Database,
  FileText,
  Hash,
  Landmark,
  PackageCheck,
  Plus,
  QrCode,
  ReceiptText,
  Save,
  SearchCheck,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  appendFiscalEvent,
  applyExpenseCategoryDefaults,
  buildFiscalBooks,
  cancelInvoice,
  calculateFiscalPaymentDashboard,
  calculateInvoiceTotals,
  calculatePluriannualProjection,
  calculateQuarterlyClosure,
  DEFAULT_FISCAL_PROFILE,
  defaultDueDate,
  determineInvoiceRegime,
  downloadClosureExport,
  downloadInvoicePdf,
  EXPENSE_CATEGORIES,
  expenseCategoryLabel,
  fiscalCustomerKindLabel,
  formatMoney,
  formatPercent,
  createExpense,
  createExpenseFromRecurring,
  createRecurringExpense,
  invoiceRegimeLabel,
  issueInvoice,
  makeEmptyExpenseInput,
  makeInvoiceLine,
  markInvoicePayment,
  normalizeExpenseInput,
  saveQuarterlyClosure,
  saveFiscalProfile,
  subscribeExpenses,
  subscribeFiscalEvents,
  subscribeFiscalProfile,
  subscribeInvoices,
  subscribeQuarterlyClosures,
  subscribeRecurringExpenses,
  updateExpense,
  type Expense,
  type ExpenseCategoryId,
  type ExpenseInput,
  type FiscalEvent,
  type FiscalProfile,
  type FiscalPaymentDashboard,
  type Invoice,
  type InvoiceLine,
  type PluriannualProjection,
  type PluriannualProjectionOptions,
  type QuarterlyClosure,
  type QuarterlyClosureStatus,
  type RecurringExpense,
  type RecurringExpenseInput,
} from "@/lib/fiscal";
import type { FiscalAssistantToolResult } from "@/lib/fiscalAssistant";
import type { FormetaServicesStatus } from "@/lib/formetaServices";
import {
  createFiscalWatcherAlert,
  FISCAL_WATCHER_SOURCES,
  saveFiscalWatcherSourceSignature,
  subscribeFiscalWatcherAlerts,
  subscribeFiscalWatcherSourceSignatures,
  updateFiscalWatcherAlertStatus,
  type FiscalWatcherAlert,
  type FiscalWatcherRunResult,
  type FiscalWatcherStatus,
} from "@/lib/fiscalWatcher";
import {
  buildKnowledgeGraphFromForMeta,
  queryKnowledgeGraph,
  summarizeKnowledgeGraph,
  type GraphRagResult,
  type KnowledgeGraph,
  type KnowledgeGraphSummary,
} from "@/lib/knowledgeGraph";
import {
  DEFAULT_VERIFACTU_CONFIG,
  enqueueVerifactuRecord,
  findLatestVerifactuRecord,
  markVerifactuRecordStatus,
  saveVerifactuConfig,
  subscribeVerifactuConfig,
  subscribeVerifactuRecords,
  verifactuStatusLabel,
  verifyVerifactuChain,
  type VerifactuConfig,
  type VerifactuEnvironment,
  type VerifactuMode,
  type VerifactuRecord,
} from "@/lib/verifactu";
import {
  subscribeToClients,
  updateClient,
  type Client,
  type ClientTaxProfile,
} from "@/lib/clients";
import { subscribeToProjects, type Project } from "@/lib/projects";
import styles from "@/styles/intranet-fiscal.module.css";

type Tab = "pagar" | "proyeccion" | "verifactu" | "grafo" | "asistente" | "watcher" | "backend" | "emitir" | "facturas" | "gastos" | "cierres" | "libros" | "clientes" | "perfil" | "eventos";

type ViesResponse = {
  valid: boolean;
  countryCode?: string;
  vatNumber?: string;
  requestDate?: string;
  name?: string;
  address?: string;
  checkedAt?: string;
  error?: string;
};

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  tools?: FiscalAssistantToolResult[];
  recommendations?: string[];
  model?: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyExpense = makeEmptyExpenseInput(today());
const emptyRecurringExpense: RecurringExpenseInput = {
  name: "",
  supplierName: "",
  supplierTaxId: "",
  invoiceNumber: "",
  categoryId: "software",
  description: "",
  kind: "current",
  documentType: "complete_invoice",
  countryCode: "ES",
  base: 0,
  vatRate: 21,
  affectionPercent: 100,
  irpfDeductible: true,
  vatDeductible: true,
  interval: "monthly",
  nextIssueDate: today(),
  active: true,
};

const emptyTax: ClientTaxProfile = {
  customerKind: "business",
  countryCode: "ES",
  taxId: "",
  vatNumber: "",
  fiscalName: "",
  fiscalAddress: "",
  postalCode: "",
  city: "",
  province: "",
  viesStatus: "not_checked",
  viesCheckedAt: null,
  viesName: "",
  viesAddress: "",
  viesRequestId: "",
  viesError: "",
};

export function FiscalView() {
  const [tab, setTab] = useState<Tab>("pagar");
  const [profile, setProfile] = useState<FiscalProfile>(DEFAULT_FISCAL_PROFILE);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [closures, setClosures] = useState<QuarterlyClosure[]>([]);
  const [events, setEvents] = useState<FiscalEvent[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTax, setSavingTax] = useState(false);
  const [viesChecking, setViesChecking] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [notice, setNotice] = useState("");
  const [expenseForm, setExpenseForm] = useState<ExpenseInput>(emptyExpense);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [recurringForm, setRecurringForm] = useState<RecurringExpenseInput>(emptyRecurringExpense);
  const [savingRecurring, setSavingRecurring] = useState(false);
  const [closureYear, setClosureYear] = useState(new Date().getFullYear());
  const [closureQuarter, setClosureQuarter] = useState<1 | 2 | 3 | 4>((Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4);
  const [savingClosure, setSavingClosure] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Pregúntame qué deberías hacer este mes. Yo recomiendo y explico; los importes los calcula ForMeta.",
    },
  ]);
  const [backendStatus, setBackendStatus] = useState<FormetaServicesStatus | null>(null);
  const [backendLoading, setBackendLoading] = useState(false);
  const [watcherAlerts, setWatcherAlerts] = useState<FiscalWatcherAlert[]>([]);
  const [watcherSignatures, setWatcherSignatures] = useState<Record<string, string>>({});
  const [watcherRunning, setWatcherRunning] = useState(false);
  const [graphQuestion, setGraphQuestion] = useState("Relaciones cliente proyecto factura pago");
  const [verifactuConfig, setVerifactuConfig] = useState<VerifactuConfig>(DEFAULT_VERIFACTU_CONFIG);
  const [verifactuRecords, setVerifactuRecords] = useState<VerifactuRecord[]>([]);
  const [verifactuInvoiceId, setVerifactuInvoiceId] = useState("");
  const [savingVerifactu, setSavingVerifactu] = useState(false);
  const [verifactuBusy, setVerifactuBusy] = useState(false);
  const [projectionOptions, setProjectionOptions] = useState<Partial<PluriannualProjectionOptions>>({
    startYear: new Date().getFullYear(),
    years: 5,
    annualRevenueGrowthPercent: 8,
    annualExpenseGrowthPercent: 4,
    employmentGrossAnnual: 0,
    employmentSocialSecurityAnnual: DEFAULT_FISCAL_PROFILE.employeeSocialSecurityContributionsYtd,
    employmentWithholdingAnnual: 0,
    flatRateEndYear: 0,
    flatRateMonthlyFee: 80,
    slRevenueThreshold: 80000,
    slNetIncomeThreshold: 50000,
  });

  const [taxClientId, setTaxClientId] = useState("");
  const [taxForm, setTaxForm] = useState<ClientTaxProfile>(emptyTax);

  const [invoiceClientId, setInvoiceClientId] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(defaultDueDate(today(), DEFAULT_FISCAL_PROFILE.paymentTermsDays));
  const [notes, setNotes] = useState("");
  const [lineProjectId, setLineProjectId] = useState("");
  const [lineDescription, setLineDescription] = useState("Servicios profesionales");
  const [lineQuantity, setLineQuantity] = useState(1);
  const [lineUnitPrice, setLineUnitPrice] = useState(0);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [cancelTarget, setCancelTarget] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    const unsubs = [
      subscribeFiscalProfile(setProfile),
      subscribeToClients(setClients),
      subscribeToProjects(setProjects),
      subscribeInvoices(setInvoices),
      subscribeExpenses(setExpenses),
      subscribeRecurringExpenses(setRecurringExpenses),
      subscribeQuarterlyClosures(setClosures),
      subscribeFiscalEvents(setEvents),
      subscribeFiscalWatcherAlerts(setWatcherAlerts),
      subscribeFiscalWatcherSourceSignatures(setWatcherSignatures),
      subscribeVerifactuConfig(setVerifactuConfig),
      subscribeVerifactuRecords(setVerifactuRecords),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  useEffect(() => {
    void refreshBackendStatus();
  }, []);

  useEffect(() => {
    if (!taxClientId && clients[0]) {
      setTaxClientId(clients[0].id);
      setTaxForm({ ...emptyTax, ...clients[0].tax, fiscalName: clients[0].tax.fiscalName || clients[0].name });
    }
    if (!invoiceClientId && clients[0]) setInvoiceClientId(clients[0].id);
  }, [clients, taxClientId, invoiceClientId]);

  useEffect(() => {
    const pending = invoices.find((invoice) =>
      invoice.status === "issued" && !verifactuRecords.some((record) => record.invoiceId === invoice.id),
    );
    if (!verifactuInvoiceId && pending) setVerifactuInvoiceId(pending.id);
  }, [invoices, verifactuInvoiceId, verifactuRecords]);

  useEffect(() => {
    setDueDate(defaultDueDate(issueDate, profile.paymentTermsDays));
  }, [issueDate, profile.paymentTermsDays]);

  const selectedTaxClient = useMemo(
    () => clients.find((client) => client.id === taxClientId) ?? null,
    [clients, taxClientId],
  );
  const selectedInvoiceClient = useMemo(
    () => clients.find((client) => client.id === invoiceClientId) ?? null,
    [clients, invoiceClientId],
  );
  const clientProjects = useMemo(
    () => projects.filter((project) => project.clientId === invoiceClientId),
    [projects, invoiceClientId],
  );
  const regime = selectedInvoiceClient ? determineInvoiceRegime(selectedInvoiceClient.tax) : "national";
  const calculated = selectedInvoiceClient
    ? calculateInvoiceTotals(lines, regime, profile, selectedInvoiceClient.tax)
    : { vatRate: 0, withholdingRate: 0, totals: { subtotal: 0, vat: 0, withholding: 0, total: 0 } };
  const paymentDashboard = useMemo(
    () => calculateFiscalPaymentDashboard(invoices, profile, expenses),
    [invoices, profile, expenses],
  );
  const pluriannualProjection = useMemo(
    () => calculatePluriannualProjection(invoices, expenses, profile, projectionOptions),
    [invoices, expenses, profile, projectionOptions],
  );
  const knowledgeGraph = useMemo(
    () => buildKnowledgeGraphFromForMeta({ profile, clients, projects, invoices, expenses, closures }),
    [profile, clients, projects, invoices, expenses, closures],
  );
  const knowledgeGraphSummary = useMemo(() => summarizeKnowledgeGraph(knowledgeGraph), [knowledgeGraph]);
  const graphResult = useMemo(
    () => queryKnowledgeGraph(knowledgeGraph, graphQuestion),
    [knowledgeGraph, graphQuestion],
  );
  const verifactuChain = useMemo(() => verifyVerifactuChain(verifactuRecords), [verifactuRecords]);
  const fiscalBooks = useMemo(() => buildFiscalBooks(invoices, expenses), [invoices, expenses]);
  const savedClosure = useMemo(
    () => closures.find((closure) => closure.id === `${closureYear}-Q${closureQuarter}`) ?? null,
    [closures, closureYear, closureQuarter],
  );
  const closureDraft = useMemo(
    () => calculateQuarterlyClosure(
      invoices,
      expenses,
      profile,
      closureYear,
      closureQuarter,
      savedClosure?.status ?? "pending",
    ),
    [invoices, expenses, profile, closureYear, closureQuarter, savedClosure?.status],
  );
  const activeClosure = savedClosure ?? closureDraft;

  function selectTaxClient(id: string) {
    setTaxClientId(id);
    const client = clients.find((item) => item.id === id);
    setTaxForm({ ...emptyTax, ...client?.tax, fiscalName: client?.tax.fiscalName || client?.name || "" });
  }

  function setProfileField<K extends keyof FiscalProfile>(key: K, value: FiscalProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function setProjectionField<K extends keyof PluriannualProjectionOptions>(
    key: K,
    value: PluriannualProjectionOptions[K],
  ) {
    setProjectionOptions((prev) => ({ ...prev, [key]: value }));
  }

  function setVerifactuConfigField<K extends keyof VerifactuConfig>(key: K, value: VerifactuConfig[K]) {
    setVerifactuConfig((prev) => ({ ...prev, [key]: value }));
  }

  function setTaxField<K extends keyof ClientTaxProfile>(key: K, value: ClientTaxProfile[K]) {
    setTaxForm((prev) => ({ ...prev, [key]: value }));
  }

  function setExpenseField<K extends keyof ExpenseInput>(key: K, value: ExpenseInput[K]) {
    setExpenseForm((prev) => ({ ...prev, [key]: value }));
  }

  function setRecurringField<K extends keyof RecurringExpenseInput>(key: K, value: RecurringExpenseInput[K]) {
    setRecurringForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await saveFiscalProfile(profile);
      flash("Perfil fiscal guardado y registrado en ledger.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveTax(e?: React.FormEvent) {
    e?.preventDefault();
    if (!selectedTaxClient) return;
    setSavingTax(true);
    try {
      const tax = {
        ...taxForm,
        countryCode: taxForm.countryCode.toUpperCase(),
        taxId: taxForm.taxId.toUpperCase(),
        vatNumber: taxForm.vatNumber.toUpperCase(),
      };
      await updateClient(selectedTaxClient.id, { tax });
      await appendFiscalEvent({
        type: "client_tax_updated",
        entityType: "client",
        entityId: selectedTaxClient.id,
        clientId: selectedTaxClient.id,
        clientName: selectedTaxClient.name,
        payload: {
          customerKind: tax.customerKind,
          countryCode: tax.countryCode,
          taxId: tax.taxId,
          vatNumber: tax.vatNumber,
          viesStatus: tax.viesStatus,
        },
      });
      flash("Datos fiscales del cliente guardados.");
    } finally {
      setSavingTax(false);
    }
  }

  async function handleViesCheck() {
    if (!selectedTaxClient) return;
    setViesChecking(true);
    try {
      const response = await fetch("/api/fiscal/vies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: taxForm.countryCode,
          vatNumber: taxForm.vatNumber || taxForm.taxId,
        }),
      });
      const data = await response.json() as ViesResponse;
      const nextTax: ClientTaxProfile = {
        ...taxForm,
        viesStatus: data.valid ? "valid" : response.ok ? "invalid" : "error",
        viesCheckedAt: Timestamp.fromDate(new Date()),
        viesName: data.name ?? "",
        viesAddress: data.address ?? "",
        viesRequestId: data.requestDate ?? data.checkedAt ?? "",
        viesError: data.error ?? "",
      };
      setTaxForm(nextTax);
      await updateClient(selectedTaxClient.id, { tax: nextTax });
      await appendFiscalEvent({
        type: "vies_checked",
        entityType: "client",
        entityId: selectedTaxClient.id,
        clientId: selectedTaxClient.id,
        clientName: selectedTaxClient.name,
        payload: {
          countryCode: taxForm.countryCode,
          vatNumber: taxForm.vatNumber || taxForm.taxId,
          valid: data.valid,
          error: data.error ?? "",
        },
      });
      flash(data.valid ? "VAT validado en VIES." : "VIES no confirma el VAT.");
    } finally {
      setViesChecking(false);
    }
  }

  function addLine() {
    const project = projects.find((item) => item.id === lineProjectId) ?? null;
    const line = makeInvoiceLine({
      description: lineDescription,
      project,
      quantity: lineQuantity,
      unitPrice: lineUnitPrice,
    });
    if (!line.description || line.taxableBase <= 0) return;
    setLines((prev) => [...prev, line]);
    setLineProjectId("");
    setLineDescription("Servicios profesionales");
    setLineQuantity(1);
    setLineUnitPrice(0);
  }

  async function handleIssueInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoiceClient) return;
    setIssuing(true);
    try {
      const id = await issueInvoice({
        issuer: profile,
        client: selectedInvoiceClient,
        issueDate,
        dueDate,
        lines,
        notes,
      });
      setLines([]);
      setNotes("");
      setTab("facturas");
      flash(`Factura emitida. ID interno: ${id}`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "No se pudo emitir la factura.");
    } finally {
      setIssuing(false);
    }
  }

  async function handleCancelInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelTarget || !cancelReason.trim()) return;
    await cancelInvoice(cancelTarget, cancelReason);
    setCancelTarget(null);
    setCancelReason("");
    flash("Factura anulada sin borrarla. Evento añadido al ledger.");
  }

  async function handlePaymentStatus(invoice: Invoice) {
    const nextStatus = invoice.paymentStatus === "paid" ? "pending" : "paid";
    await markInvoicePayment(invoice, nextStatus);
    flash(nextStatus === "paid" ? "Factura marcada como cobrada." : "Factura devuelta a pendiente de cobro.");
  }

  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault();
    setSavingExpense(true);
    try {
      if (editingExpenseId) {
        await updateExpense(editingExpenseId, expenseForm);
        flash("Gasto actualizado y reclasificado.");
      } else {
        await createExpense(expenseForm);
        flash("Gasto registrado y añadido a libros.");
      }
      setEditingExpenseId(null);
      setExpenseForm(makeEmptyExpenseInput(today()));
    } finally {
      setSavingExpense(false);
    }
  }

  async function handleSaveRecurring(e: React.FormEvent) {
    e.preventDefault();
    setSavingRecurring(true);
    try {
      await createRecurringExpense(recurringForm);
      setRecurringForm(emptyRecurringExpense);
      flash("Gasto recurrente guardado.");
    } finally {
      setSavingRecurring(false);
    }
  }

  function editExpense(expense: Expense) {
    setEditingExpenseId(expense.id);
    setExpenseForm({
      supplierName: expense.supplierName,
      supplierTaxId: expense.supplierTaxId,
      invoiceNumber: expense.invoiceNumber,
      issueDate: expense.issueDate,
      categoryId: expense.categoryId,
      description: expense.description,
      kind: expense.kind,
      documentType: expense.documentType,
      countryCode: expense.countryCode,
      base: expense.base,
      vatRate: expense.vatRate,
      affectionPercent: expense.affectionPercent,
      irpfDeductible: expense.irpfDeductible,
      vatDeductible: expense.vatDeductible,
      isPaid: expense.isPaid,
      investment: expense.investment,
      recurringId: expense.recurringId,
    });
    setTab("gastos");
  }

  async function materializeRecurring(recurring: RecurringExpense) {
    await createExpenseFromRecurring(recurring);
    flash("Gasto recurrente convertido en gasto pendiente.");
  }

  async function handleSaveClosure(status: QuarterlyClosureStatus) {
    setSavingClosure(true);
    try {
      await saveQuarterlyClosure(closureDraft, status);
      flash(status === "filed" ? "Cierre marcado como presentado." : "Cierre preparado y snapshot guardado.");
    } finally {
      setSavingClosure(false);
    }
  }

  async function askFiscalAssistant(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    const userMessage: AssistantMessage = { id: makeMessageId(), role: "user", text: trimmed };
    setAssistantMessages((prev) => [...prev, userMessage]);
    setAssistantQuestion("");
    setAssistantBusy(true);
    try {
      const response = await fetch("/api/fiscal/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          context: {
            profile,
            invoices,
            expenses,
            clients,
            projects,
            closures,
            year: closureYear,
            quarter: closureQuarter,
          },
        }),
      });
      const data = await response.json() as {
        answer?: string;
        recommendations?: string[];
        usedTools?: string[];
        model?: string;
        toolResults?: FiscalAssistantToolResult[];
        error?: string;
      };
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: makeMessageId(),
          role: "assistant",
          text: data.answer || data.error || "No he podido responder ahora mismo.",
          tools: data.toolResults ?? [],
          recommendations: data.recommendations ?? [],
          model: data.model,
        },
      ]);
    } finally {
      setAssistantBusy(false);
    }
  }

  async function refreshBackendStatus() {
    setBackendLoading(true);
    try {
      const response = await fetch("/api/formeta-services/status", { cache: "no-store" });
      const data = await response.json() as FormetaServicesStatus;
      setBackendStatus(data);
    } finally {
      setBackendLoading(false);
    }
  }

  async function runFiscalWatcher() {
    setWatcherRunning(true);
    try {
      const response = await fetch("/api/fiscal/watcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previousSignatures: watcherSignatures }),
      });
      if (!response.ok) throw new Error("No se pudo ejecutar Fiscal Watcher");
      const result = await response.json() as FiscalWatcherRunResult;
      await Promise.all(result.alerts.map((alert) => createFiscalWatcherAlert(alert)));
      await Promise.all(result.snapshots.map((snapshot) => saveFiscalWatcherSourceSignature(snapshot.sourceId, snapshot.signature)));
      const hadBaseline = Object.keys(watcherSignatures).length > 0;
      flash(
        result.createdAlerts > 0
          ? `Fiscal Watcher: ${result.createdAlerts} alerta(s) nuevas.`
          : hadBaseline
            ? `Fiscal Watcher: ${result.checkedSources} fuentes comprobadas sin novedades.`
            : `Fiscal Watcher: línea base creada con ${result.checkedSources} fuentes.`,
      );
    } catch (error) {
      flash(error instanceof Error ? error.message : "Fiscal Watcher no disponible");
    } finally {
      setWatcherRunning(false);
    }
  }

  async function setWatcherAlertStatus(alert: FiscalWatcherAlert, status: FiscalWatcherStatus) {
    await updateFiscalWatcherAlertStatus(alert.id, status);
    flash(`Alerta marcada como ${watcherStatusLabel(status).toLowerCase()}.`);
  }

  async function handleSaveVerifactuConfig(e: React.FormEvent) {
    e.preventDefault();
    setSavingVerifactu(true);
    try {
      await saveVerifactuConfig(verifactuConfig);
      flash("Configuración Verifactu guardada.");
    } finally {
      setSavingVerifactu(false);
    }
  }

  async function prepareVerifactuRecord() {
    const invoice = invoices.find((item) => item.id === verifactuInvoiceId);
    if (!invoice) return;
    setVerifactuBusy(true);
    try {
      const previous = findLatestVerifactuRecord(verifactuRecords);
      await enqueueVerifactuRecord(invoice, verifactuConfig, previous);
      flash(`Registro Verifactu encolado para ${invoice.number}.`);
    } finally {
      setVerifactuBusy(false);
    }
  }

  async function sendVerifactuRecord(record: VerifactuRecord) {
    setVerifactuBusy(true);
    try {
      await markVerifactuRecordStatus(record.id, {
        status: "sending",
        attempts: record.attempts + 1,
        lastError: "",
      });
      const response = await fetch("/api/fiscal/verifactu/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: record.id,
          payload: record.payload,
          environment: verifactuConfig.environment,
        }),
      });
      const data = await response.json() as {
        status?: VerifactuRecord["status"];
        code?: string;
        message?: string;
        error?: string;
      };
      const status = data.status ?? (response.ok ? "accepted" : "failed");
      const nextRetryAt = status === "accepted"
        ? ""
        : new Date(Date.now() + Math.min(6, record.attempts + 1) * 10 * 60 * 1000).toISOString();
      await markVerifactuRecordStatus(record.id, {
        status,
        attempts: record.attempts + 1,
        nextRetryAt,
        lastError: data.error ?? (status === "accepted" ? "" : data.message ?? "Error envío AEAT"),
        aeatResponseCode: data.code ?? "",
        aeatResponseMessage: data.message ?? "",
      });
      flash(data.message ?? verifactuStatusLabel(status));
    } finally {
      setVerifactuBusy(false);
    }
  }

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3800);
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Núcleo fiscal</p>
          <h1 className={styles.title}>Facturación</h1>
        </div>
        <div className={styles.headerPills}>
          <span><ReceiptText width={14} height={14} /> {invoices.length} facturas</span>
          <span><Hash width={14} height={14} /> Ledger activo</span>
        </div>
      </div>

      <div className={styles.tabs}>
        {(["pagar", "proyeccion", "verifactu", "grafo", "asistente", "watcher", "backend", "emitir", "facturas", "gastos", "cierres", "libros", "clientes", "perfil", "eventos"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`${styles.tab} ${tab === item ? styles.tabActive : ""}`}
          >
            {item === "pagar" && "Qué pagar"}
            {item === "proyeccion" && "Proyección"}
            {item === "verifactu" && "Verifactu"}
            {item === "grafo" && "Grafo"}
            {item === "asistente" && "IA Recomendada"}
            {item === "watcher" && "Fiscal Watcher"}
            {item === "backend" && "Backend"}
            {item === "emitir" && "Emitir"}
            {item === "facturas" && "Facturas"}
            {item === "gastos" && "Gastos"}
            {item === "cierres" && "Cierres"}
            {item === "libros" && "Libros"}
            {item === "clientes" && "Clientes fiscales"}
            {item === "perfil" && "Perfil autónomo"}
            {item === "eventos" && "Eventos"}
          </button>
        ))}
      </div>

      {notice && <p className={styles.notice}>{notice}</p>}

      {tab === "pagar" && (
        <PaymentDashboardView dashboard={paymentDashboard} />
      )}

      {tab === "proyeccion" && (
        <PluriannualProjectionView
          projection={pluriannualProjection}
          options={projectionOptions}
          onOption={setProjectionField}
        />
      )}

      {tab === "verifactu" && (
        <VerifactuView
          config={verifactuConfig}
          records={verifactuRecords}
          invoices={invoices}
          selectedInvoiceId={verifactuInvoiceId}
          saving={savingVerifactu}
          busy={verifactuBusy}
          chain={verifactuChain}
          onConfig={setVerifactuConfigField}
          onSaveConfig={handleSaveVerifactuConfig}
          onInvoice={setVerifactuInvoiceId}
          onPrepare={() => void prepareVerifactuRecord()}
          onSend={(record) => void sendVerifactuRecord(record)}
        />
      )}

      {tab === "grafo" && (
        <KnowledgeGraphView
          graph={knowledgeGraph}
          summary={knowledgeGraphSummary}
          question={graphQuestion}
          result={graphResult}
          onQuestion={setGraphQuestion}
        />
      )}

      {tab === "asistente" && (
        <FiscalAssistantView
          messages={assistantMessages}
          question={assistantQuestion}
          busy={assistantBusy}
          onQuestion={setAssistantQuestion}
          onAsk={askFiscalAssistant}
        />
      )}

      {tab === "watcher" && (
        <FiscalWatcherView
          alerts={watcherAlerts}
          signatures={watcherSignatures}
          running={watcherRunning}
          onRun={() => void runFiscalWatcher()}
          onStatus={(alert, status) => void setWatcherAlertStatus(alert, status)}
        />
      )}

      {tab === "backend" && (
        <BackendServicesView
          status={backendStatus}
          loading={backendLoading}
          onRefresh={() => void refreshBackendStatus()}
        />
      )}

      {tab === "emitir" && (
        <form onSubmit={(e) => void handleIssueInvoice(e)} className={styles.grid}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelKicker}>Factura real</p>
                <h2 className={styles.panelTitle}>Datos y régimen automático</h2>
              </div>
              <ShieldCheck width={18} height={18} />
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.field}>
                Cliente
                <select value={invoiceClientId} onChange={(e) => setInvoiceClientId(e.target.value)}>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Fecha
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </label>
              <label className={styles.field}>
                Vencimiento
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </label>
            </div>

            <div className={styles.regimeBox}>
              <span>{invoiceRegimeLabel(regime)}</span>
              <p>
                IVA {calculated.vatRate}% · Retención {calculated.withholdingRate}% · Total previsto {formatMoney(calculated.totals.total)}
              </p>
            </div>

            <div className={styles.lineComposer}>
              <label className={styles.field}>
                Proyecto / imputación
                <select value={lineProjectId} onChange={(e) => setLineProjectId(e.target.value)}>
                  <option value="">Sin proyecto</option>
                  {clientProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Concepto
                <input value={lineDescription} onChange={(e) => setLineDescription(e.target.value)} />
              </label>
              <label className={styles.field}>
                Cantidad
                <input type="number" min="0" step="0.01" value={lineQuantity} onChange={(e) => setLineQuantity(Number(e.target.value))} />
              </label>
              <label className={styles.field}>
                Precio
                <input type="number" min="0" step="0.01" value={lineUnitPrice} onChange={(e) => setLineUnitPrice(Number(e.target.value))} />
              </label>
              <button type="button" onClick={addLine} className={styles.iconButton} aria-label="Añadir línea">
                <Plus width={16} height={16} />
              </button>
            </div>

            {lines.length === 0 ? (
              <p className={styles.empty}>Añade líneas de trabajo, horas o conceptos cerrados.</p>
            ) : (
              <div className={styles.lines}>
                {lines.map((line) => (
                  <div key={line.id} className={styles.lineRow}>
                    <div>
                      <strong>{line.description}</strong>
                      <span>{line.projectName || "Sin proyecto"} · {line.quantity} × {formatMoney(line.unitPrice)}</span>
                    </div>
                    <b>{formatMoney(line.taxableBase)}</b>
                    <button type="button" onClick={() => setLines((prev) => prev.filter((item) => item.id !== line.id))} aria-label="Eliminar línea">
                      <X width={14} height={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className={styles.field}>
              Notas visibles
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            <button type="submit" disabled={issuing || lines.length === 0} className={styles.primaryButton}>
              <FileText width={15} height={15} />
              {issuing ? "Emitiendo…" : "Emitir factura"}
            </button>
          </section>

          <TotalsPanel totals={calculated.totals} vatRate={calculated.vatRate} withholdingRate={calculated.withholdingRate} />
        </form>
      )}

      {tab === "facturas" && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Secuencial e inmutable</p>
              <h2 className={styles.panelTitle}>Facturas emitidas</h2>
            </div>
          </div>
          <div className={styles.invoiceList}>
            {invoices.map((invoice) => (
              <article key={invoice.id} className={styles.invoiceRow} data-status={invoice.status}>
                <div>
                  <strong>{invoice.number}</strong>
                  <span>{invoice.client.name} · {invoiceRegimeLabel(invoice.regime)} · {formatDate(invoice.issueDate)}</span>
                  <code>{invoice.ledgerHash.slice(0, 18)}…</code>
                </div>
                <b>{formatMoney(invoice.totals.total)}</b>
                <button type="button" onClick={() => downloadInvoicePdf(invoice)} className={styles.iconButton} aria-label="Descargar PDF">
                  <Download width={15} height={15} />
                </button>
                {invoice.status === "issued" && (
                  <button type="button" onClick={() => void handlePaymentStatus(invoice)} className={styles.secondaryButton}>
                    <Banknote width={14} height={14} />
                    {invoice.paymentStatus === "paid" ? "Cobrada" : "Marcar cobro"}
                  </button>
                )}
                {invoice.status === "issued" ? (
                  <button type="button" onClick={() => setCancelTarget(invoice)} className={styles.dangerButton}>
                    <Ban width={14} height={14} />
                    Anular
                  </button>
                ) : (
                  <span className={styles.cancelled}>Anulada</span>
                )}
              </article>
            ))}
            {invoices.length === 0 && <p className={styles.empty}>Todavía no hay facturas emitidas.</p>}
          </div>
        </section>
      )}

      {tab === "gastos" && (
        <ExpensesView
          expenseForm={expenseForm}
          editingExpenseId={editingExpenseId}
          expenses={expenses}
          recurringExpenses={recurringExpenses}
          recurringForm={recurringForm}
          savingExpense={savingExpense}
          savingRecurring={savingRecurring}
          onExpenseField={setExpenseField}
          onExpenseCategory={(categoryId) => setExpenseForm((prev) => applyExpenseCategoryDefaults(prev, categoryId))}
          onExpenseSubmit={handleSaveExpense}
          onExpenseEdit={editExpense}
          onExpenseCancel={() => {
            setEditingExpenseId(null);
            setExpenseForm(makeEmptyExpenseInput(today()));
          }}
          onRecurringField={setRecurringField}
          onRecurringCategory={(categoryId) => setRecurringForm((prev) => {
            const category = EXPENSE_CATEGORIES.find((item) => item.id === categoryId) ?? EXPENSE_CATEGORIES[0];
            return {
              ...prev,
              categoryId,
              affectionPercent: category.defaultAffectionPercent,
              irpfDeductible: category.defaultIrpfDeductible,
              vatDeductible: category.defaultVatDeductible,
            };
          })}
          onRecurringSubmit={handleSaveRecurring}
          onMaterializeRecurring={materializeRecurring}
        />
      )}

      {tab === "cierres" && (
        <ClosuresView
          closure={activeClosure}
          draft={closureDraft}
          savedClosure={savedClosure}
          year={closureYear}
          quarter={closureQuarter}
          saving={savingClosure}
          onYear={setClosureYear}
          onQuarter={setClosureQuarter}
          onPrepare={() => void handleSaveClosure("prepared")}
          onFile={() => void handleSaveClosure("filed")}
          onExport={() => downloadClosureExport(activeClosure)}
        />
      )}

      {tab === "libros" && (
        <BooksView books={fiscalBooks} />
      )}

      {tab === "clientes" && (
        <section className={styles.grid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelKicker}>Clientes con tipo fiscal</p>
                <h2 className={styles.panelTitle}>Ficha fiscal y VIES</h2>
              </div>
            </div>
            <label className={styles.field}>
              Cliente
              <select value={taxClientId} onChange={(e) => selectTaxClient(e.target.value)}>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
            <form onSubmit={(e) => void handleSaveTax(e)} className={styles.formStack}>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  Tipo fiscal
                  <select value={taxForm.customerKind} onChange={(e) => setTaxField("customerKind", e.target.value as ClientTaxProfile["customerKind"])}>
                    <option value="business">Empresa</option>
                    <option value="self_employed">Autónomo</option>
                    <option value="individual">Particular</option>
                  </select>
                </label>
                <label className={styles.field}>
                  País
                  <input maxLength={2} value={taxForm.countryCode} onChange={(e) => setTaxField("countryCode", e.target.value.toUpperCase())} />
                </label>
              </div>
              <label className={styles.field}>
                Nombre fiscal
                <input value={taxForm.fiscalName} onChange={(e) => setTaxField("fiscalName", e.target.value)} />
              </label>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  NIF/CIF
                  <input value={taxForm.taxId} onChange={(e) => setTaxField("taxId", e.target.value.toUpperCase())} />
                </label>
                <label className={styles.field}>
                  VAT UE
                  <input value={taxForm.vatNumber} onChange={(e) => setTaxField("vatNumber", e.target.value.toUpperCase())} />
                </label>
              </div>
              <label className={styles.field}>
                Dirección fiscal
                <input value={taxForm.fiscalAddress} onChange={(e) => setTaxField("fiscalAddress", e.target.value)} />
              </label>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  CP
                  <input value={taxForm.postalCode} onChange={(e) => setTaxField("postalCode", e.target.value)} />
                </label>
                <label className={styles.field}>
                  Ciudad
                  <input value={taxForm.city} onChange={(e) => setTaxField("city", e.target.value)} />
                </label>
                <label className={styles.field}>
                  Provincia
                  <input value={taxForm.province} onChange={(e) => setTaxField("province", e.target.value)} />
                </label>
              </div>
              <div className={styles.actionRow}>
                <button type="button" onClick={() => void handleViesCheck()} disabled={viesChecking || taxForm.countryCode === "ES"} className={styles.secondaryButton}>
                  <SearchCheck width={15} height={15} />
                  {viesChecking ? "Validando…" : "Validar VIES"}
                </button>
                <button type="submit" disabled={savingTax} className={styles.primaryButton}>
                  <Save width={15} height={15} />
                  {savingTax ? "Guardando…" : "Guardar cliente"}
                </button>
              </div>
            </form>
          </div>
          <TaxSummary client={selectedTaxClient} tax={taxForm} />
        </section>
      )}

      {tab === "perfil" && (
        <form onSubmit={(e) => void handleSaveProfile(e)} className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Autónomo emisor</p>
              <h2 className={styles.panelTitle}>Perfil fiscal</h2>
            </div>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Nombre legal<input value={profile.legalName} onChange={(e) => setProfileField("legalName", e.target.value)} /></label>
            <label className={styles.field}>Marca<input value={profile.tradeName} onChange={(e) => setProfileField("tradeName", e.target.value)} /></label>
            <label className={styles.field}>NIF<input value={profile.taxId} onChange={(e) => setProfileField("taxId", e.target.value.toUpperCase())} /></label>
          </div>
          <label className={styles.field}>Dirección<input value={profile.address} onChange={(e) => setProfileField("address", e.target.value)} /></label>
          <div className={styles.fieldRow}>
            <label className={styles.field}>CP<input value={profile.postalCode} onChange={(e) => setProfileField("postalCode", e.target.value)} /></label>
            <label className={styles.field}>Ciudad<input value={profile.city} onChange={(e) => setProfileField("city", e.target.value)} /></label>
            <label className={styles.field}>Provincia<input value={profile.province} onChange={(e) => setProfileField("province", e.target.value)} /></label>
            <label className={styles.field}>País<input maxLength={2} value={profile.countryCode} onChange={(e) => setProfileField("countryCode", e.target.value.toUpperCase())} /></label>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Email<input type="email" value={profile.email} onChange={(e) => setProfileField("email", e.target.value)} /></label>
            <label className={styles.field}>Teléfono<input value={profile.phone} onChange={(e) => setProfileField("phone", e.target.value)} /></label>
            <label className={styles.field}>IBAN<input value={profile.iban} onChange={(e) => setProfileField("iban", e.target.value.toUpperCase())} /></label>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Serie<input value={profile.invoiceSeries} onChange={(e) => setProfileField("invoiceSeries", e.target.value.toUpperCase())} /></label>
            <label className={styles.field}>IVA %<input type="number" step="0.01" value={profile.defaultVatRate} onChange={(e) => setProfileField("defaultVatRate", Number(e.target.value))} /></label>
            <label className={styles.field}>Retención %<input type="number" step="0.01" value={profile.defaultWithholdingRate} onChange={(e) => setProfileField("defaultWithholdingRate", Number(e.target.value))} /></label>
            <label className={styles.field}>Pago días<input type="number" value={profile.paymentTermsDays} onChange={(e) => setProfileField("paymentTermsDays", Number(e.target.value))} /></label>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Gastos deducibles estimados %<input type="number" step="0.01" value={profile.deductibleExpenseRate} onChange={(e) => setProfileField("deductibleExpenseRate", Number(e.target.value))} /></label>
            <label className={styles.field}>Modelo 130<select value={profile.model130Mode} onChange={(e) => setProfileField("model130Mode", e.target.value as FiscalProfile["model130Mode"])}><option value="auto">Auto 70%</option><option value="applies">Aplica</option><option value="exempt">Exento</option></select></label>
            <label className={styles.field}>130 ya pagado YTD<input type="number" step="0.01" value={profile.previousModel130PaidYtd} onChange={(e) => setProfileField("previousModel130PaidYtd", Number(e.target.value))} /></label>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.field}>RETA<select value={profile.retaMode} onChange={(e) => setProfileField("retaMode", e.target.value as FiscalProfile["retaMode"])}><option value="manual">Cuota manual</option><option value="estimate_2026_table">Tabla 2026 estimada</option></select></label>
            <label className={styles.field}>RETA mensual<input type="number" step="0.01" value={profile.monthlyRetaFee} onChange={(e) => setProfileField("monthlyRetaFee", Number(e.target.value))} /></label>
            <label className={styles.field}>Tipo RETA %<input type="number" step="0.01" value={profile.retaContributionRate} onChange={(e) => setProfileField("retaContributionRate", Number(e.target.value))} /></label>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.checkField}><input type="checkbox" checked={profile.isPluriactive} onChange={(e) => setProfileField("isPluriactive", e.target.checked)} /> Pluriactividad</label>
            <label className={styles.field}>Cotizaciones ajenas YTD<input type="number" step="0.01" value={profile.employeeSocialSecurityContributionsYtd} onChange={(e) => setProfileField("employeeSocialSecurityContributionsYtd", Number(e.target.value))} /></label>
            <label className={styles.field}>Umbral devolución<input type="number" step="0.01" value={profile.pluriactivityRefundThreshold} onChange={(e) => setProfileField("pluriactivityRefundThreshold", Number(e.target.value))} /></label>
            <label className={styles.field}>% devolución exceso<input type="number" step="0.01" value={profile.pluriactivityRefundCapRate} onChange={(e) => setProfileField("pluriactivityRefundCapRate", Number(e.target.value))} /></label>
          </div>
          <label className={styles.field}>Pie de factura<textarea rows={3} value={profile.invoiceFooter} onChange={(e) => setProfileField("invoiceFooter", e.target.value)} /></label>
          <button type="submit" disabled={savingProfile} className={styles.primaryButton}>
            <Save width={15} height={15} />
            {savingProfile ? "Guardando…" : "Guardar perfil fiscal"}
          </button>
        </form>
      )}

      {tab === "eventos" && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Fiscal append-only</p>
              <h2 className={styles.panelTitle}>Eventos fiscales</h2>
            </div>
          </div>
          <div className={styles.eventList}>
            {events.map((event) => (
              <article key={event.id} className={styles.eventRow}>
                <span><Check width={13} height={13} /> {eventLabel(event.type)}</span>
                <strong>{event.invoiceNumber || event.clientName || "Perfil fiscal"}</strong>
                <time>{event.createdAt ? event.createdAt.toDate().toLocaleString("es-ES") : "Ahora"}</time>
              </article>
            ))}
            {events.length === 0 && <p className={styles.empty}>Sin eventos fiscales todavía.</p>}
          </div>
        </section>
      )}

      {cancelTarget && (
        <>
          <div className={styles.backdrop} onClick={() => setCancelTarget(null)} aria-hidden="true" />
          <form onSubmit={(e) => void handleCancelInvoice(e)} className={styles.modal}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelKicker}>Anulación</p>
                <h2 className={styles.panelTitle}>{cancelTarget.number}</h2>
              </div>
              <button type="button" onClick={() => setCancelTarget(null)} className={styles.iconButton} aria-label="Cerrar">
                <X width={15} height={15} />
              </button>
            </div>
            <label className={styles.field}>
              Motivo
              <textarea rows={4} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} required />
            </label>
            <button type="submit" className={styles.dangerButton} disabled={!cancelReason.trim()}>
              <Ban width={14} height={14} />
              Anular sin borrar
            </button>
          </form>
        </>
      )}
    </main>
  );
}

function VerifactuView({
  config,
  records,
  invoices,
  selectedInvoiceId,
  saving,
  busy,
  chain,
  onConfig,
  onSaveConfig,
  onInvoice,
  onPrepare,
  onSend,
}: {
  config: VerifactuConfig;
  records: VerifactuRecord[];
  invoices: Invoice[];
  selectedInvoiceId: string;
  saving: boolean;
  busy: boolean;
  chain: ReturnType<typeof verifyVerifactuChain>;
  onConfig: <K extends keyof VerifactuConfig>(key: K, value: VerifactuConfig[K]) => void;
  onSaveConfig: (event: React.FormEvent) => void;
  onInvoice: (value: string) => void;
  onPrepare: () => void;
  onSend: (record: VerifactuRecord) => void;
}) {
  const eligibleInvoices = invoices.filter((invoice) => invoice.status === "issued");
  const selectedInvoice = eligibleInvoices.find((invoice) => invoice.id === selectedInvoiceId) ?? eligibleInvoices[0] ?? null;
  const queued = records.filter((record) => ["queued", "retrying", "certificate_required", "failed"].includes(record.status));
  const latestRecord = records[0] ?? null;

  return (
    <div className={styles.payPage}>
      <section className={`${styles.panel} ${styles.heroPanel}`}>
        <div>
          <p className={styles.panelKicker}>Verifactu completo</p>
          <h2 className={styles.heroQuestion}>QR, payload AEAT, cola y cadena listos antes de 2027.</h2>
        </div>
        <div className={styles.realMoney}>
          <span>Modo</span>
          <strong>{verifactuModeLabel(config.mode)}</strong>
        </div>
      </section>

      <section className={styles.metricGrid}>
        <MetricCard icon={<QrCode width={16} height={16} />} label="QR" value={latestRecord?.qrSvg ? "Generado" : "Pendiente"} detail="URL de validación centralizada por factura" />
        <MetricCard icon={<Database width={16} height={16} />} label="Payload AEAT" value={String(records.length)} detail="Registros de alta/anulación preparados" />
        <MetricCard icon={<ShieldCheck width={16} height={16} />} label="Cadena" value={chain.valid ? "OK" : "Revisar"} detail={chain.reason ?? `${chain.checked} registro(s) verificados`} />
        <MetricCard icon={<CalendarClock width={16} height={16} />} label="Cola reintentos" value={String(queued.length)} detail="Estados pendientes de envío o reintento" />
        <MetricCard icon={<FileText width={16} height={16} />} label="Declaración" value={config.responsibleDeclarationAccepted ? "Aceptada" : "Pendiente"} detail="Debe validarse antes de producción" />
        <MetricCard icon={<Landmark width={16} height={16} />} label="Cliente AEAT" value={config.certificateAlias ? "Certificado" : "Sin certificado"} detail={config.environment === "production" ? "Producción" : "Pruebas/mock"} />
      </section>

      <section className={styles.grid}>
        <form onSubmit={onSaveConfig} className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Configuración</p>
              <h2 className={styles.panelTitle}>Modo Verifactu</h2>
            </div>
            <ShieldCheck width={17} height={17} />
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Modo<select value={config.mode} onChange={(e) => onConfig("mode", e.target.value as VerifactuMode)}><option value="disabled">Desactivado</option><option value="sif">SIF sin envío</option><option value="verifactu">Verifactu envío AEAT</option></select></label>
            <label className={styles.field}>Entorno<select value={config.environment} onChange={(e) => onConfig("environment", e.target.value as VerifactuEnvironment)}><option value="test">Pruebas</option><option value="production">Producción</option></select></label>
            <label className={styles.field}>Certificado alias<input value={config.certificateAlias} onChange={(e) => onConfig("certificateAlias", e.target.value)} /></label>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Sistema<input value={config.systemName} onChange={(e) => onConfig("systemName", e.target.value)} /></label>
            <label className={styles.field}>ID sistema<input value={config.systemId} onChange={(e) => onConfig("systemId", e.target.value)} /></label>
            <label className={styles.field}>Productor<input value={config.producerName} onChange={(e) => onConfig("producerName", e.target.value)} /></label>
            <label className={styles.field}>NIF productor<input value={config.producerTaxId} onChange={(e) => onConfig("producerTaxId", e.target.value.toUpperCase())} /></label>
          </div>
          <label className={styles.field}>Declaración responsable<textarea rows={4} value={config.responsibleDeclarationText} onChange={(e) => onConfig("responsibleDeclarationText", e.target.value)} /></label>
          <label className={styles.checkField}><input type="checkbox" checked={config.responsibleDeclarationAccepted} onChange={(e) => onConfig("responsibleDeclarationAccepted", e.target.checked)} /> Declaración revisada y aceptada</label>
          <button type="submit" disabled={saving} className={styles.primaryButton}><Save width={15} height={15} /> {saving ? "Guardando…" : "Guardar Verifactu"}</button>
        </form>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Alta factura</p>
              <h2 className={styles.panelTitle}>Preparar registro</h2>
            </div>
            <QrCode width={17} height={17} />
          </div>
          <label className={styles.field}>Factura<select value={selectedInvoice?.id ?? ""} onChange={(e) => onInvoice(e.target.value)}>{eligibleInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number} · {formatMoney(invoice.totals.total)}</option>)}</select></label>
          <button type="button" onClick={onPrepare} disabled={busy || !selectedInvoice || config.mode === "disabled"} className={styles.primaryButton}><PackageCheck width={15} height={15} /> Encolar registro</button>
          {latestRecord?.qrSvg && (
            <div className={styles.qrBox}>
              <div dangerouslySetInnerHTML={{ __html: latestRecord.qrSvg }} />
              <small>{latestRecord.qrUrl}</small>
            </div>
          )}
        </aside>
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Cola AEAT</p>
              <h2 className={styles.panelTitle}>Estados de envío</h2>
            </div>
            <CalendarClock width={17} height={17} />
          </div>
          <div className={styles.invoiceList}>
            {records.map((record) => (
              <article key={record.id} className={styles.verifactuRow} data-status={record.status}>
                <div>
                  <strong>{record.invoiceNumber}</strong>
                  <span>{verifactuStatusLabel(record.status)} · intentos {record.attempts} · hash {record.recordHash.slice(0, 14)}</span>
                  {record.lastError && <code>{record.lastError}</code>}
                </div>
                <button type="button" onClick={() => onSend(record)} disabled={busy || record.status === "accepted" || config.mode !== "verifactu"} className={styles.secondaryButton}>
                  {record.status === "accepted" ? "Enviado" : "Enviar/reintentar"}
                </button>
              </article>
            ))}
            {records.length === 0 && <p className={styles.empty}>Sin registros Verifactu todavía.</p>}
          </div>
        </div>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Payload</p>
              <h2 className={styles.panelTitle}>Último registro</h2>
            </div>
            <Database width={17} height={17} />
          </div>
          {latestRecord ? (
            <pre className={styles.payloadBox}>{JSON.stringify(latestRecord.payload, null, 2)}</pre>
          ) : (
            <p className={styles.empty}>Genera un registro para ver el payload AEAT.</p>
          )}
        </aside>
      </section>
    </div>
  );
}

function KnowledgeGraphView({
  graph,
  summary,
  question,
  result,
  onQuestion,
}: {
  graph: KnowledgeGraph;
  summary: KnowledgeGraphSummary;
  question: string;
  result: GraphRagResult;
  onQuestion: (value: string) => void;
}) {
  const quickQueries = [
    "Relaciones cliente proyecto factura pago",
    "Gastos con regla de deducción y alertas",
    "Obligaciones por periodo 303 130 349",
    "Regímenes fiscales por país y tipo de cliente",
  ];

  return (
    <div className={styles.payPage}>
      <section className={`${styles.panel} ${styles.heroPanel}`}>
        <div>
          <p className={styles.panelKicker}>Grafo de conocimiento</p>
          <h2 className={styles.heroQuestion}>Contexto semántico sin mover la verdad de SQLite.</h2>
        </div>
        <div className={styles.realMoney}>
          <span>Nodos / relaciones</span>
          <strong>{summary.nodes}/{summary.edges}</strong>
        </div>
      </section>

      <section className={styles.metricGrid}>
        <MetricCard icon={<Database width={16} height={16} />} label="Fuente de verdad" value={graph.truthSource} detail={graph.source === "sqlite_projection" ? "Proyectado desde SQLite" : "Proyección runtime equivalente"} />
        <MetricCard icon={<ReceiptText width={16} height={16} />} label="Facturas y cobros" value={`${summary.invoices}/${summary.pendingPayments}`} detail="Facturas activas / cobros pendientes" />
        <MetricCard icon={<Landmark width={16} height={16} />} label="Obligaciones" value={String(summary.obligations)} detail={`${summary.taxRegimes} regímenes fiscales modelados`} />
        <MetricCard icon={<AlertTriangle width={16} height={16} />} label="Deducciones a revisar" value={String(summary.riskyDeductions)} detail="Gastos conectados a regla con alerta" />
        <MetricCard icon={<BookOpen width={16} height={16} />} label="Clientes / proyectos" value={`${summary.clients}/${summary.projects}`} detail="Relación comercial semántica" />
        <MetricCard icon={<Bot width={16} height={16} />} label="GraphRAG" value={String(result.paths.length)} detail="Caminos recuperados para la consulta actual" />
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Consulta GraphRAG</p>
              <h2 className={styles.panelTitle}>Pregunta al grafo</h2>
            </div>
            <SearchCheck width={17} height={17} />
          </div>
          <div className={styles.quickGrid}>
            {quickQueries.map((item) => (
              <button key={item} type="button" onClick={() => onQuestion(item)} className={styles.quickQuestion}>
                {item}
              </button>
            ))}
          </div>
          <label className={styles.field}>
            Consulta
            <input value={question} onChange={(event) => onQuestion(event.target.value)} />
          </label>
          <div className={styles.regimeBox}>
            <span>Respuesta</span>
            <p>{result.answer}</p>
          </div>
        </div>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Contrato semántico</p>
              <h2 className={styles.panelTitle}>SQLite sigue mandando</h2>
            </div>
            <ShieldCheck width={17} height={17} />
          </div>
          <ul className={styles.alertList}>
            <li>El grafo se reconstruye desde tablas/estado fiscal, no edita datos.</li>
            <li>Las consultas devuelven caminos y citas a nodos, no importes inventados.</li>
            <li>La proyección SQLite queda implementada como entrada `SQLiteProjectionRows`.</li>
          </ul>
          <dl className={styles.totals}>
            <div><dt>Clientes</dt><dd>{summary.clients}</dd></div>
            <div><dt>Proyectos</dt><dd>{summary.projects}</dd></div>
            <div><dt>Gastos</dt><dd>{summary.expenses}</dd></div>
            <div><dt>Regímenes</dt><dd>{summary.taxRegimes}</dd></div>
          </dl>
        </aside>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelKicker}>Vista en vivo</p>
            <h2 className={styles.panelTitle}>Mapa relacional</h2>
          </div>
          <Hash width={17} height={17} />
        </div>
        <KnowledgeGraphMap graph={graph} result={result} />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelKicker}>Caminos semánticos</p>
            <h2 className={styles.panelTitle}>Relaciones recuperadas</h2>
          </div>
        </div>
        <div className={styles.graphPathList}>
          {result.paths.map((path, index) => (
            <article key={`${path.title}-${index}`} className={styles.graphPath}>
              <strong>{path.title}</strong>
              <span>{path.nodes.map((nodeIdValue) => graphNodeLabel(graph, nodeIdValue)).join(" -> ")}</span>
              <small>{path.edges.map((edgeId) => graphEdgeLabel(graph, edgeId)).join(" · ")}</small>
            </article>
          ))}
          {result.paths.length === 0 && <p className={styles.empty}>Sin caminos para esta consulta.</p>}
        </div>
      </section>

      <BookSection
        title="Citas GraphRAG"
        kicker={`${result.citations.length} nodos usados`}
        headers={["Tipo", "Nodo", "ID", "", "", "", ""]}
        rows={result.citations.map((citation) => [
          citation.type,
          citation.label,
          citation.nodeId,
          "",
          "",
          "",
          "",
        ])}
      />
    </div>
  );
}

function KnowledgeGraphMap({ graph, result }: { graph: KnowledgeGraph; result: GraphRagResult }) {
  const highlightedNodeIds = new Set(result.paths.flatMap((path) => path.nodes));
  const highlightedEdgeIds = new Set(result.paths.flatMap((path) => path.edges));
  const pathNodeIds = Array.from(highlightedNodeIds);
  const visibleNodes = (pathNodeIds.length > 0
    ? graph.nodes.filter((node) => highlightedNodeIds.has(node.id))
    : graph.nodes
  ).slice(0, 64);
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = graph.edges
    .filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to))
    .slice(0, 96);
  const lanes = [
    "country",
    "tax_regime",
    "client",
    "project",
    "invoice",
    "payment",
    "expense",
    "deduction_rule",
    "period",
    "obligation",
  ];
  const laneLabels: Record<string, string> = {
    country: "País",
    tax_regime: "Régimen",
    client: "Cliente",
    project: "Proyecto",
    invoice: "Factura",
    payment: "Pago",
    expense: "Gasto",
    deduction_rule: "Deducción",
    period: "Periodo",
    obligation: "Obligación",
  };
  const grouped = new Map<string, typeof visibleNodes>();
  for (const lane of lanes) grouped.set(lane, []);
  for (const node of visibleNodes) grouped.set(node.type, [...(grouped.get(node.type) ?? []), node]);
  const width = 1180;
  const laneWidth = width / lanes.length;
  const maxLaneItems = Math.max(1, ...Array.from(grouped.values()).map((items) => items.length));
  const height = Math.max(360, 110 + maxLaneItems * 78);
  const positions = new Map<string, { x: number; y: number }>();

  lanes.forEach((lane, laneIndex) => {
    const items = grouped.get(lane) ?? [];
    items.forEach((node, nodeIndex) => {
      positions.set(node.id, {
        x: laneIndex * laneWidth + laneWidth / 2,
        y: 82 + nodeIndex * 78,
      });
    });
  });

  return (
    <div className={styles.graphMapWrap}>
      <svg className={styles.graphMap} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grafo de conocimiento en tiempo real">
        {lanes.map((lane, index) => (
          <g key={lane}>
            <line x1={index * laneWidth + laneWidth / 2} y1="44" x2={index * laneWidth + laneWidth / 2} y2={height - 28} className={styles.graphLane} />
            <text x={index * laneWidth + laneWidth / 2} y="26" textAnchor="middle" className={styles.graphLaneLabel}>{laneLabels[lane]}</text>
          </g>
        ))}
        {visibleEdges.map((edge) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className={`${styles.graphEdge} ${highlightedEdgeIds.has(edge.id) ? styles.graphEdgeActive : ""}`}
            />
          );
        })}
        {visibleNodes.map((node) => {
          const point = positions.get(node.id);
          if (!point) return null;
          const active = highlightedNodeIds.size === 0 || highlightedNodeIds.has(node.id);
          return (
            <g key={node.id} transform={`translate(${point.x} ${point.y})`} className={styles.graphNodeGroup}>
              <circle r="22" className={`${styles.graphNode} ${active ? styles.graphNodeActive : ""}`} />
              <text y="4" textAnchor="middle" className={styles.graphNodeInitial}>{graphNodeInitial(node.type)}</text>
              <text y="40" textAnchor="middle" className={styles.graphNodeLabel}>{shortGraphLabel(node.label)}</text>
            </g>
          );
        })}
      </svg>
      <p className={styles.empty}>
        Mostrando {visibleNodes.length} nodos y {visibleEdges.length} relaciones. Se actualiza con los datos vivos de ForMeta.
      </p>
    </div>
  );
}

function PluriannualProjectionView({
  projection,
  options,
  onOption,
}: {
  projection: PluriannualProjection;
  options: Partial<PluriannualProjectionOptions>;
  onOption: <K extends keyof PluriannualProjectionOptions>(key: K, value: PluriannualProjectionOptions[K]) => void;
}) {
  const baseScenario = projection.scenarios.find((scenario) => scenario.id === "base") ?? projection.scenarios[0];
  const lastBaseYear = baseScenario.yearly.at(-1);

  return (
    <div className={styles.payPage}>
      <section className={`${styles.panel} ${styles.heroPanel}`}>
        <div>
          <p className={styles.panelKicker}>Proyección plurianual</p>
          <h2 className={styles.heroQuestion}>Planifica el año, la tarifa plana y el salto de tramo.</h2>
        </div>
        <div className={styles.realMoney}>
          <span>Neto real último año</span>
          <strong>{lastBaseYear ? formatMoney(lastBaseYear.netRealAnnual) : "—"}</strong>
        </div>
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Hipótesis</p>
              <h2 className={styles.panelTitle}>Escenario editable</h2>
            </div>
            <CalendarClock width={17} height={17} />
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Año inicio<input type="number" value={options.startYear ?? projection.assumptions.startYear} onChange={(e) => onOption("startYear", Number(e.target.value))} /></label>
            <label className={styles.field}>Años<input type="number" min="1" max="10" value={options.years ?? projection.assumptions.years} onChange={(e) => onOption("years", Number(e.target.value))} /></label>
            <label className={styles.field}>Crec. ingresos %<input type="number" step="0.1" value={options.annualRevenueGrowthPercent ?? projection.assumptions.annualRevenueGrowthPercent} onChange={(e) => onOption("annualRevenueGrowthPercent", Number(e.target.value))} /></label>
            <label className={styles.field}>Crec. gastos %<input type="number" step="0.1" value={options.annualExpenseGrowthPercent ?? projection.assumptions.annualExpenseGrowthPercent} onChange={(e) => onOption("annualExpenseGrowthPercent", Number(e.target.value))} /></label>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Nómina bruta anual<input type="number" step="0.01" value={options.employmentGrossAnnual ?? projection.assumptions.employmentGrossAnnual} onChange={(e) => onOption("employmentGrossAnnual", Number(e.target.value))} /></label>
            <label className={styles.field}>SS nómina anual<input type="number" step="0.01" value={options.employmentSocialSecurityAnnual ?? projection.assumptions.employmentSocialSecurityAnnual} onChange={(e) => onOption("employmentSocialSecurityAnnual", Number(e.target.value))} /></label>
            <label className={styles.field}>Retención nómina anual<input type="number" step="0.01" value={options.employmentWithholdingAnnual ?? projection.assumptions.employmentWithholdingAnnual} onChange={(e) => onOption("employmentWithholdingAnnual", Number(e.target.value))} /></label>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Fin tarifa plana año<input type="number" value={options.flatRateEndYear ?? projection.assumptions.flatRateEndYear} onChange={(e) => onOption("flatRateEndYear", Number(e.target.value))} /></label>
            <label className={styles.field}>Cuota tarifa plana<input type="number" step="0.01" value={options.flatRateMonthlyFee ?? projection.assumptions.flatRateMonthlyFee} onChange={(e) => onOption("flatRateMonthlyFee", Number(e.target.value))} /></label>
            <label className={styles.field}>Umbral ingresos SL<input type="number" step="1000" value={options.slRevenueThreshold ?? projection.assumptions.slRevenueThreshold} onChange={(e) => onOption("slRevenueThreshold", Number(e.target.value))} /></label>
            <label className={styles.field}>Umbral neto SL<input type="number" step="1000" value={options.slNetIncomeThreshold ?? projection.assumptions.slNetIncomeThreshold} onChange={(e) => onOption("slNetIncomeThreshold", Number(e.target.value))} /></label>
          </div>
        </div>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Base real</p>
              <h2 className={styles.panelTitle}>Datos anualizados</h2>
            </div>
            <Banknote width={17} height={17} />
          </div>
          <dl className={styles.totals}>
            <div><dt>Ingresos</dt><dd>{formatMoney(projection.baseline.annualRevenue)}</dd></div>
            <div><dt>Gastos deducibles</dt><dd>{formatMoney(projection.baseline.annualExpenses)}</dd></div>
            <div><dt>Ingresos con retención</dt><dd>{formatPercent(projection.baseline.retainedIncomeRatio)}</dd></div>
            <div><dt>Modelo 130</dt><dd>{projection.baseline.model130Reason}</dd></div>
          </dl>
          <p className={styles.empty}>
            La estimación IRPF combina nómina y autónomo para planificación. La renta oficial requiere constantes revisadas por Fiscal Watcher o gestoría.
          </p>
        </aside>
      </section>

      <section className={styles.metricGrid}>
        {projection.scenarios.map((scenario) => (
          <article key={scenario.id} className={styles.metricCard}>
            <span className={styles.metricIcon}><Landmark width={16} height={16} /></span>
            <p>{scenario.label}</p>
            <strong>{formatMoney(scenario.totals.netReal)}</strong>
            <small>{scenario.description}</small>
            <div className={styles.compactList}>
              <div className={styles.toolRow}><strong>IRPF</strong><span>{formatMoney(scenario.totals.irpf)}</span></div>
              <div className={styles.toolRow}><strong>RETA</strong><span>{formatMoney(scenario.totals.reta)}</span></div>
              <div className={styles.toolRow}><strong>Pluriactividad</strong><span>{formatMoney(scenario.totals.pluriactivityRefund)}</span></div>
            </div>
          </article>
        ))}
      </section>

      {projection.scenarios.map((scenario) => (
        <ProjectionScenarioTable key={scenario.id} scenario={scenario} />
      ))}
    </div>
  );
}

function ProjectionScenarioTable({ scenario }: { scenario: PluriannualProjection["scenarios"][number] }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelKicker}>{scenario.description}</p>
          <h2 className={styles.panelTitle}>Escenario {scenario.label}</h2>
        </div>
      </div>
      <div className={styles.projectionTable}>
        <div className={styles.projectionHeader}>
          <span>Año</span>
          <span>Ingresos</span>
          <span>RETA</span>
          <span>IRPF estimado</span>
          <span>Neto real</span>
          <span>Análisis</span>
        </div>
        {scenario.yearly.map((year) => (
          <div key={`${scenario.id}-${year.year}`} className={styles.projectionRow}>
            <span>{year.year}</span>
            <span>{formatMoney(year.annualRevenue)}</span>
            <span>{formatMoney(year.annualReta)} · {year.reta.tramoLabel}</span>
            <span>{formatMoney(year.estimatedIrpfTotal)}</span>
            <strong>{formatMoney(year.netRealAnnual)}</strong>
            <span>
              {year.notes.length > 0 ? year.notes.join(" ") : year.slAnalysis.recommendedReview ? year.slAnalysis.reasons.join(", ") : "OK"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PaymentDashboardView({ dashboard }: { dashboard: FiscalPaymentDashboard }) {
  return (
    <div className={styles.payPage}>
      <section className={`${styles.panel} ${styles.heroPanel}`}>
        <div>
          <p className={styles.panelKicker}>Caja real</p>
          <h2 className={styles.heroQuestion}>¿Cuánto dinero es realmente mío?</h2>
        </div>
        <div className={styles.realMoney}>
          <span>Disponible real</span>
          <strong>{formatMoney(dashboard.cash.availableReal)}</strong>
        </div>
        <dl className={styles.cashGrid}>
          <div><dt>Cobrado</dt><dd>{formatMoney(dashboard.cash.collected)}</dd></div>
          <div><dt>Reservado IVA</dt><dd>{formatMoney(dashboard.cash.reservedVat)}</dd></div>
          <div><dt>Reservado IRPF</dt><dd>{formatMoney(dashboard.cash.reservedIrpf)}</dd></div>
          <div><dt>Reservado RETA</dt><dd>{formatMoney(dashboard.cash.reservedReta)}</dd></div>
        </dl>
      </section>

      <section className={styles.metricGrid}>
        <MetricCard
          icon={<ReceiptText width={16} height={16} />}
          label={`IVA T${dashboard.period.quarter} estimado`}
          value={formatMoney(dashboard.quarterVatEstimated)}
          detail={`${formatMoney(dashboard.quarterInputVatDeductible)} IVA soportado deducible`}
        />
        <MetricCard
          icon={<Landmark width={16} height={16} />}
          label="IRPF retenido"
          value={formatMoney(dashboard.ytdWithholding)}
          detail={`${formatPercent(dashboard.retainedIncomeRatio)} de ingresos con retención`}
        />
        <MetricCard
          icon={<FileText width={16} height={16} />}
          label="Modelo 130"
          value={dashboard.model130Applies ? formatMoney(dashboard.model130Estimated) : "No aplica"}
          detail={dashboard.model130Reason}
        />
        <MetricCard
          icon={<ShieldCheck width={16} height={16} />}
          label="RETA mensual"
          value={formatMoney(dashboard.reta.monthlyFee)}
          detail={dashboard.reta.source === "manual" ? "Cuota manual" : `${dashboard.reta.tramoLabel} · base ${formatMoney(dashboard.reta.base)}`}
        />
        <MetricCard
          icon={<Wallet width={16} height={16} />}
          label="Renta anual proyectada"
          value={formatMoney(dashboard.projectedAnnualNetIncome)}
          detail={`${formatMoney(dashboard.projectedAnnualRevenue)} ingresos anuales proyectados`}
        />
        <MetricCard
          icon={<Banknote width={16} height={16} />}
          label="Devolución pluriactividad"
          value={formatMoney(dashboard.pluriactivityRefund)}
          detail={`${formatMoney(dashboard.projectedAnnualReta)} RETA anual proyectada`}
        />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelKicker}>Lectura fiscal</p>
            <h2 className={styles.panelTitle}>Estimación del año en curso</h2>
          </div>
        </div>
        <dl className={styles.totals}>
          <div><dt>Ingresos YTD</dt><dd>{formatMoney(dashboard.ytdRevenue)}</dd></div>
          <div><dt>Gastos deducibles YTD</dt><dd>{formatMoney(dashboard.ytdDeductibleExpenses)}</dd></div>
          <div><dt>IVA emitido YTD</dt><dd>{formatMoney(dashboard.ytdVatIssued)}</dd></div>
          <div><dt>IVA deducible YTD</dt><dd>{formatMoney(dashboard.ytdInputVatDeductible)}</dd></div>
          <div><dt>IVA cobrado YTD</dt><dd>{formatMoney(dashboard.ytdVatCollected)}</dd></div>
          <div><dt>IRPF reserva proyectada</dt><dd>{formatMoney(dashboard.projectedAnnualPersonalIncomeTaxReserve)}</dd></div>
          <div><dt>Rendimiento neto mensual</dt><dd>{formatMoney(dashboard.reta.monthlyNetIncome)}</dd></div>
        </dl>
        <p className={styles.empty}>
          Estimación operativa basada en facturas no anuladas, facturas marcadas como cobradas y parámetros del perfil fiscal.
        </p>
      </section>
    </div>
  );
}

function FiscalAssistantView({
  messages,
  question,
  busy,
  onQuestion,
  onAsk,
}: {
  messages: AssistantMessage[];
  question: string;
  busy: boolean;
  onQuestion: (value: string) => void;
  onAsk: (question: string) => void;
}) {
  const quickQuestions = [
    "¿Qué debería hacer este mes?",
    "¿Cuánto tengo que pagar este trimestre?",
    "¿Por qué me sale este IVA?",
    "¿Qué facturas UE van al modelo 349?",
    "¿Qué gastos puedo deducir?",
    "¿Estoy cerca de tener que presentar modelo 130?",
    "¿Cuánto debería reservar si cierro otro cliente de 2.000 €/mes?",
    "Detecta anomalías fiscales este mes.",
    "Explícame esta factura.",
    "Prepárame un mensaje para gestoría.",
    "Resume cambios fiscales que debería revisar.",
  ];

  return (
    <section className={styles.assistantShell}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelKicker}>IA Fiscal Recomendada</p>
            <h2 className={styles.panelTitle}>Qué hacer, por qué y con qué datos</h2>
          </div>
          <Bot width={18} height={18} />
        </div>
        <p className={styles.empty}>
          La IA recomienda, simula y prepara mensajes. Los cálculos salen del motor fiscal y de herramientas controladas.
        </p>
        <div className={styles.quickGrid}>
          {quickQuestions.map((item) => (
            <button key={item} type="button" onClick={() => void onAsk(item)} className={styles.quickQuestion}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className={`${styles.panel} ${styles.chatPanel}`}>
        <div className={styles.chatMessages}>
          {messages.map((message) => (
            <article key={message.id} className={styles.chatMessage} data-role={message.role}>
              <div className={styles.chatBubble}>
                <MarkdownLite text={message.text} />
                {message.recommendations && message.recommendations.length > 0 && (
                  <ul className={styles.alertList}>
                    {message.recommendations.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
                {message.tools && message.tools.length > 0 && (
                  <details className={styles.toolDetails}>
                    <summary>Herramientas usadas · {message.model ?? "motor fiscal"}</summary>
                    {message.tools.map((tool) => (
                      <div key={`${message.id}-${tool.tool}`} className={styles.toolRow}>
                        <strong>{tool.tool}</strong>
                        <span>{tool.summary}</span>
                      </div>
                    ))}
                  </details>
                )}
              </div>
            </article>
          ))}
        </div>
        <form
          className={styles.chatForm}
          onSubmit={(e) => {
            e.preventDefault();
            void onAsk(question);
          }}
        >
          <input
            value={question}
            onChange={(e) => onQuestion(e.target.value)}
            placeholder="Pregunta fiscal..."
            disabled={busy}
          />
          <button type="submit" disabled={busy || !question.trim()} className={styles.primaryButton}>
            {busy ? "Pensando…" : "Preguntar"}
          </button>
        </form>
      </div>
    </section>
  );
}

function BackendServicesView({
  status,
  loading,
  onRefresh,
}: {
  status: FormetaServicesStatus | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className={styles.payPage}>
      <section className={`${styles.panel} ${styles.heroPanel}`}>
        <div>
          <p className={styles.panelKicker}>Backend ForMeta</p>
          <h2 className={styles.heroQuestion}>Fiscal y RAG conectados server-side.</h2>
        </div>
        <div className={styles.realMoney}>
          <span>Estado</span>
          <strong>{status ? overallBackendStatus(status) : "Sin comprobar"}</strong>
        </div>
        <div className={styles.closureControls}>
          <button type="button" onClick={onRefresh} disabled={loading} className={styles.primaryButton}>
            <Database width={15} height={15} />
            {loading ? "Comprobando…" : "Comprobar backend"}
          </button>
        </div>
      </section>

      <section className={styles.metricGrid}>
        <ServiceCard
          title="Fiscal API"
          subtitle="https://fiscal.formeta.es"
          checks={[
            ["Health", status?.fiscal.health],
            ["Status", status?.fiscal.status],
          ]}
        />
        <ServiceCard
          title="RAG API"
          subtitle="https://frag.formeta.es"
          checks={[
            ["Health", status?.rag.health],
            ["Collections", status?.rag.collections],
          ]}
        />
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}><ShieldCheck width={16} height={16} /></span>
          <p>Integración segura</p>
          <strong>Server-side</strong>
          <small>Las claves Cloudflare Access se leen solo en rutas API de Next y no llegan al navegador.</small>
        </article>
      </section>

      {status && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Última comprobación</p>
              <h2 className={styles.panelTitle}>{new Date(status.checkedAt).toLocaleString("es-ES")}</h2>
            </div>
          </div>
          <p className={styles.empty}>
            Si el dominio público devuelve challenge de Cloudflare, configura `CF_ACCESS_CLIENT_ID` y `CF_ACCESS_CLIENT_SECRET` en el servidor.
          </p>
        </section>
      )}
    </div>
  );
}

function FiscalWatcherView({
  alerts,
  signatures,
  running,
  onRun,
  onStatus,
}: {
  alerts: FiscalWatcherAlert[];
  signatures: Record<string, string>;
  running: boolean;
  onRun: () => void;
  onStatus: (alert: FiscalWatcherAlert, status: FiscalWatcherStatus) => void;
}) {
  const openAlerts = alerts.filter((alert) => alert.status === "new" || alert.status === "reviewing");
  const baselineCount = Object.keys(signatures).length;

  return (
    <div className={styles.payPage}>
      <section className={`${styles.panel} ${styles.heroPanel}`}>
        <div>
          <p className={styles.panelKicker}>Fiscal Watcher</p>
          <h2 className={styles.heroQuestion}>Vigila novedades fiscales sin tocar constantes.</h2>
        </div>
        <div className={styles.realMoney}>
          <span>Alertas abiertas</span>
          <strong>{openAlerts.length}</strong>
        </div>
        <div className={styles.closureControls}>
          <button type="button" onClick={onRun} disabled={running} className={styles.primaryButton}>
            <SearchCheck width={15} height={15} />
            {running ? "Comprobando…" : "Comprobar fuentes"}
          </button>
        </div>
      </section>

      <section className={styles.metricGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}><ShieldCheck width={16} height={16} /></span>
          <p>Control</p>
          <strong>Manual</strong>
          <small>Detecta cambios, crea alertas y exige revisión antes de actualizar constantes.</small>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}><Database width={16} height={16} /></span>
          <p>Línea base</p>
          <strong>{baselineCount}/{FISCAL_WATCHER_SOURCES.length}</strong>
          <small>La primera ejecución guarda firmas; las siguientes comparan cambios.</small>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}><AlertTriangle width={16} height={16} /></span>
          <p>Trazabilidad</p>
          <strong>{alerts.length}</strong>
          <small>Cada alerta conserva fuente, fecha, impacto, constante afectada y evidencia.</small>
        </article>
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Fuentes oficiales</p>
              <h2 className={styles.panelTitle}>Qué se vigila</h2>
            </div>
            <SearchCheck width={17} height={17} />
          </div>
          <div className={styles.sourceList}>
            {FISCAL_WATCHER_SOURCES.map((source) => (
              <article key={source.id} className={styles.sourceRow}>
                <div>
                  <strong>{source.label}</strong>
                  <span>{source.source} · {signatures[source.id] ? "con línea base" : "pendiente de línea base"}</span>
                  <small>{source.affects.join(", ")}</small>
                </div>
                <a href={source.url} target="_blank" rel="noreferrer">Fuente</a>
              </article>
            ))}
          </div>
        </div>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Regla de seguridad</p>
              <h2 className={styles.panelTitle}>La IA no confirma cambios</h2>
            </div>
            <ShieldCheck width={17} height={17} />
          </div>
          <p className={styles.empty}>
            Fiscal Watcher puede avisar de novedades en BOE, AEAT, Seguridad Social, VIES e Illes Balears. La actualización de constantes queda pendiente de validación tuya o de gestoría.
          </p>
          <ul className={styles.alertList}>
            <li>No modifica `fiscal_constants/*` automáticamente.</li>
            <li>No recalcula obligaciones con normas no aprobadas.</li>
            <li>No borra alertas; se marcan como revisadas, validadas o descartadas.</li>
          </ul>
        </aside>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelKicker}>Alertas fiscales</p>
            <h2 className={styles.panelTitle}>Novedades detectadas</h2>
          </div>
          <span className={styles.alertPill}><AlertTriangle width={13} height={13} /> {openAlerts.length}</span>
        </div>
        <div className={styles.alertCards}>
          {alerts.map((alert) => (
            <article key={alert.id} className={styles.alertCard} data-status={alert.status}>
              <div>
                <div className={styles.alertMeta}>
                  <span>{alert.source}</span>
                  <span>{watcherSeverityLabel(alert.severity)}</span>
                  <span>{watcherStatusLabel(alert.status)}</span>
                </div>
                <h3>{alert.title}</h3>
                <p>{alert.summary}</p>
              </div>
              <dl className={styles.totals}>
                <div><dt>Fecha fuente</dt><dd>{alert.sourceDate}</dd></div>
                <div><dt>Detectada</dt><dd>{formatTimestamp(alert.detectedAt)}</dd></div>
                <div><dt>Impacto posible</dt><dd>{alert.possibleImpact}</dd></div>
                <div><dt>Constante afectada</dt><dd>{alert.affectedConstant}</dd></div>
                <div><dt>Validación</dt><dd>{alert.requiresValidation ? "Requiere revisión" : "Informativa"}</dd></div>
              </dl>
              {alert.evidence.length > 0 && (
                <ul className={styles.alertList}>
                  {alert.evidence.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
              <div className={styles.actionRow}>
                <a href={alert.url} target="_blank" rel="noreferrer" className={styles.secondaryButton}>Abrir fuente</a>
                <button type="button" onClick={() => onStatus(alert, "reviewing")} className={styles.secondaryButton}>Revisando</button>
                <button type="button" onClick={() => onStatus(alert, "validated")} className={styles.primaryButton}><Check width={15} height={15} /> Validada</button>
                <button type="button" onClick={() => onStatus(alert, "dismissed")} className={styles.dangerButton}><X width={15} height={15} /> Descartar</button>
              </div>
            </article>
          ))}
          {alerts.length === 0 && <p className={styles.empty}>Sin alertas todavía. Ejecuta una primera comprobación para crear la línea base.</p>}
        </div>
      </section>
    </div>
  );
}

function ServiceCard({
  title,
  subtitle,
  checks,
}: {
  title: string;
  subtitle: string;
  checks: Array<[string, FormetaServicesStatus["fiscal"]["health"] | undefined]>;
}) {
  const ok = checks.every(([, check]) => check?.ok);
  return (
    <article className={styles.metricCard} data-muted={!ok}>
      <span className={styles.metricIcon}><Database width={16} height={16} /></span>
      <p>{title}</p>
      <strong>{ok ? "OK" : "Revisar"}</strong>
      <small>{subtitle}</small>
      <div className={styles.compactList}>
        {checks.map(([label, check]) => (
          <div key={label} className={styles.toolRow}>
            <strong>{label}</strong>
            <span>{check ? backendCheckSummary(check) : "Pendiente"}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function MarkdownLite({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, index) => (
        <p key={`${line}-${index}`}>
          {line.replace(/\*\*/g, "")}
        </p>
      ))}
    </>
  );
}

function ExpensesView({
  expenseForm,
  editingExpenseId,
  expenses,
  recurringExpenses,
  recurringForm,
  savingExpense,
  savingRecurring,
  onExpenseField,
  onExpenseCategory,
  onExpenseSubmit,
  onExpenseEdit,
  onExpenseCancel,
  onRecurringField,
  onRecurringCategory,
  onRecurringSubmit,
  onMaterializeRecurring,
}: {
  expenseForm: ExpenseInput;
  editingExpenseId: string | null;
  expenses: Expense[];
  recurringExpenses: RecurringExpense[];
  recurringForm: RecurringExpenseInput;
  savingExpense: boolean;
  savingRecurring: boolean;
  onExpenseField: <K extends keyof ExpenseInput>(key: K, value: ExpenseInput[K]) => void;
  onExpenseCategory: (categoryId: ExpenseCategoryId) => void;
  onExpenseSubmit: (event: React.FormEvent) => void;
  onExpenseEdit: (expense: Expense) => void;
  onExpenseCancel: () => void;
  onRecurringField: <K extends keyof RecurringExpenseInput>(key: K, value: RecurringExpenseInput[K]) => void;
  onRecurringCategory: (categoryId: ExpenseCategoryId) => void;
  onRecurringSubmit: (event: React.FormEvent) => void;
  onMaterializeRecurring: (expense: RecurringExpense) => void;
}) {
  const preview = normalizeExpenseInput(expenseForm);
  const alertCount = expenses.reduce((sum, expense) => sum + expense.alerts.length, 0) + preview.alerts.length;

  return (
    <section className={styles.grid}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelKicker}>Facturas recibidas</p>
            <h2 className={styles.panelTitle}>{editingExpenseId ? "Editar gasto" : "Registrar gasto"}</h2>
          </div>
          <span className={styles.alertPill}><AlertTriangle width={13} height={13} /> {alertCount}</span>
        </div>

        <form onSubmit={onExpenseSubmit} className={styles.formStack}>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Proveedor<input value={expenseForm.supplierName} onChange={(e) => onExpenseField("supplierName", e.target.value)} /></label>
            <label className={styles.field}>NIF proveedor<input value={expenseForm.supplierTaxId} onChange={(e) => onExpenseField("supplierTaxId", e.target.value.toUpperCase())} /></label>
            <label className={styles.field}>Nº factura<input value={expenseForm.invoiceNumber} onChange={(e) => onExpenseField("invoiceNumber", e.target.value)} /></label>
            <label className={styles.field}>Fecha<input type="date" value={expenseForm.issueDate} onChange={(e) => onExpenseField("issueDate", e.target.value)} /></label>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Categoría<select value={expenseForm.categoryId} onChange={(e) => onExpenseCategory(e.target.value as ExpenseCategoryId)}>{EXPENSE_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
            <label className={styles.field}>Documento<select value={expenseForm.documentType} onChange={(e) => onExpenseField("documentType", e.target.value as ExpenseInput["documentType"])}><option value="complete_invoice">Factura completa</option><option value="simplified_invoice">Factura simplificada</option><option value="receipt">Recibo</option><option value="none">Sin documento</option></select></label>
            <label className={styles.field}>Tipo<select value={expenseForm.kind} onChange={(e) => onExpenseField("kind", e.target.value as ExpenseInput["kind"])}><option value="current">Gasto corriente</option><option value="investment">Bien de inversión</option></select></label>
            <label className={styles.field}>País<input maxLength={2} value={expenseForm.countryCode} onChange={(e) => onExpenseField("countryCode", e.target.value.toUpperCase())} /></label>
          </div>
          <label className={styles.field}>Descripción<input value={expenseForm.description} onChange={(e) => onExpenseField("description", e.target.value)} /></label>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Base<input type="number" min="0" step="0.01" value={expenseForm.base} onChange={(e) => onExpenseField("base", Number(e.target.value))} /></label>
            <label className={styles.field}>IVA %<input type="number" min="0" step="0.01" value={expenseForm.vatRate} onChange={(e) => onExpenseField("vatRate", Number(e.target.value))} /></label>
            <label className={styles.field}>Afectación %<input type="number" min="0" max="100" step="1" value={expenseForm.affectionPercent} onChange={(e) => onExpenseField("affectionPercent", Number(e.target.value))} /></label>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.checkField}><input type="checkbox" checked={expenseForm.irpfDeductible} onChange={(e) => onExpenseField("irpfDeductible", e.target.checked)} /> IRPF deducible</label>
            <label className={styles.checkField}><input type="checkbox" checked={expenseForm.vatDeductible} onChange={(e) => onExpenseField("vatDeductible", e.target.checked)} /> IVA deducible</label>
            <label className={styles.checkField}><input type="checkbox" checked={expenseForm.isPaid} onChange={(e) => onExpenseField("isPaid", e.target.checked)} /> Pagado</label>
          </div>
          {expenseForm.kind === "investment" && (
            <div className={styles.fieldRow}>
              <label className={styles.field}>Inicio uso<input type="date" value={expenseForm.investment?.startUseDate ?? expenseForm.issueDate} onChange={(e) => onExpenseField("investment", { ...(expenseForm.investment ?? { usefulLifeYears: 4, annualAmortizationRate: 25 }), startUseDate: e.target.value })} /></label>
              <label className={styles.field}>Vida útil años<input type="number" min="1" value={expenseForm.investment?.usefulLifeYears ?? 4} onChange={(e) => onExpenseField("investment", { ...(expenseForm.investment ?? { startUseDate: expenseForm.issueDate, annualAmortizationRate: 25 }), usefulLifeYears: Number(e.target.value) })} /></label>
              <label className={styles.field}>Amortización % anual<input type="number" min="0" max="100" value={expenseForm.investment?.annualAmortizationRate ?? 25} onChange={(e) => onExpenseField("investment", { ...(expenseForm.investment ?? { startUseDate: expenseForm.issueDate, usefulLifeYears: 4 }), annualAmortizationRate: Number(e.target.value) })} /></label>
            </div>
          )}

          <ExpensePreview expense={preview} />

          <div className={styles.actionRow}>
            {editingExpenseId && <button type="button" onClick={onExpenseCancel} className={styles.secondaryButton}>Cancelar</button>}
            <button type="submit" disabled={savingExpense || !expenseForm.supplierName.trim()} className={styles.primaryButton}>
              <Save width={15} height={15} />
              {savingExpense ? "Guardando…" : editingExpenseId ? "Guardar gasto" : "Registrar gasto"}
            </button>
          </div>
        </form>
      </div>

      <aside className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelKicker}>Recurrentes</p>
            <h2 className={styles.panelTitle}>Gastos previstos</h2>
          </div>
          <CalendarClock width={17} height={17} />
        </div>
        <form onSubmit={onRecurringSubmit} className={styles.formStack}>
          <label className={styles.field}>Nombre<input value={recurringForm.name} onChange={(e) => onRecurringField("name", e.target.value)} /></label>
          <label className={styles.field}>Proveedor<input value={recurringForm.supplierName} onChange={(e) => onRecurringField("supplierName", e.target.value)} /></label>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Categoría<select value={recurringForm.categoryId} onChange={(e) => onRecurringCategory(e.target.value as ExpenseCategoryId)}>{EXPENSE_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
            <label className={styles.field}>Intervalo<select value={recurringForm.interval} onChange={(e) => onRecurringField("interval", e.target.value as RecurringExpenseInput["interval"])}><option value="monthly">Mensual</option><option value="quarterly">Trimestral</option><option value="yearly">Anual</option></select></label>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Próxima fecha<input type="date" value={recurringForm.nextIssueDate} onChange={(e) => onRecurringField("nextIssueDate", e.target.value)} /></label>
            <label className={styles.field}>Base<input type="number" min="0" step="0.01" value={recurringForm.base} onChange={(e) => onRecurringField("base", Number(e.target.value))} /></label>
            <label className={styles.field}>IVA %<input type="number" min="0" step="0.01" value={recurringForm.vatRate} onChange={(e) => onRecurringField("vatRate", Number(e.target.value))} /></label>
          </div>
          <button type="submit" disabled={savingRecurring || !recurringForm.name.trim()} className={styles.secondaryButton}>
            <Plus width={15} height={15} />
            {savingRecurring ? "Guardando…" : "Guardar recurrente"}
          </button>
        </form>

        <div className={styles.compactList}>
          {recurringExpenses.map((expense) => (
            <article key={expense.id} className={styles.compactRow}>
              <div><strong>{expense.name}</strong><span>{expense.supplierName} · {expense.nextIssueDate}</span></div>
              <button type="button" onClick={() => void onMaterializeRecurring(expense)} className={styles.iconButton} aria-label="Crear gasto recurrente"><Plus width={14} height={14} /></button>
            </article>
          ))}
          {recurringExpenses.length === 0 && <p className={styles.empty}>Sin recurrentes todavía.</p>}
        </div>
      </aside>

      <section className={`${styles.panel} ${styles.fullWidth}`}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelKicker}>Registro</p>
            <h2 className={styles.panelTitle}>Últimos gastos</h2>
          </div>
        </div>
        <div className={styles.invoiceList}>
          {expenses.map((expense) => (
            <article key={expense.id} className={styles.expenseRow}>
              <div>
                <strong>{expense.supplierName}</strong>
                <span>{expenseCategoryLabel(expense.categoryId)} · {expense.issueDate} · {expense.documentType === "complete_invoice" ? "Factura completa" : "Documento parcial"}</span>
                {expense.alerts.length > 0 && <code>{expense.alerts[0]}</code>}
              </div>
              <b>{formatMoney(expense.total)}</b>
              <span>{formatMoney(expense.deductibleVat)} IVA</span>
              <button type="button" onClick={() => onExpenseEdit(expense)} className={styles.secondaryButton}>Editar</button>
            </article>
          ))}
          {expenses.length === 0 && <p className={styles.empty}>Aún no hay gastos registrados.</p>}
        </div>
      </section>
    </section>
  );
}

function ExpensePreview({ expense }: { expense: Expense }) {
  return (
    <div className={styles.regimeBox}>
      <span>Deducción calculada</span>
      <p>
        Base deducible {formatMoney(expense.deductibleBase)} · IVA deducible {formatMoney(expense.deductibleVat)} · Total {formatMoney(expense.total)}
      </p>
      {expense.alerts.length > 0 && (
        <ul className={styles.alertList}>
          {expense.alerts.map((alert) => <li key={alert}>{alert}</li>)}
        </ul>
      )}
    </div>
  );
}

function BooksView({ books }: { books: ReturnType<typeof buildFiscalBooks> }) {
  return (
    <div className={styles.payPage}>
      <BookSection
        title="Libro de facturas emitidas"
        kicker={`${books.issuedInvoices.length} registros`}
        rows={books.issuedInvoices.map((invoice) => [
          invoice.issueDate,
          invoice.number,
          invoice.client.name,
          invoice.client.tax.taxId || invoice.client.tax.vatNumber || "—",
          formatMoney(invoice.totals.subtotal),
          formatMoney(invoice.totals.vat),
          formatMoney(invoice.totals.total),
        ])}
        headers={["Fecha", "Número", "Cliente", "NIF/VAT", "Base", "IVA", "Total"]}
      />
      <BookSection
        title="Libro de facturas recibidas"
        kicker={`${books.receivedInvoices.length} registros`}
        rows={books.receivedInvoices.map((expense) => [
          expense.issueDate,
          expense.invoiceNumber || "—",
          expense.supplierName,
          expense.supplierTaxId || "—",
          formatMoney(expense.base),
          formatMoney(expense.deductibleVat),
          formatMoney(expense.total),
        ])}
        headers={["Fecha", "Factura", "Proveedor", "NIF", "Base", "IVA ded.", "Total"]}
      />
      <BookSection
        title="Libro de bienes de inversión"
        kicker={`${books.investmentGoods.length} bienes`}
        rows={books.investmentGoods.map((expense) => [
          expense.issueDate,
          expense.supplierName,
          expense.description || expense.invoiceNumber || "—",
          formatMoney(expense.deductibleBase),
          `${expense.investment?.annualAmortizationRate ?? 0}%`,
          `${expense.investment?.usefulLifeYears ?? 0} años`,
          expense.alerts.length > 0 ? "Revisar" : "OK",
        ])}
        headers={["Fecha", "Proveedor", "Bien", "Base afectada", "Amort.", "Vida útil", "Estado"]}
      />
    </div>
  );
}

function ClosuresView({
  closure,
  draft,
  savedClosure,
  year,
  quarter,
  saving,
  onYear,
  onQuarter,
  onPrepare,
  onFile,
  onExport,
}: {
  closure: QuarterlyClosure;
  draft: QuarterlyClosure;
  savedClosure: QuarterlyClosure | null;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  saving: boolean;
  onYear: (year: number) => void;
  onQuarter: (quarter: 1 | 2 | 3 | 4) => void;
  onPrepare: () => void;
  onFile: () => void;
  onExport: () => void;
}) {
  const blocking = closure.snapshot.checklist.filter((item) => item.blocking && !item.done).length;
  const changedAfterSnapshot = Boolean(savedClosure && (
    savedClosure.snapshot.invoicesCount !== draft.snapshot.invoicesCount ||
    savedClosure.snapshot.expensesCount !== draft.snapshot.expensesCount ||
    savedClosure.snapshot.model303.amount !== draft.snapshot.model303.amount ||
    savedClosure.snapshot.model130.amount !== draft.snapshot.model130.amount ||
    savedClosure.snapshot.model349.amount !== draft.snapshot.model349.amount
  ));

  return (
    <div className={styles.payPage}>
      <section className={`${styles.panel} ${styles.heroPanel}`}>
        <div>
          <p className={styles.panelKicker}>Cierre trimestral</p>
          <h2 className={styles.heroQuestion}>T{quarter} {year}: qué toca presentar y cuánto sale.</h2>
        </div>
        <div className={styles.realMoney}>
          <span>Estado</span>
          <strong>{closureStatusLabel(closure.status)}</strong>
        </div>
        <div className={styles.closureControls}>
          <label className={styles.field}>Año<input type="number" value={year} onChange={(e) => onYear(Number(e.target.value))} /></label>
          <label className={styles.field}>Trimestre<select value={quarter} onChange={(e) => onQuarter(Number(e.target.value) as 1 | 2 | 3 | 4)}><option value={1}>T1</option><option value={2}>T2</option><option value={3}>T3</option><option value={4}>T4</option></select></label>
          <button type="button" onClick={onExport} className={styles.secondaryButton}><Download width={15} height={15} /> Export gestoría</button>
          <button type="button" onClick={onPrepare} disabled={saving || blocking > 0} className={styles.primaryButton}><PackageCheck width={15} height={15} /> Preparar</button>
          <button type="button" onClick={onFile} disabled={saving || closure.status === "filed" || blocking > 0} className={styles.dangerButton}><Check width={15} height={15} /> Presentado</button>
        </div>
        {changedAfterSnapshot && <p className={styles.notice}>Hay datos diarios más recientes que el snapshot guardado. Preparar de nuevo actualizará el cierre.</p>}
      </section>

      <section className={styles.metricGrid}>
        <ClosureModelCard model={closure.snapshot.model303} />
        <ClosureModelCard model={closure.snapshot.model130} />
        <ClosureModelCard model={closure.snapshot.model349} />
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Checklist</p>
              <h2 className={styles.panelTitle}>Antes de presentar</h2>
            </div>
            <span className={styles.alertPill}><AlertTriangle width={13} height={13} /> {blocking}</span>
          </div>
          <div className={styles.checkList}>
            {closure.snapshot.checklist.map((item) => (
              <div key={item.id} className={styles.checkRow} data-done={item.done}>
                <span>{item.done ? <Check width={14} height={14} /> : <X width={14} height={14} />}</span>
                <strong>{item.label}</strong>
                <small>{item.blocking ? "Bloqueante" : "Revisión"}</small>
              </div>
            ))}
          </div>
        </div>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Calendario fiscal</p>
              <h2 className={styles.panelTitle}>Vencimientos</h2>
            </div>
            <CalendarClock width={17} height={17} />
          </div>
          <div className={styles.compactList}>
            {closure.snapshot.calendar.map((item) => (
              <article key={item.model} className={styles.compactRow}>
                <div><strong>{item.label}</strong><span>{formatDate(item.dueDate)} · {closureStatusLabel(item.status)}</span></div>
              </article>
            ))}
          </div>
          <dl className={styles.totals}>
            <div><dt>Base ingresos</dt><dd>{formatMoney(closure.snapshot.revenueBase)}</dd></div>
            <div><dt>IVA repercutido</dt><dd>{formatMoney(closure.snapshot.outputVat)}</dd></div>
            <div><dt>IVA deducible</dt><dd>{formatMoney(closure.snapshot.inputVat)}</dd></div>
            <div><dt>Gastos deducibles</dt><dd>{formatMoney(closure.snapshot.deductibleExpenses)}</dd></div>
            <div><dt>Retenciones</dt><dd>{formatMoney(closure.snapshot.withholding)}</dd></div>
          </dl>
        </aside>
      </section>

      {closure.snapshot.model349.required && (
        <BookSection
          title="Operaciones UE para Modelo 349"
          kicker={`${closure.snapshot.model349Operations.length} clientes`}
          headers={["Cliente", "VAT", "País", "Base", "", "", ""]}
          rows={closure.snapshot.model349Operations.map((operation) => [
            operation.clientName,
            operation.vatNumber || "—",
            operation.countryCode,
            formatMoney(operation.taxableBase),
            "",
            "",
            "",
          ])}
        />
      )}
    </div>
  );
}

function ClosureModelCard({ model }: { model: QuarterlyClosure["snapshot"]["model303"] }) {
  return (
    <article className={styles.metricCard} data-muted={!model.required}>
      <span className={styles.metricIcon}><FileText width={16} height={16} /></span>
      <p>Modelo {model.model}</p>
      <strong>{model.required ? formatMoney(model.amount) : "No aplica"}</strong>
      <small>{formatDate(model.dueDate)} · {model.reason}</small>
    </article>
  );
}

function BookSection({
  title,
  kicker,
  headers,
  rows,
}: {
  title: string;
  kicker: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelKicker}>{kicker}</p>
          <h2 className={styles.panelTitle}>{title}</h2>
        </div>
        <BookOpen width={17} height={17} />
      </div>
      <div className={styles.bookTable}>
        <div className={styles.bookHeader}>
          {headers.map((header, headerIndex) => <span key={`${title}-header-${headerIndex}`}>{header}</span>)}
        </div>
        {rows.map((row, index) => (
          <div key={`${title}-${index}`} className={styles.bookRow}>
            {row.map((cell, cellIndex) => <span key={`${title}-${index}-${cellIndex}`}>{cell}</span>)}
          </div>
        ))}
        {rows.length === 0 && <p className={styles.empty}>Sin registros.</p>}
      </div>
    </section>
  );
}

function closureStatusLabel(status: QuarterlyClosureStatus): string {
  switch (status) {
    case "pending": return "Pendiente";
    case "prepared": return "Preparado";
    case "filed": return "Presentado";
  }
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className={styles.metricCard}>
      <span className={styles.metricIcon}>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function TotalsPanel({ totals, vatRate, withholdingRate }: { totals: { subtotal: number; vat: number; withholding: number; total: number }; vatRate: number; withholdingRate: number }) {
  return (
    <aside className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelKicker}>Cálculo</p>
          <h2 className={styles.panelTitle}>Totales</h2>
        </div>
      </div>
      <dl className={styles.totals}>
        <div><dt>Base</dt><dd>{formatMoney(totals.subtotal)}</dd></div>
        <div><dt>IVA {vatRate}%</dt><dd>{formatMoney(totals.vat)}</dd></div>
        <div><dt>Retención {withholdingRate}%</dt><dd>-{formatMoney(totals.withholding)}</dd></div>
        <div className={styles.totalFinal}><dt>Total</dt><dd>{formatMoney(totals.total)}</dd></div>
      </dl>
    </aside>
  );
}

function TaxSummary({ client, tax }: { client: Client | null; tax: ClientTaxProfile }) {
  const regime = determineInvoiceRegime(tax);
  return (
    <aside className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelKicker}>Clasificación</p>
          <h2 className={styles.panelTitle}>{client?.name || "Cliente"}</h2>
        </div>
      </div>
      <dl className={styles.totals}>
        <div><dt>Tipo fiscal</dt><dd>{fiscalCustomerKindLabel(tax.customerKind)}</dd></div>
        <div><dt>País</dt><dd>{tax.countryCode}</dd></div>
        <div><dt>Régimen</dt><dd>{invoiceRegimeLabel(regime)}</dd></div>
        <div><dt>VIES</dt><dd>{viesStatusLabel(tax.viesStatus)}</dd></div>
      </dl>
      {tax.viesName && <p className={styles.empty}>VIES: {tax.viesName}</p>}
      {tax.viesError && <p className={styles.empty}>Error: {tax.viesError}</p>}
    </aside>
  );
}

function eventLabel(type: FiscalEvent["type"]): string {
  switch (type) {
    case "fiscal_profile_saved": return "Perfil guardado";
    case "client_tax_updated": return "Cliente fiscal actualizado";
    case "vies_checked": return "VIES validado";
    case "invoice_issued": return "Factura emitida";
    case "invoice_cancelled": return "Factura anulada";
    case "invoice_marked_paid": return "Factura cobrada";
    case "invoice_marked_pending": return "Factura pendiente";
    case "expense_created": return "Gasto registrado";
    case "expense_updated": return "Gasto actualizado";
    case "recurring_expense_created": return "Recurrente creado";
    case "quarterly_closure_prepared": return "Cierre preparado";
    case "quarterly_closure_presented": return "Cierre presentado";
  }
}

function watcherStatusLabel(status: FiscalWatcherStatus): string {
  switch (status) {
    case "new": return "Nueva";
    case "reviewing": return "En revisión";
    case "validated": return "Validada";
    case "dismissed": return "Descartada";
  }
}

function watcherSeverityLabel(severity: FiscalWatcherAlert["severity"]): string {
  switch (severity) {
    case "info": return "Info";
    case "review": return "Revisar";
    case "urgent": return "Urgente";
  }
}

function viesStatusLabel(status: ClientTaxProfile["viesStatus"]): string {
  switch (status) {
    case "not_checked": return "No validado";
    case "valid": return "Válido";
    case "invalid": return "No válido";
    case "error": return "Error";
  }
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES");
}

function formatTimestamp(value: Timestamp | null): string {
  return value ? value.toDate().toLocaleString("es-ES") : "Pendiente";
}

function graphNodeLabel(graph: KnowledgeGraph, id: string): string {
  const node = graph.nodes.find((item) => item.id === id);
  return node ? `${node.label} (${node.type})` : id;
}

function graphEdgeLabel(graph: KnowledgeGraph, id: string): string {
  const edge = graph.edges.find((item) => item.id === id);
  return edge ? edge.label : id;
}

function graphNodeInitial(type: string): string {
  const initials: Record<string, string> = {
    country: "P",
    tax_regime: "R",
    client: "C",
    project: "P",
    invoice: "F",
    payment: "€",
    expense: "G",
    deduction_rule: "D",
    period: "T",
    obligation: "O",
  };
  return initials[type] ?? "N";
}

function shortGraphLabel(value: string): string {
  return value.length > 18 ? `${value.slice(0, 17)}…` : value;
}

function verifactuModeLabel(mode: VerifactuMode): string {
  switch (mode) {
    case "disabled": return "Off";
    case "sif": return "SIF";
    case "verifactu": return "Verifactu";
  }
}

function makeMessageId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function overallBackendStatus(status: FormetaServicesStatus): string {
  const ok = status.fiscal.health.ok && status.fiscal.status.ok && status.rag.health.ok && status.rag.collections.ok;
  return ok ? "OK" : "Revisar";
}

function backendCheckSummary(check: FormetaServicesStatus["fiscal"]["health"]): string {
  if (check.ok) return `OK · HTTP ${check.status}`;
  if (typeof check.data === "string" && check.data.includes("Just a moment")) {
    return "Cloudflare challenge · configura Access headers";
  }
  return `${check.error ?? "Error"} · HTTP ${check.status}`;
}
