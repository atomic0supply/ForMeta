import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import type { Client, ClientTaxProfile } from "@/lib/clients";
import type { Project } from "@/lib/projects";

export type FiscalCustomerKind = "business" | "self_employed" | "individual";

export type InvoiceStatus = "issued" | "cancelled";
export type InvoicePaymentStatus = "pending" | "paid";

export type InvoiceRegime =
  | "national"
  | "eu_reverse_charge"
  | "services_export"
  | "private_es_eu";

export type FiscalEventType =
  | "fiscal_profile_saved"
  | "client_tax_updated"
  | "vies_checked"
  | "invoice_issued"
  | "invoice_cancelled"
  | "invoice_marked_paid"
  | "invoice_marked_pending"
  | "expense_created"
  | "expense_updated"
  | "recurring_expense_created"
  | "quarterly_closure_prepared"
  | "quarterly_closure_presented";

export type ExpenseCategoryId =
  | "software"
  | "professional_services"
  | "office"
  | "telecom"
  | "travel"
  | "vehicle"
  | "meals"
  | "training"
  | "equipment"
  | "taxes"
  | "banking"
  | "other";

export type ExpenseDocumentType =
  | "complete_invoice"
  | "simplified_invoice"
  | "receipt"
  | "none";

export type ExpenseKind = "current" | "investment";

export type RecurrenceInterval = "monthly" | "quarterly" | "yearly";

export type ExpenseCategory = {
  id: ExpenseCategoryId;
  label: string;
  defaultVatDeductible: boolean;
  defaultIrpfDeductible: boolean;
  defaultAffectionPercent: number;
  riskHint: string;
};

export type ExpenseInvestment = {
  startUseDate: string;
  usefulLifeYears: number;
  annualAmortizationRate: number;
};

export type ExpenseInput = {
  supplierName: string;
  supplierTaxId: string;
  invoiceNumber: string;
  issueDate: string;
  categoryId: ExpenseCategoryId;
  description: string;
  kind: ExpenseKind;
  documentType: ExpenseDocumentType;
  countryCode: string;
  base: number;
  vatRate: number;
  affectionPercent: number;
  irpfDeductible: boolean;
  vatDeductible: boolean;
  isPaid: boolean;
  investment?: ExpenseInvestment;
  recurringId?: string;
};

export type Expense = ExpenseInput & {
  id: string;
  vatAmount: number;
  total: number;
  deductibleBase: number;
  deductibleVat: number;
  alerts: string[];
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
};

export type RecurringExpenseInput = Omit<ExpenseInput, "issueDate" | "isPaid" | "investment"> & {
  name: string;
  interval: RecurrenceInterval;
  nextIssueDate: string;
  active: boolean;
};

export type RecurringExpense = RecurringExpenseInput & {
  id: string;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
};

export type FiscalProfile = {
  legalName: string;
  tradeName: string;
  taxId: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  countryCode: string;
  email: string;
  phone: string;
  iban: string;
  invoiceSeries: string;
  defaultVatRate: number;
  defaultWithholdingRate: number;
  paymentTermsDays: number;
  invoiceFooter: string;
  deductibleExpenseRate: number;
  model130Mode: "auto" | "applies" | "exempt";
  previousModel130PaidYtd: number;
  retaMode: "manual" | "estimate_2026_table";
  monthlyRetaFee: number;
  retaContributionRate: number;
  isPluriactive: boolean;
  employeeSocialSecurityContributionsYtd: number;
  pluriactivityRefundThreshold: number;
  pluriactivityRefundCapRate: number;
  updatedAt?: Timestamp | null;
};

export type InvoiceLine = {
  id: string;
  description: string;
  projectId?: string;
  projectName?: string;
  quantity: number;
  unitPrice: number;
  taxableBase: number;
};

export type InvoiceTotals = {
  subtotal: number;
  vat: number;
  withholding: number;
  total: number;
};

export type InvoiceClientSnapshot = {
  id: string;
  name: string;
  email: string;
  tax: ClientTaxProfile;
};

export type Invoice = {
  id: string;
  number: string;
  series: string;
  sequence: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  paidAt?: Timestamp | null;
  paidAmount?: number;
  issuer: FiscalProfile;
  client: InvoiceClientSnapshot;
  regime: InvoiceRegime;
  regimeLabel: string;
  vatRate: number;
  withholdingRate: number;
  lines: InvoiceLine[];
  totals: InvoiceTotals;
  notes: string;
  legalNote: string;
  projectIds: string[];
  ledgerHash: string;
  previousLedgerHash: string;
  createdAt: Timestamp | null;
  createdByUid: string;
  createdByName: string;
  cancelledAt?: Timestamp | null;
  cancellationReason?: string;
};

export type FiscalEvent = {
  id: string;
  type: FiscalEventType;
  actorUid: string;
  actorName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  clientId?: string;
  clientName?: string;
  payload: Record<string, unknown>;
  createdAt: Timestamp | null;
};

export type FiscalLedgerEntry = {
  id: string;
  sequence: number;
  type: FiscalEventType;
  entityType: "invoice" | "client" | "profile" | "expense" | "recurringExpense" | "quarterlyClosure";
  entityId: string;
  hash: string;
  previousHash: string;
  payload: Record<string, unknown>;
  createdAt: Timestamp | null;
  actorUid: string;
  actorName: string;
};

export type FiscalDashboardPeriod = {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  quarterStart: string;
  quarterEnd: string;
  elapsedMonths: number;
};

export type RetaEstimate = {
  monthlyNetIncome: number;
  base: number;
  monthlyFee: number;
  source: "manual" | "estimate_2026_table";
  tramoLabel: string;
};

export type FiscalPaymentDashboard = {
  period: FiscalDashboardPeriod;
  quarterRevenue: number;
  quarterInputVatDeductible: number;
  quarterVatEstimated: number;
  ytdRevenue: number;
  ytdDeductibleExpenses: number;
  ytdVatIssued: number;
  ytdInputVatDeductible: number;
  ytdVatCollected: number;
  ytdWithholding: number;
  retainedIncomeRatio: number;
  model130Applies: boolean;
  model130Reason: string;
  model130Estimated: number;
  projectedAnnualRevenue: number;
  projectedAnnualNetIncome: number;
  projectedAnnualPersonalIncomeTaxReserve: number;
  reta: RetaEstimate;
  projectedAnnualReta: number;
  pluriactivityRefund: number;
  cash: {
    collected: number;
    reservedVat: number;
    reservedIrpf: number;
    reservedReta: number;
    availableReal: number;
  };
};

export type PluriannualProjectionOptions = {
  startYear: number;
  years: number;
  annualRevenueGrowthPercent: number;
  annualExpenseGrowthPercent: number;
  employmentGrossAnnual: number;
  employmentSocialSecurityAnnual: number;
  employmentWithholdingAnnual: number;
  flatRateEndYear: number;
  flatRateMonthlyFee: number;
  slRevenueThreshold: number;
  slNetIncomeThreshold: number;
};

export type PluriannualProjectionYear = {
  year: number;
  annualRevenue: number;
  deductibleExpenses: number;
  autonomousNetBeforeReta: number;
  reta: RetaEstimate;
  annualReta: number;
  flatRateApplied: boolean;
  flatRateEnds: boolean;
  employmentGrossAnnual: number;
  employmentSocialSecurityAnnual: number;
  combinedTaxableIncome: number;
  estimatedIrpfTotal: number;
  professionalWithholding: number;
  employmentWithholding: number;
  model130Reserve: number;
  retainedIncomeRatio: number;
  model130Applies: boolean;
  pluriactivityRefund: number;
  netRealAnnual: number;
  slAnalysis: {
    recommendedReview: boolean;
    reasons: string[];
  };
  notes: string[];
};

export type PluriannualProjectionScenario = {
  id: "base" | "prudente" | "crecimiento";
  label: string;
  description: string;
  yearly: PluriannualProjectionYear[];
  totals: {
    revenue: number;
    expenses: number;
    reta: number;
    irpf: number;
    pluriactivityRefund: number;
    netReal: number;
  };
};

export type PluriannualProjection = {
  generatedAt: string;
  assumptions: PluriannualProjectionOptions;
  baseline: {
    annualRevenue: number;
    annualExpenses: number;
    retainedIncomeRatio: number;
    model130Reason: string;
  };
  scenarios: PluriannualProjectionScenario[];
};

export type FiscalBooks = {
  issuedInvoices: Invoice[];
  receivedInvoices: Expense[];
  investmentGoods: Expense[];
};

export type QuarterlyClosureStatus = "pending" | "prepared" | "filed";

export type TaxModelSummary = {
  model: "303" | "130" | "349";
  required: boolean;
  amount: number;
  reason: string;
  dueDate: string;
};

export type Model349Operation = {
  clientName: string;
  vatNumber: string;
  countryCode: string;
  taxableBase: number;
};

export type ClosureChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  blocking: boolean;
};

export type FiscalCalendarItem = {
  model: "303" | "130" | "349";
  label: string;
  dueDate: string;
  status: QuarterlyClosureStatus;
};

export type QuarterlyClosureSnapshot = {
  invoicesCount: number;
  expensesCount: number;
  revenueBase: number;
  outputVat: number;
  inputVat: number;
  deductibleExpenses: number;
  withholding: number;
  model303: TaxModelSummary;
  model130: TaxModelSummary;
  model349: TaxModelSummary;
  model349Operations: Model349Operation[];
  checklist: ClosureChecklistItem[];
  calendar: FiscalCalendarItem[];
  generatedAt: string;
};

export type QuarterlyClosure = {
  id: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  periodStart: string;
  periodEnd: string;
  status: QuarterlyClosureStatus;
  snapshot: QuarterlyClosureSnapshot;
  preparedAt?: Timestamp | null;
  filedAt?: Timestamp | null;
  notes?: string;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
};

export const DEFAULT_FISCAL_PROFILE: FiscalProfile = {
  legalName: "",
  tradeName: "ForMeta",
  taxId: "",
  address: "",
  postalCode: "",
  city: "",
  province: "",
  countryCode: "ES",
  email: "",
  phone: "",
  iban: "",
  invoiceSeries: "FM",
  defaultVatRate: 21,
  defaultWithholdingRate: 15,
  paymentTermsDays: 15,
  invoiceFooter: "",
  deductibleExpenseRate: 15,
  model130Mode: "auto",
  previousModel130PaidYtd: 0,
  retaMode: "manual",
  monthlyRetaFee: 315,
  retaContributionRate: 31.4,
  isPluriactive: false,
  employeeSocialSecurityContributionsYtd: 0,
  pluriactivityRefundThreshold: 17323.68,
  pluriactivityRefundCapRate: 50,
  updatedAt: null,
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: "software",
    label: "Software y suscripciones",
    defaultVatDeductible: true,
    defaultIrpfDeductible: true,
    defaultAffectionPercent: 100,
    riskHint: "",
  },
  {
    id: "professional_services",
    label: "Servicios profesionales",
    defaultVatDeductible: true,
    defaultIrpfDeductible: true,
    defaultAffectionPercent: 100,
    riskHint: "",
  },
  {
    id: "office",
    label: "Oficina y material",
    defaultVatDeductible: true,
    defaultIrpfDeductible: true,
    defaultAffectionPercent: 100,
    riskHint: "",
  },
  {
    id: "telecom",
    label: "Telefonía e internet",
    defaultVatDeductible: true,
    defaultIrpfDeductible: true,
    defaultAffectionPercent: 50,
    riskHint: "Revisa afectación si hay uso personal.",
  },
  {
    id: "travel",
    label: "Viajes profesionales",
    defaultVatDeductible: true,
    defaultIrpfDeductible: true,
    defaultAffectionPercent: 100,
    riskHint: "Conserva justificación del desplazamiento profesional.",
  },
  {
    id: "vehicle",
    label: "Vehículo",
    defaultVatDeductible: true,
    defaultIrpfDeductible: true,
    defaultAffectionPercent: 50,
    riskHint: "Categoría sensible: documenta afectación y uso profesional.",
  },
  {
    id: "meals",
    label: "Dietas y comidas",
    defaultVatDeductible: false,
    defaultIrpfDeductible: true,
    defaultAffectionPercent: 100,
    riskHint: "Categoría sensible: exige medio electrónico y vínculo profesional.",
  },
  {
    id: "training",
    label: "Formación",
    defaultVatDeductible: true,
    defaultIrpfDeductible: true,
    defaultAffectionPercent: 100,
    riskHint: "",
  },
  {
    id: "equipment",
    label: "Equipo y bienes",
    defaultVatDeductible: true,
    defaultIrpfDeductible: true,
    defaultAffectionPercent: 100,
    riskHint: "Si supera importe relevante, clasifícalo como bien de inversión.",
  },
  {
    id: "taxes",
    label: "Tributos y tasas",
    defaultVatDeductible: false,
    defaultIrpfDeductible: true,
    defaultAffectionPercent: 100,
    riskHint: "No todo tributo es deducible. Revisa el caso concreto.",
  },
  {
    id: "banking",
    label: "Banca y comisiones",
    defaultVatDeductible: false,
    defaultIrpfDeductible: true,
    defaultAffectionPercent: 100,
    riskHint: "",
  },
  {
    id: "other",
    label: "Otros",
    defaultVatDeductible: false,
    defaultIrpfDeductible: false,
    defaultAffectionPercent: 0,
    riskHint: "Clasificación pendiente de revisar.",
  },
];

const RETA_2026_TRAMOS: Array<{
  label: string;
  min: number;
  max: number | null;
  baseMin: number;
}> = [
  { label: "Reducida 1", min: Number.NEGATIVE_INFINITY, max: 670, baseMin: 653.59 },
  { label: "Reducida 2", min: 670, max: 900, baseMin: 718.95 },
  { label: "Reducida 3", min: 900, max: 1166.7, baseMin: 849.67 },
  { label: "General 1", min: 1166.7, max: 1300, baseMin: 950.98 },
  { label: "General 2", min: 1300, max: 1500, baseMin: 960.78 },
  { label: "General 3", min: 1500, max: 1700, baseMin: 960.78 },
  { label: "General 4", min: 1700, max: 1850, baseMin: 1143.79 },
  { label: "General 5", min: 1850, max: 2030, baseMin: 1209.15 },
  { label: "General 6", min: 2030, max: 2330, baseMin: 1274.51 },
  { label: "General 7", min: 2330, max: 2760, baseMin: 1356.21 },
  { label: "General 8", min: 2760, max: 3190, baseMin: 1437.91 },
  { label: "General 9", min: 3190, max: 3620, baseMin: 1519.61 },
  { label: "General 10", min: 3620, max: 4050, baseMin: 1601.31 },
  { label: "General 11", min: 4050, max: 6000, baseMin: 1732.03 },
  { label: "General 12", min: 6000, max: null, baseMin: 1928.1 },
];

const IRPF_PLANNING_BRACKETS_2026: Array<{
  limit: number;
  rate: number;
}> = [
  { limit: 12450, rate: 0.19 },
  { limit: 20200, rate: 0.24 },
  { limit: 35200, rate: 0.3 },
  { limit: 60000, rate: 0.37 },
  { limit: 300000, rate: 0.45 },
  { limit: Number.POSITIVE_INFINITY, rate: 0.47 },
];

const IRPF_PERSONAL_MINIMUM_PLANNING = 5550;

const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR",
  "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO",
  "SE", "SI", "SK",
]);

export function isEuCountry(countryCode: string): boolean {
  return EU_COUNTRIES.has(countryCode.trim().toUpperCase());
}

export function normalizeCountryCode(countryCode: string): string {
  return countryCode.trim().toUpperCase() || "ES";
}

export function fiscalCustomerKindLabel(kind: FiscalCustomerKind): string {
  switch (kind) {
    case "business": return "Empresa";
    case "self_employed": return "Autónomo";
    case "individual": return "Particular";
  }
}

export function invoiceRegimeLabel(regime: InvoiceRegime): string {
  switch (regime) {
    case "national": return "Nacional";
    case "eu_reverse_charge": return "UE · inversión sujeto pasivo";
    case "services_export": return "Exportación de servicios";
    case "private_es_eu": return "Particular español/UE";
  }
}

export function invoiceRegimeLegalNote(regime: InvoiceRegime): string {
  switch (regime) {
    case "national":
      return "Operación interior sujeta a IVA español.";
    case "eu_reverse_charge":
      return "Operación intracomunitaria B2B sin IVA por inversión del sujeto pasivo. Cliente con VAT validado en VIES.";
    case "services_export":
      return "Servicio prestado a cliente no establecido en la UE. Operación no sujeta a IVA español por reglas de localización.";
    case "private_es_eu":
      return "Servicio a particular español/UE sujeto a IVA español.";
  }
}

export function emptyClientTaxProfile(): ClientTaxProfile {
  return {
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
  };
}

export function determineInvoiceRegime(clientTax: ClientTaxProfile): InvoiceRegime {
  const countryCode = normalizeCountryCode(clientTax.countryCode);
  const isPrivate = clientTax.customerKind === "individual";

  if (countryCode === "ES") {
    return isPrivate ? "private_es_eu" : "national";
  }

  if (!isEuCountry(countryCode)) {
    return "services_export";
  }

  if (!isPrivate && clientTax.viesStatus === "valid") {
    return "eu_reverse_charge";
  }

  return "private_es_eu";
}

export function calculateInvoiceTotals(
  lines: InvoiceLine[],
  regime: InvoiceRegime,
  issuer: FiscalProfile,
  clientTax: ClientTaxProfile,
): { vatRate: number; withholdingRate: number; totals: InvoiceTotals } {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.taxableBase, 0));
  const vatRate = regime === "national" || regime === "private_es_eu"
    ? issuer.defaultVatRate
    : 0;
  const withholdingRate = regime === "national" && clientTax.customerKind !== "individual"
    ? issuer.defaultWithholdingRate
    : 0;
  const vat = roundMoney(subtotal * (vatRate / 100));
  const withholding = roundMoney(subtotal * (withholdingRate / 100));
  const total = roundMoney(subtotal + vat - withholding);

  return { vatRate, withholdingRate, totals: { subtotal, vat, withholding, total } };
}

export function calculateFiscalPaymentDashboard(
  invoices: Invoice[],
  profile: FiscalProfile,
  expenses: Expense[] = [],
  at = new Date(),
): FiscalPaymentDashboard {
  const period = getFiscalDashboardPeriod(at);
  const activeInvoices = invoices.filter((invoice) => invoice.status !== "cancelled");
  const ytdInvoices = activeInvoices.filter((invoice) => {
    const date = parseInvoiceDate(invoice.issueDate);
    return date.getFullYear() === period.year && date <= at;
  });
  const quarterInvoices = ytdInvoices.filter((invoice) => {
    const date = parseInvoiceDate(invoice.issueDate);
    return date >= parseInvoiceDate(period.quarterStart) && date <= parseInvoiceDate(period.quarterEnd);
  });
  const paidInvoices = ytdInvoices.filter((invoice) => invoice.paymentStatus === "paid");
  const activeExpenses = expenses;
  const ytdExpenses = activeExpenses.filter((expense) => {
    const date = parseInvoiceDate(expense.issueDate);
    return date.getFullYear() === period.year && date <= at;
  });
  const quarterExpenses = ytdExpenses.filter((expense) => {
    const date = parseInvoiceDate(expense.issueDate);
    return date >= parseInvoiceDate(period.quarterStart) && date <= parseInvoiceDate(period.quarterEnd);
  });

  const ytdRevenue = sumInvoices(ytdInvoices, (invoice) => invoice.totals.subtotal);
  const quarterRevenue = sumInvoices(quarterInvoices, (invoice) => invoice.totals.subtotal);
  const ytdVatIssued = sumInvoices(ytdInvoices, (invoice) => invoice.totals.vat);
  const ytdInputVatDeductible = sumExpenses(ytdExpenses, (expense) => expense.deductibleVat);
  const quarterInputVatDeductible = sumExpenses(quarterExpenses, (expense) => expense.deductibleVat);
  const quarterVatEstimated = Math.max(
    0,
    roundMoney(sumInvoices(quarterInvoices, (invoice) => invoice.totals.vat) - quarterInputVatDeductible),
  );
  const ytdVatCollected = sumInvoices(paidInvoices, (invoice) => invoice.totals.vat);
  const ytdWithholding = sumInvoices(ytdInvoices, (invoice) => invoice.totals.withholding);
  const ytdDeductibleExpenses = roundMoney(
    sumExpenses(ytdExpenses.filter((expense) => expense.kind === "current"), (expense) => expense.deductibleBase)
      + ytdExpenses
        .filter((expense) => expense.kind === "investment")
        .reduce((sum, expense) => sum + calculateInvestmentAmortizationForYear(expense, period.year), 0),
  );
  const retainedIncome = sumInvoices(ytdInvoices.filter((invoice) => invoice.totals.withholding > 0), (invoice) => invoice.totals.subtotal);
  const retainedIncomeRatio = ytdRevenue > 0 ? retainedIncome / ytdRevenue : 0;
  const model130Applies = resolveModel130Applies(profile, retainedIncomeRatio);
  const fallbackExpenseEstimate = roundMoney(ytdRevenue * (clampPercent(profile.deductibleExpenseRate) / 100));
  const expensesForIrpf = ytdDeductibleExpenses > 0 ? ytdDeductibleExpenses : fallbackExpenseEstimate;
  const estimatedNetYtd = roundMoney(Math.max(0, ytdRevenue - expensesForIrpf));
  const model130Raw = roundMoney(estimatedNetYtd * 0.2 - ytdWithholding - safeNumber(profile.previousModel130PaidYtd));
  const model130Estimated = model130Applies.applies ? Math.max(0, model130Raw) : 0;
  const projectedAnnualRevenue = period.elapsedMonths > 0
    ? roundMoney((ytdRevenue / period.elapsedMonths) * 12)
    : 0;
  const projectedAnnualExpenses = period.elapsedMonths > 0
    ? roundMoney((expensesForIrpf / period.elapsedMonths) * 12)
    : 0;
  const projectedAnnualNetIncome = roundMoney(Math.max(0, projectedAnnualRevenue - projectedAnnualExpenses));
  const projectedAnnualPersonalIncomeTaxReserve = roundMoney(Math.max(
    0,
    projectedAnnualNetIncome * 0.2 - ytdWithholding - safeNumber(profile.previousModel130PaidYtd),
  ));
  const reta = estimateReta(profile, projectedAnnualNetIncome);
  const projectedAnnualReta = roundMoney(reta.monthlyFee * 12);
  const pluriactivityRefund = estimatePluriactivityRefund(profile, projectedAnnualReta);
  const collected = sumInvoices(paidInvoices, (invoice) => invoice.paidAmount ?? invoice.totals.total);
  const reservedVat = Math.max(0, roundMoney(ytdVatCollected - ytdInputVatDeductible));
  const reservedIrpf = model130Estimated;
  const reservedReta = roundMoney(reta.monthlyFee * Math.min(12, at.getMonth() + 1));
  const availableReal = roundMoney(collected - reservedVat - reservedIrpf - reservedReta);

  return {
    period,
    quarterRevenue,
    quarterInputVatDeductible,
    quarterVatEstimated,
    ytdRevenue,
    ytdDeductibleExpenses,
    ytdVatIssued,
    ytdInputVatDeductible,
    ytdVatCollected,
    ytdWithholding,
    retainedIncomeRatio,
    model130Applies: model130Applies.applies,
    model130Reason: model130Applies.reason,
    model130Estimated,
    projectedAnnualRevenue,
    projectedAnnualNetIncome,
    projectedAnnualPersonalIncomeTaxReserve,
    reta,
    projectedAnnualReta,
    pluriactivityRefund,
    cash: {
      collected,
      reservedVat,
      reservedIrpf,
      reservedReta,
      availableReal,
    },
  };
}

export function calculatePluriannualProjection(
  invoices: Invoice[],
  expenses: Expense[],
  profile: FiscalProfile,
  options: Partial<PluriannualProjectionOptions> = {},
  at = new Date(),
): PluriannualProjection {
  const dashboard = calculateFiscalPaymentDashboard(invoices, profile, expenses, at);
  const startYear = options.startYear ?? at.getFullYear();
  const assumptions: PluriannualProjectionOptions = {
    startYear,
    years: Math.min(10, Math.max(1, Math.trunc(options.years ?? 5))),
    annualRevenueGrowthPercent: safeNumber(options.annualRevenueGrowthPercent ?? 8),
    annualExpenseGrowthPercent: safeNumber(options.annualExpenseGrowthPercent ?? 4),
    employmentGrossAnnual: safeNumber(options.employmentGrossAnnual),
    employmentSocialSecurityAnnual: safeNumber(
      options.employmentSocialSecurityAnnual ?? profile.employeeSocialSecurityContributionsYtd,
    ),
    employmentWithholdingAnnual: safeNumber(options.employmentWithholdingAnnual),
    flatRateEndYear: Math.trunc(safeNumber(options.flatRateEndYear)),
    flatRateMonthlyFee: safeNumber(options.flatRateMonthlyFee ?? 80),
    slRevenueThreshold: safeNumber(options.slRevenueThreshold ?? 80000),
    slNetIncomeThreshold: safeNumber(options.slNetIncomeThreshold ?? 50000),
  };
  const baselineRevenue = dashboard.projectedAnnualRevenue || sumInvoices(
    invoices.filter((invoice) => invoice.status !== "cancelled"),
    (invoice) => invoice.totals.subtotal,
  );
  const baselineExpenses = dashboard.projectedAnnualNetIncome > 0
    ? Math.max(0, dashboard.projectedAnnualRevenue - dashboard.projectedAnnualNetIncome)
    : roundMoney(baselineRevenue * (clampPercent(profile.deductibleExpenseRate) / 100));
  const retainedIncomeRatio = dashboard.retainedIncomeRatio || (profile.defaultWithholdingRate > 0 ? 1 : 0);

  const scenarioConfigs: Array<{
    id: PluriannualProjectionScenario["id"];
    label: string;
    description: string;
    revenueMultiplier: number;
    expenseMultiplier: number;
    growthOffset: number;
  }> = [
    {
      id: "base",
      label: "Base",
      description: "Mantiene la actividad actual anualizada y aplica el crecimiento indicado.",
      revenueMultiplier: 1,
      expenseMultiplier: 1,
      growthOffset: 0,
    },
    {
      id: "prudente",
      label: "Prudente",
      description: "Reduce ingresos iniciales un 15% y tensiona gastos un 5%.",
      revenueMultiplier: 0.85,
      expenseMultiplier: 1.05,
      growthOffset: -4,
    },
    {
      id: "crecimiento",
      label: "Crecimiento",
      description: "Sube ingresos iniciales un 20% y acelera crecimiento anual.",
      revenueMultiplier: 1.2,
      expenseMultiplier: 1.08,
      growthOffset: 6,
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    assumptions,
    baseline: {
      annualRevenue: roundMoney(baselineRevenue),
      annualExpenses: roundMoney(baselineExpenses),
      retainedIncomeRatio,
      model130Reason: dashboard.model130Reason,
    },
    scenarios: scenarioConfigs.map((config) => buildPluriannualScenario(
      config,
      assumptions,
      profile,
      baselineRevenue,
      baselineExpenses,
      retainedIncomeRatio,
    )),
  };
}

export function formatPercent(value: number): string {
  return (value * 100).toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + "%";
}

export function makeInvoiceLine(input: {
  description: string;
  project?: Project | null;
  quantity: number;
  unitPrice: number;
}): InvoiceLine {
  const quantity = Number.isFinite(input.quantity) ? input.quantity : 0;
  const unitPrice = Number.isFinite(input.unitPrice) ? input.unitPrice : 0;
  return {
    id: makeLocalId(),
    description: input.description.trim(),
    ...(input.project ? { projectId: input.project.id, projectName: input.project.name } : {}),
    quantity,
    unitPrice,
    taxableBase: roundMoney(quantity * unitPrice),
  };
}

export function defaultDueDate(issueDate: string, paymentTermsDays: number): string {
  const date = new Date(`${issueDate}T12:00:00`);
  date.setDate(date.getDate() + paymentTermsDays);
  return date.toISOString().slice(0, 10);
}

export function formatMoney(value: number): string {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
}

export function makeInvoiceNumber(series: string, year: number, sequence: number): string {
  return `${series.trim().toUpperCase() || "FM"}-${year}-${String(sequence).padStart(4, "0")}`;
}

export function expenseCategoryLabel(categoryId: ExpenseCategoryId): string {
  return EXPENSE_CATEGORIES.find((category) => category.id === categoryId)?.label ?? "Otros";
}

export function makeEmptyExpenseInput(issueDate = new Date().toISOString().slice(0, 10)): ExpenseInput {
  const category = EXPENSE_CATEGORIES[0];
  return {
    supplierName: "",
    supplierTaxId: "",
    invoiceNumber: "",
    issueDate,
    categoryId: category.id,
    description: "",
    kind: "current",
    documentType: "complete_invoice",
    countryCode: "ES",
    base: 0,
    vatRate: 21,
    affectionPercent: category.defaultAffectionPercent,
    irpfDeductible: category.defaultIrpfDeductible,
    vatDeductible: category.defaultVatDeductible,
    isPaid: true,
  };
}

export function applyExpenseCategoryDefaults(
  input: ExpenseInput,
  categoryId: ExpenseCategoryId,
): ExpenseInput {
  const category = EXPENSE_CATEGORIES.find((item) => item.id === categoryId) ?? EXPENSE_CATEGORIES[0];
  return {
    ...input,
    categoryId,
    affectionPercent: category.defaultAffectionPercent,
    irpfDeductible: category.defaultIrpfDeductible,
    vatDeductible: category.defaultVatDeductible,
    kind: categoryId === "equipment" ? input.kind : "current",
  };
}

export function normalizeExpenseInput(input: ExpenseInput): Expense {
  const base = roundMoney(Math.max(0, safeNumber(input.base)));
  const vatRate = Math.max(0, safeNumber(input.vatRate));
  const affectionPercent = clampPercent(input.affectionPercent);
  const vatAmount = roundMoney(base * (vatRate / 100));
  const fullInvoice = input.documentType === "complete_invoice";
  const vatDeductible = input.vatDeductible && fullInvoice;
  const deductibleVat = vatDeductible
    ? roundMoney(vatAmount * (affectionPercent / 100))
    : 0;
  const deductibleBase = input.irpfDeductible
    ? roundMoney(base * (affectionPercent / 100))
    : 0;
  const normalized: Expense = {
    ...input,
    id: "",
    supplierName: input.supplierName.trim(),
    supplierTaxId: input.supplierTaxId.trim().toUpperCase(),
    invoiceNumber: input.invoiceNumber.trim(),
    description: input.description.trim(),
    countryCode: normalizeCountryCode(input.countryCode),
    base,
    vatRate,
    affectionPercent,
    vatDeductible,
    vatAmount,
    total: roundMoney(base + vatAmount),
    deductibleBase,
    deductibleVat,
    alerts: [],
    createdAt: null,
  };
  return { ...normalized, alerts: getExpenseAlerts(normalized) };
}

export function getExpenseAlerts(expense: Expense): string[] {
  const alerts: string[] = [];
  const category = EXPENSE_CATEGORIES.find((item) => item.id === expense.categoryId);

  if (!expense.supplierName.trim()) alerts.push("Falta proveedor.");
  if (expense.documentType !== "complete_invoice" && expense.vatDeductible) {
    alerts.push("El IVA solo debería deducirse con factura completa.");
  }
  if (expense.documentType !== "complete_invoice" && expense.deductibleVat > 0) {
    alerts.push("IVA deducible bloqueado: no consta factura completa.");
  }
  if (expense.vatDeductible && (!expense.supplierTaxId || !expense.invoiceNumber)) {
    alerts.push("Factura completa incompleta: falta NIF del proveedor o número de factura.");
  }
  if (expense.affectionPercent <= 0 && (expense.irpfDeductible || expense.vatDeductible)) {
    alerts.push("Gasto marcado deducible con afectación 0%.");
  }
  if (expense.categoryId === "vehicle" || expense.categoryId === "meals" || expense.categoryId === "other") {
    alerts.push(category?.riskHint || "Clasificación sensible pendiente de revisar.");
  } else if (category?.riskHint) {
    alerts.push(category.riskHint);
  }
  if (expense.kind === "investment" && !expense.investment) {
    alerts.push("Bien de inversión sin plan de amortización.");
  }
  if (expense.kind === "current" && expense.categoryId === "equipment" && expense.base >= 300) {
    alerts.push("Equipo de importe relevante: valora clasificar como bien de inversión.");
  }

  return alerts;
}

export function calculateInvestmentAmortizationForYear(expense: Expense, year: number): number {
  if (expense.kind !== "investment" || !expense.investment || !expense.irpfDeductible) return 0;
  const start = parseInvoiceDate(expense.investment.startUseDate || expense.issueDate);
  const endYear = start.getFullYear() + Math.max(1, expense.investment.usefulLifeYears) - 1;
  if (year < start.getFullYear() || year > endYear) return 0;
  const annualRate = clampPercent(expense.investment.annualAmortizationRate) / 100;
  const annual = roundMoney(expense.deductibleBase * annualRate);
  if (year !== start.getFullYear()) return annual;
  const months = 12 - start.getMonth();
  return roundMoney(annual * (months / 12));
}

export function buildFiscalBooks(invoices: Invoice[], expenses: Expense[]): FiscalBooks {
  return {
    issuedInvoices: invoices
      .filter((invoice) => invoice.status !== "cancelled")
      .sort((a, b) => a.issueDate.localeCompare(b.issueDate) || a.number.localeCompare(b.number)),
    receivedInvoices: expenses
      .filter((expense) => expense.documentType === "complete_invoice")
      .sort((a, b) => a.issueDate.localeCompare(b.issueDate) || a.invoiceNumber.localeCompare(b.invoiceNumber)),
    investmentGoods: expenses
      .filter((expense) => expense.kind === "investment")
      .sort((a, b) => a.issueDate.localeCompare(b.issueDate)),
  };
}

export function calculateQuarterlyClosure(
  invoices: Invoice[],
  expenses: Expense[],
  profile: FiscalProfile,
  year: number,
  quarter: 1 | 2 | 3 | 4,
  existingStatus: QuarterlyClosureStatus = "pending",
): QuarterlyClosure {
  const period = getQuarterPeriod(year, quarter);
  const periodInvoices = invoices.filter((invoice) => {
    const date = parseInvoiceDate(invoice.issueDate);
    return invoice.status !== "cancelled"
      && date >= parseInvoiceDate(period.start)
      && date <= parseInvoiceDate(period.end);
  });
  const periodExpenses = expenses.filter((expense) => {
    const date = parseInvoiceDate(expense.issueDate);
    return date >= parseInvoiceDate(period.start) && date <= parseInvoiceDate(period.end);
  });

  const revenueBase = sumInvoices(periodInvoices, (invoice) => invoice.totals.subtotal);
  const outputVat = sumInvoices(periodInvoices, (invoice) => invoice.totals.vat);
  const inputVat = sumExpenses(periodExpenses, (expense) => expense.deductibleVat);
  const deductibleExpenses = roundMoney(
    sumExpenses(periodExpenses.filter((expense) => expense.kind === "current"), (expense) => expense.deductibleBase)
      + periodExpenses
        .filter((expense) => expense.kind === "investment")
        .reduce((sum, expense) => sum + calculateInvestmentAmortizationForYear(expense, year) / 4, 0),
  );
  const withholding = sumInvoices(periodInvoices, (invoice) => invoice.totals.withholding);
  const retainedIncome = sumInvoices(periodInvoices.filter((invoice) => invoice.totals.withholding > 0), (invoice) => invoice.totals.subtotal);
  const retainedIncomeRatio = revenueBase > 0 ? retainedIncome / revenueBase : 0;
  const model130Applies = resolveModel130Applies(profile, retainedIncomeRatio);
  const model303Amount = roundMoney(outputVat - inputVat);
  const netIncome = Math.max(0, roundMoney(revenueBase - deductibleExpenses));
  const model130Amount = model130Applies.applies
    ? Math.max(0, roundMoney(netIncome * 0.2 - withholding))
    : 0;
  const model349Operations = buildModel349Operations(periodInvoices);
  const dueDate = getQuarterDueDate(year, quarter);
  const checklist = buildClosureChecklist(periodInvoices, periodExpenses, model349Operations, profile, model130Applies.applies);
  const calendar: FiscalCalendarItem[] = [
    { model: "303", label: "Modelo 303 IVA", dueDate, status: existingStatus },
    { model: "130", label: "Modelo 130 IRPF", dueDate, status: model130Applies.applies ? existingStatus : "filed" },
    { model: "349", label: "Modelo 349 intracomunitarias", dueDate, status: model349Operations.length > 0 ? existingStatus : "filed" },
  ];

  return {
    id: quarterlyClosureId(year, quarter),
    year,
    quarter,
    periodStart: period.start,
    periodEnd: period.end,
    status: existingStatus,
    snapshot: {
      invoicesCount: periodInvoices.length,
      expensesCount: periodExpenses.length,
      revenueBase,
      outputVat,
      inputVat,
      deductibleExpenses,
      withholding,
      model303: {
        model: "303",
        required: true,
        amount: model303Amount,
        reason: "IVA devengado menos IVA soportado deducible del trimestre.",
        dueDate,
      },
      model130: {
        model: "130",
        required: model130Applies.applies,
        amount: model130Amount,
        reason: model130Applies.reason,
        dueDate,
      },
      model349: {
        model: "349",
        required: model349Operations.length > 0,
        amount: model349Operations.reduce((sum, operation) => roundMoney(sum + operation.taxableBase), 0),
        reason: model349Operations.length > 0
          ? "Hay operaciones intracomunitarias B2B con inversión del sujeto pasivo."
          : "Sin operaciones intracomunitarias declarables en el trimestre.",
        dueDate,
      },
      model349Operations,
      checklist,
      calendar,
      generatedAt: new Date().toISOString(),
    },
    createdAt: null,
  };
}

export function getCurrentQuarterClosure(
  invoices: Invoice[],
  expenses: Expense[],
  profile: FiscalProfile,
  at = new Date(),
): QuarterlyClosure {
  const quarter = (Math.floor(at.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  return calculateQuarterlyClosure(invoices, expenses, profile, at.getFullYear(), quarter);
}

export function exportClosureForGestoria(closure: QuarterlyClosure): Blob {
  const rows = [
    ["FORmeta cierre trimestral"],
    [`Ejercicio`, String(closure.year)],
    [`Trimestre`, `T${closure.quarter}`],
    [`Periodo`, `${closure.periodStart} / ${closure.periodEnd}`],
    [`Estado`, closure.status],
    [],
    ["Modelo", "Obligatorio", "Importe/Base", "Vencimiento", "Motivo"],
    ...[closure.snapshot.model303, closure.snapshot.model130, closure.snapshot.model349].map((model) => [
      model.model,
      model.required ? "Sí" : "No",
      model.amount.toFixed(2),
      model.dueDate,
      model.reason,
    ]),
    [],
    ["Resumen"],
    ["Facturas emitidas", String(closure.snapshot.invoicesCount)],
    ["Facturas recibidas/gastos", String(closure.snapshot.expensesCount)],
    ["Base ingresos", closure.snapshot.revenueBase.toFixed(2)],
    ["IVA repercutido", closure.snapshot.outputVat.toFixed(2)],
    ["IVA soportado deducible", closure.snapshot.inputVat.toFixed(2)],
    ["Gastos deducibles", closure.snapshot.deductibleExpenses.toFixed(2)],
    ["Retenciones", closure.snapshot.withholding.toFixed(2)],
    [],
    ["Operaciones 349"],
    ["Cliente", "VAT", "País", "Base"],
    ...closure.snapshot.model349Operations.map((operation) => [
      operation.clientName,
      operation.vatNumber,
      operation.countryCode,
      operation.taxableBase.toFixed(2),
    ]),
    [],
    ["Checklist"],
    ["Hecho", "Bloqueante", "Tarea"],
    ...closure.snapshot.checklist.map((item) => [
      item.done ? "Sí" : "No",
      item.blocking ? "Sí" : "No",
      item.label,
    ]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
}

export function downloadClosureExport(closure: QuarterlyClosure): void {
  const blob = exportClosureForGestoria(closure);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cierre-${closure.year}-T${closure.quarter}-gestoria.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function subscribeFiscalProfile(callback: (profile: FiscalProfile) => void): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(doc(db, "fiscalProfiles", "default"), (snap) => {
    callback({ ...DEFAULT_FISCAL_PROFILE, ...(snap.data() as Partial<FiscalProfile> | undefined) });
  });
}

export async function saveFiscalProfile(profile: FiscalProfile): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await setDoc(doc(db, "fiscalProfiles", "default"), {
    ...profile,
    countryCode: normalizeCountryCode(profile.countryCode),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await appendFiscalEvent({
    type: "fiscal_profile_saved",
    entityType: "profile",
    entityId: "default",
    payload: {
      legalName: profile.legalName,
      taxId: profile.taxId,
      invoiceSeries: profile.invoiceSeries,
      defaultVatRate: profile.defaultVatRate,
      defaultWithholdingRate: profile.defaultWithholdingRate,
      deductibleExpenseRate: profile.deductibleExpenseRate,
      model130Mode: profile.model130Mode,
      previousModel130PaidYtd: profile.previousModel130PaidYtd,
      retaMode: profile.retaMode,
      monthlyRetaFee: profile.monthlyRetaFee,
      retaContributionRate: profile.retaContributionRate,
      isPluriactive: profile.isPluriactive,
    },
  });
}

export function subscribeInvoices(callback: (invoices: Invoice[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"), limit(80));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Invoice, "id">) })));
  });
}

export function subscribeExpenses(callback: (expenses: Expense[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, "expenses"), orderBy("issueDate", "desc"), limit(160));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Expense, "id">) })));
  });
}

export function subscribeRecurringExpenses(callback: (expenses: RecurringExpense[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, "recurringExpenses"), orderBy("nextIssueDate", "asc"), limit(80));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RecurringExpense, "id">) })));
  });
}

export function subscribeQuarterlyClosures(callback: (closures: QuarterlyClosure[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, "quarterlyClosures"), orderBy("year", "desc"), orderBy("quarter", "desc"), limit(12));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<QuarterlyClosure, "id">) })));
  });
}

export function subscribeFiscalEvents(callback: (events: FiscalEvent[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, "fiscalEvents"), orderBy("createdAt", "desc"), limit(40));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FiscalEvent, "id">) })));
  });
}

export async function issueInvoice(input: {
  issuer: FiscalProfile;
  client: Client;
  issueDate: string;
  dueDate: string;
  lines: InvoiceLine[];
  notes: string;
}): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  if (!input.issuer.legalName.trim() || !input.issuer.taxId.trim()) {
    throw new Error("Completa el perfil fiscal del autónomo antes de emitir.");
  }
  if (!input.client.tax?.fiscalName?.trim() && !input.client.name.trim()) {
    throw new Error("El cliente necesita nombre fiscal.");
  }
  if (input.lines.length === 0 || input.lines.some((line) => !line.description.trim() || line.taxableBase <= 0)) {
    throw new Error("Añade al menos una línea facturable válida.");
  }

  const actor = getActor();
  const regime = determineInvoiceRegime(input.client.tax);
  const calc = calculateInvoiceTotals(input.lines, regime, input.issuer, input.client.tax);
  const year = new Date(`${input.issueDate}T12:00:00`).getFullYear();
  const invoiceRef = doc(collection(db, "invoices"));
  const eventRef = doc(collection(db, "fiscalEvents"));
  const ledgerRef = doc(collection(db, "fiscalLedger"));
  const invoiceCounterRef = doc(db, "fiscalCounters", `invoices-${year}`);
  const ledgerCounterRef = doc(db, "fiscalCounters", "ledger");

  await runTransaction(db, async (transaction) => {
    const invoiceCounter = await transaction.get(invoiceCounterRef);
    const ledgerCounter = await transaction.get(ledgerCounterRef);
    const nextInvoiceSequence = ((invoiceCounter.data()?.lastSequence as number | undefined) ?? 0) + 1;
    const nextLedgerSequence = ((ledgerCounter.data()?.lastSequence as number | undefined) ?? 0) + 1;
    const previousHash = (ledgerCounter.data()?.lastHash as string | undefined) ?? "GENESIS";
    const number = makeInvoiceNumber(input.issuer.invoiceSeries, year, nextInvoiceSequence);
    const projectIds = Array.from(new Set(input.lines.map((line) => line.projectId).filter(Boolean))) as string[];

    const payload = {
      invoiceId: invoiceRef.id,
      invoiceNumber: number,
      status: "issued",
      clientId: input.client.id,
      clientName: input.client.name,
      issueDate: input.issueDate,
      totals: calc.totals,
      regime,
      lines: input.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxableBase: line.taxableBase,
        projectId: line.projectId ?? null,
      })),
    };
    const hash = await sha256(stableStringify({
      sequence: nextLedgerSequence,
      previousHash,
      type: "invoice_issued",
      payload,
    }));

    const invoice: Omit<Invoice, "id"> = {
      number,
      series: input.issuer.invoiceSeries.trim().toUpperCase() || "FM",
      sequence: nextInvoiceSequence,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      status: "issued",
      paymentStatus: "pending",
      paidAt: null,
      paidAmount: 0,
      issuer: sanitizeFiscalProfile(input.issuer),
      client: {
        id: input.client.id,
        name: input.client.name,
        email: input.client.email,
        tax: input.client.tax,
      },
      regime,
      regimeLabel: invoiceRegimeLabel(regime),
      vatRate: calc.vatRate,
      withholdingRate: calc.withholdingRate,
      lines: input.lines,
      totals: calc.totals,
      notes: input.notes.trim(),
      legalNote: invoiceRegimeLegalNote(regime),
      projectIds,
      ledgerHash: hash,
      previousLedgerHash: previousHash,
      createdAt: null,
      createdByUid: actor.uid,
      createdByName: actor.name,
    };

    transaction.set(invoiceRef, { ...invoice, createdAt: serverTimestamp() });
    transaction.set(eventRef, {
      type: "invoice_issued",
      actorUid: actor.uid,
      actorName: actor.name,
      invoiceId: invoiceRef.id,
      invoiceNumber: number,
      clientId: input.client.id,
      clientName: input.client.name,
      payload,
      createdAt: serverTimestamp(),
    });
    transaction.set(ledgerRef, {
      sequence: nextLedgerSequence,
      type: "invoice_issued",
      entityType: "invoice",
      entityId: invoiceRef.id,
      hash,
      previousHash,
      payload,
      createdAt: serverTimestamp(),
      actorUid: actor.uid,
      actorName: actor.name,
    });
    transaction.set(invoiceCounterRef, {
      year,
      lastSequence: nextInvoiceSequence,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    transaction.set(ledgerCounterRef, {
      lastSequence: nextLedgerSequence,
      lastHash: hash,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  return invoiceRef.id;
}

export async function cancelInvoice(invoice: Invoice, reason: string): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  if (invoice.status === "cancelled") return;
  const actor = getActor();
  const invoiceRef = doc(db, "invoices", invoice.id);
  const eventRef = doc(collection(db, "fiscalEvents"));
  const ledgerRef = doc(collection(db, "fiscalLedger"));
  const ledgerCounterRef = doc(db, "fiscalCounters", "ledger");

  await runTransaction(db, async (transaction) => {
    const currentInvoice = await transaction.get(invoiceRef);
    if (!currentInvoice.exists()) throw new Error("Factura no encontrada");
    if ((currentInvoice.data().status as InvoiceStatus) === "cancelled") return;

    const ledgerCounter = await transaction.get(ledgerCounterRef);
    const nextLedgerSequence = ((ledgerCounter.data()?.lastSequence as number | undefined) ?? 0) + 1;
    const previousHash = (ledgerCounter.data()?.lastHash as string | undefined) ?? "GENESIS";
    const payload = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      status: "cancelled",
      reason: reason.trim(),
      previousInvoiceHash: invoice.ledgerHash,
    };
    const hash = await sha256(stableStringify({
      sequence: nextLedgerSequence,
      previousHash,
      type: "invoice_cancelled",
      payload,
    }));

    transaction.update(invoiceRef, {
      status: "cancelled",
      cancelledAt: serverTimestamp(),
      cancellationReason: reason.trim(),
    });
    transaction.set(eventRef, {
      type: "invoice_cancelled",
      actorUid: actor.uid,
      actorName: actor.name,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      clientId: invoice.client.id,
      clientName: invoice.client.name,
      payload,
      createdAt: serverTimestamp(),
    });
    transaction.set(ledgerRef, {
      sequence: nextLedgerSequence,
      type: "invoice_cancelled",
      entityType: "invoice",
      entityId: invoice.id,
      hash,
      previousHash,
      payload,
      createdAt: serverTimestamp(),
      actorUid: actor.uid,
      actorName: actor.name,
    });
    transaction.set(ledgerCounterRef, {
      lastSequence: nextLedgerSequence,
      lastHash: hash,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}

export async function markInvoicePayment(
  invoice: Invoice,
  paymentStatus: InvoicePaymentStatus,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  if (invoice.status === "cancelled") {
    throw new Error("Una factura anulada no puede marcarse como cobrada.");
  }

  const paid = paymentStatus === "paid";
  await updateDoc(doc(db, "invoices", invoice.id), {
    paymentStatus,
    paidAt: paid ? serverTimestamp() : null,
    paidAmount: paid ? invoice.totals.total : 0,
  });
  await appendFiscalEvent({
    type: paid ? "invoice_marked_paid" : "invoice_marked_pending",
    entityType: "invoice",
    entityId: invoice.id,
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    clientId: invoice.client.id,
    clientName: invoice.client.name,
    payload: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      paymentStatus,
      paidAmount: paid ? invoice.totals.total : 0,
    },
  });
}

export async function createExpense(input: ExpenseInput): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const expense = normalizeExpenseInput(input);
  const payload = expensePayload(expense);
  const ref = await addDoc(collection(db, "expenses"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await appendFiscalEvent({
    type: "expense_created",
    entityType: "expense",
    entityId: ref.id,
    payload: {
      supplierName: expense.supplierName,
      invoiceNumber: expense.invoiceNumber,
      issueDate: expense.issueDate,
      categoryId: expense.categoryId,
      kind: expense.kind,
      base: expense.base,
      deductibleBase: expense.deductibleBase,
      deductibleVat: expense.deductibleVat,
      alerts: expense.alerts,
    },
  });
  return ref.id;
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  const expense = normalizeExpenseInput(input);
  const payload = expensePayload(expense);
  await updateDoc(doc(db, "expenses", id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
  await appendFiscalEvent({
    type: "expense_updated",
    entityType: "expense",
    entityId: id,
    payload: {
      supplierName: expense.supplierName,
      invoiceNumber: expense.invoiceNumber,
      issueDate: expense.issueDate,
      categoryId: expense.categoryId,
      kind: expense.kind,
      base: expense.base,
      deductibleBase: expense.deductibleBase,
      deductibleVat: expense.deductibleVat,
      alerts: expense.alerts,
    },
  });
}

export async function createRecurringExpense(input: RecurringExpenseInput): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const ref = await addDoc(collection(db, "recurringExpenses"), {
    ...input,
    countryCode: normalizeCountryCode(input.countryCode),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await appendFiscalEvent({
    type: "recurring_expense_created",
    entityType: "recurringExpense",
    entityId: ref.id,
    payload: {
      name: input.name,
      supplierName: input.supplierName,
      interval: input.interval,
      nextIssueDate: input.nextIssueDate,
      base: input.base,
      vatRate: input.vatRate,
    },
  });
  return ref.id;
}

export async function createExpenseFromRecurring(recurring: RecurringExpense): Promise<string> {
  const id = await createExpense({
    supplierName: recurring.supplierName,
    supplierTaxId: recurring.supplierTaxId,
    invoiceNumber: "",
    issueDate: recurring.nextIssueDate,
    categoryId: recurring.categoryId,
    description: recurring.description || recurring.name,
    kind: recurring.kind,
    documentType: recurring.documentType,
    countryCode: recurring.countryCode,
    base: recurring.base,
    vatRate: recurring.vatRate,
    affectionPercent: recurring.affectionPercent,
    irpfDeductible: recurring.irpfDeductible,
    vatDeductible: recurring.vatDeductible,
    isPaid: false,
    recurringId: recurring.id,
  });
  if (db) {
    await updateDoc(doc(db, "recurringExpenses", recurring.id), {
      nextIssueDate: nextRecurringDate(recurring.nextIssueDate, recurring.interval),
      updatedAt: serverTimestamp(),
    });
  }
  return id;
}

export async function saveQuarterlyClosure(
  closure: QuarterlyClosure,
  status: QuarterlyClosureStatus,
  notes = "",
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  const ref = doc(db, "quarterlyClosures", closure.id);
  const nowFields = status === "filed"
    ? { filedAt: serverTimestamp() }
    : { preparedAt: serverTimestamp() };
  await setDoc(ref, {
    ...closure,
    status,
    notes: notes.trim(),
    ...nowFields,
    createdAt: closure.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await appendFiscalEvent({
    type: status === "filed" ? "quarterly_closure_presented" : "quarterly_closure_prepared",
    entityType: "quarterlyClosure",
    entityId: closure.id,
    payload: {
      year: closure.year,
      quarter: closure.quarter,
      status,
      model303: closure.snapshot.model303.amount,
      model130: closure.snapshot.model130.amount,
      model349Required: closure.snapshot.model349.required,
    },
  });
}

export async function appendFiscalEvent(input: {
  type: FiscalEventType;
  entityType: FiscalLedgerEntry["entityType"];
  entityId: string;
  clientId?: string;
  clientName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  if (!db) return;
  const actor = getActor();
  const eventRef = doc(collection(db, "fiscalEvents"));
  const ledgerRef = doc(collection(db, "fiscalLedger"));
  const ledgerCounterRef = doc(db, "fiscalCounters", "ledger");

  await runTransaction(db, async (transaction) => {
    const ledgerCounter = await transaction.get(ledgerCounterRef);
    const nextLedgerSequence = ((ledgerCounter.data()?.lastSequence as number | undefined) ?? 0) + 1;
    const previousHash = (ledgerCounter.data()?.lastHash as string | undefined) ?? "GENESIS";
    const hash = await sha256(stableStringify({
      sequence: nextLedgerSequence,
      previousHash,
      type: input.type,
      payload: input.payload,
    }));

    transaction.set(eventRef, {
      type: input.type,
      actorUid: actor.uid,
      actorName: actor.name,
      ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
      ...(input.invoiceNumber ? { invoiceNumber: input.invoiceNumber } : {}),
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.clientName ? { clientName: input.clientName } : {}),
      payload: input.payload,
      createdAt: serverTimestamp(),
    });
    transaction.set(ledgerRef, {
      sequence: nextLedgerSequence,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      hash,
      previousHash,
      payload: input.payload,
      createdAt: serverTimestamp(),
      actorUid: actor.uid,
      actorName: actor.name,
    });
    transaction.set(ledgerCounterRef, {
      lastSequence: nextLedgerSequence,
      lastHash: hash,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, "invoices", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Invoice, "id">) };
}

export function buildInvoicePdf(invoice: Invoice): Blob {
  const lines = [
    `FACTURA ${invoice.number}`,
    `Fecha: ${formatDate(invoice.issueDate)}    Vencimiento: ${formatDate(invoice.dueDate)}`,
    "",
    "Emisor",
    `${invoice.issuer.legalName} (${invoice.issuer.taxId})`,
    `${invoice.issuer.address}`,
    `${invoice.issuer.postalCode} ${invoice.issuer.city} ${invoice.issuer.province}`,
    invoice.issuer.email,
    "",
    "Cliente",
    `${invoice.client.tax.fiscalName || invoice.client.name} (${invoice.client.tax.taxId || invoice.client.tax.vatNumber || "NIF/VAT no indicado"})`,
    invoice.client.tax.fiscalAddress,
    `${invoice.client.tax.postalCode || ""} ${invoice.client.tax.city || ""} ${invoice.client.tax.province || ""}`.trim(),
    `Regimen: ${invoice.regimeLabel}`,
    "",
    "Conceptos",
    ...invoice.lines.flatMap((line) => [
      `${line.description}`,
      `  ${line.quantity.toLocaleString("es-ES")} x ${formatMoney(line.unitPrice)} = ${formatMoney(line.taxableBase)}`,
    ]),
    "",
    `Base imponible: ${formatMoney(invoice.totals.subtotal)}`,
    `IVA (${invoice.vatRate}%): ${formatMoney(invoice.totals.vat)}`,
    `Retencion (${invoice.withholdingRate}%): -${formatMoney(invoice.totals.withholding)}`,
    `TOTAL: ${formatMoney(invoice.totals.total)}`,
    "",
    invoice.legalNote,
    invoice.notes,
    invoice.issuer.invoiceFooter,
    "",
    `Hash ledger: ${invoice.ledgerHash}`,
    `Hash anterior: ${invoice.previousLedgerHash}`,
    invoice.status === "cancelled" ? `ANULADA: ${invoice.cancellationReason ?? ""}` : "",
  ].filter((line) => line !== undefined);

  return makeSimplePdf(lines);
}

export function downloadInvoicePdf(invoice: Invoice): void {
  const blob = buildInvoicePdf(invoice);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.number}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getFiscalDashboardPeriod(at: Date): FiscalDashboardPeriod {
  const year = at.getFullYear();
  const quarter = (Math.floor(at.getMonth() / 3) + 1) as FiscalDashboardPeriod["quarter"];
  const quarterStartMonth = (quarter - 1) * 3;
  const quarterEndMonth = quarterStartMonth + 2;
  const quarterStart = new Date(year, quarterStartMonth, 1, 12);
  const quarterEnd = new Date(year, quarterEndMonth + 1, 0, 12);

  return {
    year,
    quarter,
    quarterStart: quarterStart.toISOString().slice(0, 10),
    quarterEnd: quarterEnd.toISOString().slice(0, 10),
    elapsedMonths: at.getMonth() + 1,
  };
}

function getQuarterPeriod(year: number, quarter: 1 | 2 | 3 | 4): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1, 12);
  const end = new Date(year, startMonth + 3, 0, 12);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function getQuarterDueDate(year: number, quarter: 1 | 2 | 3 | 4): string {
  const dueYear = quarter === 4 ? year + 1 : year;
  const dueMonth = quarter === 1 ? 3 : quarter === 2 ? 6 : quarter === 3 ? 9 : 0;
  const dueDay = quarter === 4 ? 30 : 20;
  return new Date(dueYear, dueMonth, dueDay, 12).toISOString().slice(0, 10);
}

function quarterlyClosureId(year: number, quarter: 1 | 2 | 3 | 4): string {
  return `${year}-Q${quarter}`;
}

function buildModel349Operations(invoices: Invoice[]): Model349Operation[] {
  const grouped = new Map<string, Model349Operation>();
  invoices
    .filter((invoice) => invoice.regime === "eu_reverse_charge")
    .forEach((invoice) => {
      const countryCode = normalizeCountryCode(invoice.client.tax.countryCode);
      const vatNumber = invoice.client.tax.vatNumber || invoice.client.tax.taxId || "";
      const key = `${countryCode}-${vatNumber}-${invoice.client.name}`;
      const current = grouped.get(key) ?? {
        clientName: invoice.client.name,
        vatNumber,
        countryCode,
        taxableBase: 0,
      };
      current.taxableBase = roundMoney(current.taxableBase + invoice.totals.subtotal);
      grouped.set(key, current);
    });
  return Array.from(grouped.values()).sort((a, b) => a.clientName.localeCompare(b.clientName));
}

function buildClosureChecklist(
  invoices: Invoice[],
  expenses: Expense[],
  model349Operations: Model349Operation[],
  profile: FiscalProfile,
  model130Required: boolean,
): ClosureChecklistItem[] {
  const expenseAlerts = expenses.reduce((sum, expense) => sum + expense.alerts.length, 0);
  const invoicesWithoutPaymentState = invoices.filter((invoice) => !invoice.paymentStatus).length;
  const incompleteReceivedInvoices = expenses.filter((expense) =>
    expense.documentType === "complete_invoice" && (!expense.supplierTaxId || !expense.invoiceNumber),
  ).length;
  const missingVat = model349Operations.filter((operation) => !operation.vatNumber).length;

  return [
    {
      id: "profile",
      label: "Perfil fiscal del autónomo revisado",
      done: Boolean(profile.legalName && profile.taxId),
      blocking: true,
    },
    {
      id: "issued",
      label: "Libro de facturas emitidas revisado",
      done: invoices.length > 0 || expenses.length > 0,
      blocking: false,
    },
    {
      id: "received",
      label: "Facturas recibidas con número y NIF de proveedor",
      done: incompleteReceivedInvoices === 0,
      blocking: incompleteReceivedInvoices > 0,
    },
    {
      id: "expense-alerts",
      label: "Gastos sensibles o mal clasificados revisados",
      done: expenseAlerts === 0,
      blocking: expenseAlerts > 0,
    },
    {
      id: "payments",
      label: "Estado de cobro de facturas actualizado",
      done: invoicesWithoutPaymentState === 0,
      blocking: false,
    },
    {
      id: "model130",
      label: model130Required ? "Modelo 130 preparado" : "Modelo 130 no obligatorio documentado",
      done: true,
      blocking: false,
    },
    {
      id: "model349",
      label: model349Operations.length > 0 ? "VAT UE de clientes intracomunitarios revisado" : "Sin operaciones UE para 349",
      done: missingVat === 0,
      blocking: missingVat > 0,
    },
  ];
}

function resolveModel130Applies(
  profile: FiscalProfile,
  retainedIncomeRatio: number,
): { applies: boolean; reason: string } {
  if (profile.model130Mode === "applies") {
    return { applies: true, reason: "Forzado en perfil fiscal" };
  }
  if (profile.model130Mode === "exempt") {
    return { applies: false, reason: "Marcado como exento en perfil fiscal" };
  }
  if (retainedIncomeRatio >= 0.7) {
    return { applies: false, reason: "Al menos el 70% de ingresos profesionales lleva retención" };
  }
  return { applies: true, reason: "Menos del 70% de ingresos lleva retención" };
}

function estimateReta(profile: FiscalProfile, projectedAnnualNetIncome: number): RetaEstimate {
  const monthlyNetIncome = projectedAnnualNetIncome / 12;
  if (profile.retaMode === "manual") {
    return {
      monthlyNetIncome: roundMoney(monthlyNetIncome),
      base: 0,
      monthlyFee: roundMoney(safeNumber(profile.monthlyRetaFee)),
      source: "manual",
      tramoLabel: "Cuota manual",
    };
  }

  const tramo = RETA_2026_TRAMOS.find((item) =>
    monthlyNetIncome > item.min && (item.max === null || monthlyNetIncome <= item.max),
  ) ?? RETA_2026_TRAMOS[0];
  const monthlyFee = roundMoney(tramo.baseMin * (safeNumber(profile.retaContributionRate) / 100));

  return {
    monthlyNetIncome: roundMoney(monthlyNetIncome),
    base: tramo.baseMin,
    monthlyFee,
    source: "estimate_2026_table",
    tramoLabel: tramo.label,
  };
}

function estimatePluriactivityRefund(profile: FiscalProfile, projectedAnnualReta: number): number {
  if (!profile.isPluriactive) return 0;
  return estimatePluriactivityRefundForAmount(
    profile,
    projectedAnnualReta,
    safeNumber(profile.employeeSocialSecurityContributionsYtd),
  );
}

function buildPluriannualScenario(
  config: {
    id: PluriannualProjectionScenario["id"];
    label: string;
    description: string;
    revenueMultiplier: number;
    expenseMultiplier: number;
    growthOffset: number;
  },
  assumptions: PluriannualProjectionOptions,
  profile: FiscalProfile,
  baselineRevenue: number,
  baselineExpenses: number,
  retainedIncomeRatio: number,
): PluriannualProjectionScenario {
  const yearly: PluriannualProjectionYear[] = [];
  const revenueGrowth = (assumptions.annualRevenueGrowthPercent + config.growthOffset) / 100;
  const expenseGrowth = assumptions.annualExpenseGrowthPercent / 100;

  for (let index = 0; index < assumptions.years; index += 1) {
    const year = assumptions.startYear + index;
    const annualRevenue = roundMoney(baselineRevenue * config.revenueMultiplier * ((1 + revenueGrowth) ** index));
    const deductibleExpenses = roundMoney(baselineExpenses * config.expenseMultiplier * ((1 + expenseGrowth) ** index));
    const autonomousNetBeforeReta = roundMoney(Math.max(0, annualRevenue - deductibleExpenses));
    const estimatedReta = estimateReta(profile, autonomousNetBeforeReta);
    const flatRateApplied = assumptions.flatRateEndYear > 0 && year <= assumptions.flatRateEndYear;
    const reta = flatRateApplied
      ? {
        monthlyNetIncome: roundMoney(autonomousNetBeforeReta / 12),
        base: 0,
        monthlyFee: roundMoney(assumptions.flatRateMonthlyFee),
        source: "manual" as const,
        tramoLabel: "Tarifa plana",
      }
      : estimatedReta;
    const annualReta = roundMoney(reta.monthlyFee * 12);
    const combinedTaxableIncome = roundMoney(Math.max(
      0,
      autonomousNetBeforeReta
        - annualReta
        + assumptions.employmentGrossAnnual
        - assumptions.employmentSocialSecurityAnnual,
    ));
    const estimatedIrpfTotal = estimatePersonalIncomeTaxPlanning(combinedTaxableIncome);
    const professionalWithholding = roundMoney(
      annualRevenue * retainedIncomeRatio * (clampPercent(profile.defaultWithholdingRate) / 100),
    );
    const model130Applies = resolveModel130Applies(profile, retainedIncomeRatio).applies;
    const model130Reserve = model130Applies
      ? Math.max(0, roundMoney(autonomousNetBeforeReta * 0.2 - professionalWithholding))
      : 0;
    const pluriactivityRefund = estimatePluriactivityRefundForAmount(
      profile,
      annualReta,
      assumptions.employmentSocialSecurityAnnual,
    );
    const slAnalysis = buildSlAnalysis(
      annualRevenue,
      autonomousNetBeforeReta,
      assumptions.slRevenueThreshold,
      assumptions.slNetIncomeThreshold,
    );
    const notes = buildProjectionNotes(yearly.at(-1), {
      year,
      reta,
      flatRateApplied,
      flatRateEnds: assumptions.flatRateEndYear === year,
      slAnalysis,
    });

    yearly.push({
      year,
      annualRevenue,
      deductibleExpenses,
      autonomousNetBeforeReta,
      reta,
      annualReta,
      flatRateApplied,
      flatRateEnds: assumptions.flatRateEndYear === year,
      employmentGrossAnnual: roundMoney(assumptions.employmentGrossAnnual),
      employmentSocialSecurityAnnual: roundMoney(assumptions.employmentSocialSecurityAnnual),
      combinedTaxableIncome,
      estimatedIrpfTotal,
      professionalWithholding,
      employmentWithholding: roundMoney(assumptions.employmentWithholdingAnnual),
      model130Reserve,
      retainedIncomeRatio,
      model130Applies,
      pluriactivityRefund,
      netRealAnnual: roundMoney(
        autonomousNetBeforeReta
          - annualReta
          + assumptions.employmentGrossAnnual
          - assumptions.employmentSocialSecurityAnnual
          - estimatedIrpfTotal
          + pluriactivityRefund,
      ),
      slAnalysis,
      notes,
    });
  }

  return {
    id: config.id,
    label: config.label,
    description: config.description,
    yearly,
    totals: {
      revenue: roundMoney(yearly.reduce((sum, item) => sum + item.annualRevenue, 0)),
      expenses: roundMoney(yearly.reduce((sum, item) => sum + item.deductibleExpenses, 0)),
      reta: roundMoney(yearly.reduce((sum, item) => sum + item.annualReta, 0)),
      irpf: roundMoney(yearly.reduce((sum, item) => sum + item.estimatedIrpfTotal, 0)),
      pluriactivityRefund: roundMoney(yearly.reduce((sum, item) => sum + item.pluriactivityRefund, 0)),
      netReal: roundMoney(yearly.reduce((sum, item) => sum + item.netRealAnnual, 0)),
    },
  };
}

function estimatePluriactivityRefundForAmount(
  profile: FiscalProfile,
  projectedAnnualReta: number,
  employeeSocialSecurityAnnual: number,
): number {
  if (!profile.isPluriactive) return 0;
  const excess = safeNumber(employeeSocialSecurityAnnual)
    + projectedAnnualReta
    - safeNumber(profile.pluriactivityRefundThreshold);
  if (excess <= 0) return 0;
  const rate = clampPercent(profile.pluriactivityRefundCapRate) / 100;
  return roundMoney(Math.min(excess * rate, projectedAnnualReta * rate));
}

function estimatePersonalIncomeTaxPlanning(combinedTaxableIncome: number): number {
  let remaining = Math.max(0, safeNumber(combinedTaxableIncome) - IRPF_PERSONAL_MINIMUM_PLANNING);
  let previousLimit = 0;
  let tax = 0;

  for (const bracket of IRPF_PLANNING_BRACKETS_2026) {
    if (remaining <= 0) break;
    const bracketWidth = bracket.limit - previousLimit;
    const taxableInBracket = Math.min(remaining, bracketWidth);
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
    previousLimit = bracket.limit;
  }

  return roundMoney(tax);
}

function buildSlAnalysis(
  annualRevenue: number,
  autonomousNetBeforeReta: number,
  revenueThreshold: number,
  netIncomeThreshold: number,
): PluriannualProjectionYear["slAnalysis"] {
  const reasons: string[] = [];
  if (revenueThreshold > 0 && annualRevenue >= revenueThreshold) {
    reasons.push(`Ingresos >= ${formatMoney(revenueThreshold)}`);
  }
  if (netIncomeThreshold > 0 && autonomousNetBeforeReta >= netIncomeThreshold) {
    reasons.push(`Rendimiento neto >= ${formatMoney(netIncomeThreshold)}`);
  }
  return {
    recommendedReview: reasons.length > 0,
    reasons,
  };
}

function buildProjectionNotes(
  previousYear: PluriannualProjectionYear | undefined,
  current: {
    year: number;
    reta: RetaEstimate;
    flatRateApplied: boolean;
    flatRateEnds: boolean;
    slAnalysis: PluriannualProjectionYear["slAnalysis"];
  },
): string[] {
  const notes: string[] = [];
  if (current.flatRateApplied) {
    notes.push(current.flatRateEnds ? "Último año con tarifa plana configurada." : "Tarifa plana aplicada.");
  }
  if (previousYear && previousYear.reta.tramoLabel !== current.reta.tramoLabel) {
    notes.push(`Cambio de tramo RETA: ${previousYear.reta.tramoLabel} -> ${current.reta.tramoLabel}.`);
  }
  if (previousYear?.flatRateApplied && !current.flatRateApplied) {
    notes.push("Fin de tarifa plana: la cuota RETA pasa a estimación ordinaria.");
  }
  if (current.slAnalysis.recommendedReview) {
    notes.push("Punto de análisis para futura SL.");
  }
  return notes;
}

function parseInvoiceDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

function sumInvoices(invoices: Invoice[], selector: (invoice: Invoice) => number): number {
  return roundMoney(invoices.reduce((sum, invoice) => sum + selector(invoice), 0));
}

function sumExpenses(expenses: Expense[], selector: (expense: Expense) => number): number {
  return roundMoney(expenses.reduce((sum, expense) => sum + selector(expense), 0));
}

function nextRecurringDate(date: string, interval: RecurrenceInterval): string {
  const next = parseInvoiceDate(date);
  if (interval === "monthly") next.setMonth(next.getMonth() + 1);
  if (interval === "quarterly") next.setMonth(next.getMonth() + 3);
  if (interval === "yearly") next.setFullYear(next.getFullYear() + 1);
  return next.toISOString().slice(0, 10);
}

function expensePayload(expense: Expense): Omit<Expense, "id" | "createdAt" | "updatedAt"> {
  return {
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
    ...(expense.investment ? { investment: expense.investment } : {}),
    ...(expense.recurringId ? { recurringId: expense.recurringId } : {}),
    vatAmount: expense.vatAmount,
    total: expense.total,
    deductibleBase: expense.deductibleBase,
    deductibleVat: expense.deductibleVat,
    alerts: expense.alerts,
  };
}

function safeNumber(value: number | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, safeNumber(value)));
}

function sanitizeFiscalProfile(profile: FiscalProfile): FiscalProfile {
  return {
    ...profile,
    legalName: profile.legalName.trim(),
    tradeName: profile.tradeName.trim(),
    taxId: profile.taxId.trim().toUpperCase(),
    countryCode: normalizeCountryCode(profile.countryCode),
    invoiceSeries: profile.invoiceSeries.trim().toUpperCase() || "FM",
  };
}

function getActor(): { uid: string; name: string } {
  const user = auth?.currentUser;
  return {
    uid: user?.uid ?? "",
    name: user?.displayName ?? user?.email ?? "Usuario",
  };
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function makeLocalId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES");
}

function makeSimplePdf(lines: string[]): Blob {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 48;
  const top = 790;
  const lineHeight = 15;
  const content = [
    "BT",
    "/F1 10 Tf",
    `${left} ${top} Td`,
    ...lines.flatMap((line, index) => {
      const safe = escapePdfText(line || " ");
      return index === 0
        ? [`(${safe}) Tj`]
        : [`0 -${lineHeight} Td`, `(${safe}) Tj`];
    }),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function escapePdfText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/€/g, "EUR")
    .replace(/[^\x09\x0A\x0D\x20-\x7EÀ-ÿ€]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
