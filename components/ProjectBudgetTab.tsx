"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";

import { calcBillableAmount, calcTotalHours, exportInvoice, generateInvoiceHtml } from "@/lib/budget";
import { subscribeToClients, type Client } from "@/lib/clients";
import { updateProject, type Project } from "@/lib/projects";
import { formatDuration } from "@/lib/timerContext";
import { subscribeToTimeEntries, type TimeEntry } from "@/lib/timeEntries";
import styles from "@/styles/intranet-budget.module.css";

type Filter = "all" | "month" | "quarter";

const DAY_MS = 86400000;
const FILTER_MS: Record<Filter, number | null> = {
  all: null,
  month: 30 * DAY_MS,
  quarter: 90 * DAY_MS,
};
const FILTER_LABELS: Record<Filter, string> = {
  all: "Todo",
  month: "30 días",
  quarter: "90 días",
};

type Props = {
  project: Project;
  onProjectUpdate: (updated: Partial<Project>) => void;
};

export function ProjectBudgetTab({ project, onProjectUpdate }: Props) {
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(project.hourlyRate ?? 0));
  const [budgetInput, setBudgetInput] = useState(String(project.budgetHours ?? ""));
  const [currencyInput, setCurrencyInput] = useState(project.currency ?? "EUR");
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => {
    const unsubEntries = subscribeToTimeEntries(project.id, setAllEntries);
    const unsubClients = subscribeToClients(setClients);
    return () => { unsubEntries(); unsubClients(); };
  }, [project.id]);

  // Resincroniza los inputs cuando cambia el proyecto desde fuera
  // (solo con el formulario cerrado, para no pisar lo que se está escribiendo)
  useEffect(() => {
    if (editingRate) return;
    setRateInput(String(project.hourlyRate ?? 0));
    setBudgetInput(String(project.budgetHours ?? ""));
    setCurrencyInput(project.currency ?? "EUR");
  }, [project.hourlyRate, project.budgetHours, project.currency, editingRate]);

  const entries = useMemo(() => {
    const ms = FILTER_MS[filter];
    if (!ms) return allEntries;
    const cutoff = Date.now() - ms;
    return allEntries.filter((e) => e.startedAt.seconds * 1000 >= cutoff);
  }, [allEntries, filter]);

  const hourlyRate = project.hourlyRate ?? 0;
  const budgetHours = project.budgetHours ?? null;
  const currency = project.currency ?? "EUR";

  const totalHours = useMemo(() => calcTotalHours(entries), [entries]);
  const billableAmount = useMemo(() => calcBillableAmount(entries, hourlyRate), [entries, hourlyRate]);
  const budgetPercent = budgetHours && budgetHours > 0
    ? Math.min(100, (totalHours / budgetHours) * 100)
    : null;

  const currencySymbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency;

  async function handleSaveRate(e: React.FormEvent) {
    e.preventDefault();
    setSavingRate(true);
    const rate = parseFloat(rateInput) || 0;
    const budget = budgetInput ? parseFloat(budgetInput) || null : null;
    try {
      await updateProject(project.id, {
        hourlyRate: rate,
        budgetHours: budget,
        currency: currencyInput || "EUR",
      });
      onProjectUpdate({ hourlyRate: rate, budgetHours: budget, currency: currencyInput || "EUR" });
      setEditingRate(false);
    } finally {
      setSavingRate(false);
    }
  }

  function handleExportInvoice() {
    const client = clients.find((c) => c.id === project.clientId) ?? null;
    const html = generateInvoiceHtml(project, client, entries, hourlyRate, currency);
    exportInvoice(html, project.name);
  }

  return (
    <div className={styles.container}>
      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Horas registradas</span>
          <span className={styles.statValue}>
            {totalHours > 0 ? formatDuration(entries.reduce((a, e) => a + e.durationSeconds, 0)) : "—"}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Importe facturable</span>
          <span className={styles.statValue}>
            {hourlyRate > 0 && billableAmount > 0
              ? `${currencySymbol}${billableAmount.toFixed(2)}`
              : "—"}
          </span>
          {hourlyRate === 0 && (
            <span className={styles.statHint}>Configura una tarifa</span>
          )}
        </div>
        {budgetPercent !== null && (
          <div className={styles.statCard}>
            <span className={styles.statLabel}>% presupuesto</span>
            <span className={styles.statValue} data-over={budgetPercent >= 90 ? "true" : "false"}>
              {budgetPercent.toFixed(0)}%
            </span>
            <span className={styles.statHint}>
              {totalHours.toFixed(1)} / {budgetHours} h
            </span>
          </div>
        )}
      </div>

      {/* Budget progress bar */}
      {budgetPercent !== null && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${budgetPercent}%` }}
            data-over={budgetPercent >= 90 ? "true" : "false"}
          />
        </div>
      )}

      {/* Filter + actions row */}
      <div className={styles.actionsRow}>
        <div className={styles.filterGroup}>
          {(["all", "month", "quarter"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        <div className={styles.actionBtns}>
          <button
            type="button"
            onClick={() => setEditingRate((v) => !v)}
            className={styles.btnRate}
          >
            {hourlyRate > 0 ? `${currencySymbol}${hourlyRate}/h · Editar tarifa` : "Configurar tarifa"}
          </button>
          <button
            type="button"
            onClick={handleExportInvoice}
            className={styles.btnExport}
            disabled={entries.length === 0 || hourlyRate === 0}
          >
            <Download width={13} height={13} strokeWidth={1.5} />
            Exportar factura
          </button>
        </div>
      </div>

      {/* Rate config form */}
      {editingRate && (
        <form onSubmit={(e) => void handleSaveRate(e)} className={styles.rateForm}>
          <div className={styles.rateFields}>
            <div className={styles.rateField}>
              <label className={styles.rateLabel}>Tarifa / hora</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className={styles.rateInput}
                placeholder="0.00"
              />
            </div>
            <div className={styles.rateField}>
              <label className={styles.rateLabel}>Horas presupuestadas</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className={styles.rateInput}
                placeholder="Sin límite"
              />
            </div>
            <div className={styles.rateField}>
              <label className={styles.rateLabel}>Moneda</label>
              <select
                value={currencyInput}
                onChange={(e) => setCurrencyInput(e.target.value)}
                className={styles.rateInput}
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
          <div className={styles.rateActions}>
            <button type="button" onClick={() => setEditingRate(false)} className={styles.btnCancel}>Cancelar</button>
            <button type="submit" disabled={savingRate} className={styles.btnSave}>
              {savingRate ? "Guardando…" : "Guardar tarifa"}
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 && (
        <p className={styles.empty}>No hay sesiones de tiempo registradas en este período.</p>
      )}
    </div>
  );
}
