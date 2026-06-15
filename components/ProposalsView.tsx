"use client";

import { Plus, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { subscribeToClients, getClient, type Client } from "@/lib/clients";
import { subscribeToProjects, type Project } from "@/lib/projects";
import {
  calculateProposalSubtotal,
  createProposal,
  deleteProposal,
  isProposalExpired,
  makeProposalLine,
  markProposalSent,
  proposalLinesToInvoiceLines,
  proposalStatusLabel,
  setProposalDecision,
  subscribeToProposals,
  updateProposal,
  type Proposal,
  type ProposalInput,
  type ProposalLine,
  type ProposalStatus,
} from "@/lib/proposals";
import {
  defaultDueDate,
  formatMoney,
  issueInvoice,
  subscribeFiscalProfile,
  type FiscalProfile,
} from "@/lib/fiscal";
import { createClientNotification } from "@/lib/clientNotifications";
import { renderClientMail } from "@/lib/clientMailTemplates";
import { useCurrentUser } from "@/lib/useCurrentUser";
import styles from "@/styles/intranet-propuestas.module.css";

type FormState = {
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  title: string;
  scope: string;
  currency: string;
  validUntil: string;
  status: ProposalStatus;
  lines: ProposalLine[];
};

const emptyForm = (): FormState => ({
  clientId: "",
  clientName: "",
  projectId: "",
  projectName: "",
  title: "",
  scope: "",
  currency: "EUR",
  validUntil: "",
  status: "draft",
  lines: [makeProposalLine({ description: "", quantity: 1, unitPrice: 0 })],
});

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function displayStatus(p: Proposal): ProposalStatus {
  return isProposalExpired(p) ? "expired" : p.status;
}

export function ProposalsView() {
  const currentUser = useCurrentUser();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<FiscalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyId, setBusyId] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubProp = subscribeToProposals((data) => {
      setProposals(data);
      setLoading(false);
    });
    const unsubCli = subscribeToClients(setClients);
    const unsubProj = subscribeToProjects(setProjects);
    const unsubProfile = subscribeFiscalProfile(setProfile);
    return () => {
      unsubProp();
      unsubCli();
      unsubProj();
      unsubProfile();
    };
  }, []);

  useEffect(() => {
    if (drawerOpen) setTimeout(() => titleRef.current?.focus(), 150);
  }, [drawerOpen]);

  const subtotal = useMemo(() => calculateProposalSubtotal(form.lines), [form.lines]);
  const clientProjects = useMemo(
    () => projects.filter((p) => !form.clientId || p.clientId === form.clientId),
    [projects, form.clientId],
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function resetAi() {
    setAiText("");
    setAiError("");
    setAiBusy(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm(), validUntil: defaultDueDate(todayIso(), 30) });
    setConfirmDelete(false);
    resetAi();
    setDrawerOpen(true);
  }

  function openEdit(p: Proposal) {
    setEditing(p);
    setForm({
      clientId: p.clientId,
      clientName: p.clientName,
      projectId: p.projectId,
      projectName: p.projectName,
      title: p.title,
      scope: p.scope,
      currency: p.currency || "EUR",
      validUntil: p.validUntil,
      status: p.status,
      lines: p.lines.length ? p.lines : [makeProposalLine({ description: "", quantity: 1, unitPrice: 0 })],
    });
    setConfirmDelete(false);
    resetAi();
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setConfirmDelete(false);
    resetAi();
    setTimeout(() => {
      setEditing(null);
      setForm(emptyForm());
    }, 320);
  }

  // Pega texto libre → la IA rellena título, alcance y líneas de la propuesta.
  async function handleAiFill() {
    if (!aiText.trim()) {
      setAiError("Pega primero las notas (email, apuntes…) que quieres convertir.");
      return;
    }
    setAiBusy(true);
    setAiError("");
    try {
      const res = await fetch("/api/proposals/ai-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: aiText,
          currency: form.currency,
          apiKeyOverride: currentUser?.geminiApiKey?.trim() || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data?.disabledReason || data?.error || "La IA no está disponible ahora.");
        return;
      }
      const aiLines: { description: string; quantity: number; unitPrice: number }[] =
        Array.isArray(data.lines) ? data.lines : [];
      setForm((f) => ({
        ...f,
        title: f.title.trim() ? f.title : (data.title || ""),
        scope: data.scope || f.scope,
        lines: aiLines.length
          ? aiLines.map((l) =>
              makeProposalLine({
                description: l.description,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
              }),
            )
          : f.lines,
      }));
    } catch {
      setAiError("No se ha podido contactar con la IA.");
    } finally {
      setAiBusy(false);
    }
  }

  function handleClientChange(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    setForm((f) => ({
      ...f,
      clientId,
      clientName: client?.name ?? "",
      // reset project si ya no pertenece al nuevo cliente
      projectId: "",
      projectName: "",
    }));
  }

  function handleProjectChange(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    setForm((f) => ({ ...f, projectId, projectName: project?.name ?? "" }));
  }

  function updateLine(id: string, patch: Partial<ProposalLine>) {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((line) => {
        if (line.id !== id) return line;
        // Conservar el id (la key de React) para no remontar el input y perder
        // el foco en cada tecla; solo recalcular la base imponible.
        const next = { ...line, ...patch };
        const quantity = Number.isFinite(next.quantity) ? next.quantity : 0;
        const unitPrice = Number.isFinite(next.unitPrice) ? next.unitPrice : 0;
        return { ...next, taxableBase: Math.round(quantity * unitPrice * 100) / 100 };
      }),
    }));
  }

  function addLine() {
    setForm((f) => ({ ...f, lines: [...f.lines, makeProposalLine({ description: "", quantity: 1, unitPrice: 0 })] }));
  }

  function removeLine(id: string) {
    setForm((f) => ({ ...f, lines: f.lines.filter((line) => line.id !== id) }));
  }

  function buildInput(): ProposalInput {
    return {
      clientId: form.clientId,
      clientName: form.clientName,
      projectId: form.projectId,
      projectName: form.projectName,
      title: form.title.trim(),
      scope: form.scope.trim(),
      lines: form.lines.filter((l) => l.description.trim() || l.taxableBase > 0),
      totals: { subtotal },
      currency: form.currency,
      validUntil: form.validUntil,
      status: form.status,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.clientId) return;
    setSaving(true);
    try {
      const input = buildInput();
      if (editing) await updateProposal(editing.id, input);
      else await createProposal(input);
      closeDrawer();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      await deleteProposal(editing.id);
      closeDrawer();
    } finally {
      setSaving(false);
    }
  }

  // Crea un borrador de comunicación con la propuesta renderizada y marca la
  // propuesta como enviada. El equipo aprueba el envío en Comunicaciones.
  async function handleSendToClient(p: Proposal) {
    const client = clients.find((c) => c.id === p.clientId);
    if (!client?.email) {
      setNotice("El cliente no tiene email. Añádelo en Clientes antes de enviar.");
      return;
    }
    setBusyId(p.id);
    setNotice("");
    try {
      const rendered = renderClientMail("proposal", {
        clientName: client.name,
        title: p.title,
        scope: p.scope,
        proposalNumber: p.number,
        lines: p.lines,
        subtotal: p.totals.subtotal,
        currency: p.currency,
        validUntil: p.validUntil,
      });
      await createClientNotification({
        kind: "proposal",
        to: [{ name: client.contact || client.name, email: client.email }],
        subject: rendered.subject,
        templateData: { proposalId: p.id, proposalNumber: p.number },
        html: rendered.html,
        text: rendered.text,
        clientId: p.clientId,
        relatedEntity: { type: "proposal", id: p.id },
      });
      await markProposalSent(p.id);
      setNotice(`Borrador creado en Comunicaciones para ${client.name}. Apruébalo allí para enviarlo.`);
    } finally {
      setBusyId("");
    }
  }

  async function handleDecision(p: Proposal, decision: "accepted" | "rejected") {
    setBusyId(p.id);
    try {
      await setProposalDecision(p.id, decision, {
        uid: currentUser?.uid ?? "",
        name: currentUser?.displayName || currentUser?.email || "Equipo Formeta",
      });
    } finally {
      setBusyId("");
    }
  }

  async function handleIssueInvoice(p: Proposal) {
    if (!profile) {
      setNotice("Carga el perfil fiscal antes de emitir facturas.");
      return;
    }
    setBusyId(p.id);
    setNotice("");
    try {
      const client = await getClient(p.clientId);
      if (!client) {
        setNotice("Cliente no encontrado.");
        return;
      }
      const issueDate = todayIso();
      const invoiceId = await issueInvoice({
        issuer: profile,
        client,
        issueDate,
        dueDate: defaultDueDate(issueDate, profile.paymentTermsDays || 30),
        lines: proposalLinesToInvoiceLines(p),
        notes: p.scope,
      });
      await updateProposal(p.id, { convertedInvoiceId: invoiceId });
      setNotice(`Factura emitida desde la propuesta ${p.number}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo emitir la factura.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Intranet</p>
          <h1 className={styles.title}>Propuestas</h1>
        </div>
        <button type="button" onClick={openNew} className={styles.btnNew}>
          <Plus size={13} /> Nueva propuesta
        </button>
      </div>

      {notice && (
        <div className={styles.notice} role="status">
          {notice}
          <button type="button" className={styles.noticeClose} onClick={() => setNotice("")}>
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : proposals.length === 0 ? (
        <p className={styles.empty}>
          Sin propuestas todavía.<br />
          Crea un presupuesto, envíalo al cliente y, al aceptarlo, conviértelo en factura.
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Nº</th>
                <th className={styles.th}>Título</th>
                <th className={styles.th}>Cliente</th>
                <th className={styles.th}>Estado</th>
                <th className={styles.th}>Validez</th>
                <th className={`${styles.th} ${styles.thRight}`}>Subtotal</th>
                <th className={`${styles.th} ${styles.thRight}`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => {
                const status = displayStatus(p);
                const busy = busyId === p.id;
                return (
                  <tr key={p.id} className={styles.tr} data-status={status}>
                    <td className={`${styles.td} ${styles.cellMono}`} onClick={() => openEdit(p)}>
                      {p.number}
                    </td>
                    <td className={`${styles.td} ${styles.cellName}`} onClick={() => openEdit(p)}>
                      {p.title || <span className={styles.cellEmpty}>—</span>}
                    </td>
                    <td className={styles.td} onClick={() => openEdit(p)}>
                      {p.clientName || <span className={styles.cellEmpty}>—</span>}
                    </td>
                    <td className={styles.td}>
                      <span className={styles.statusBadge} data-status={status}>
                        {proposalStatusLabel(status)}
                      </span>
                    </td>
                    <td className={styles.td}>{p.validUntil || <span className={styles.cellEmpty}>—</span>}</td>
                    <td className={`${styles.td} ${styles.tdRight}`}>
                      {formatMoney(p.totals.subtotal)}
                    </td>
                    <td className={`${styles.td} ${styles.tdRight}`}>
                      <div className={styles.rowActions}>
                        {(p.status === "draft") && (
                          <button type="button" className={styles.miniBtn} disabled={busy} onClick={() => handleSendToClient(p)}>
                            Enviar
                          </button>
                        )}
                        {(p.status === "sent") && (
                          <>
                            <button type="button" className={styles.miniBtn} disabled={busy} onClick={() => handleDecision(p, "accepted")}>
                              Aceptada
                            </button>
                            <button type="button" className={styles.miniBtnGhost} disabled={busy} onClick={() => handleDecision(p, "rejected")}>
                              Rechazada
                            </button>
                          </>
                        )}
                        {p.status === "accepted" && !p.convertedInvoiceId && (
                          <button type="button" className={styles.miniBtn} disabled={busy} onClick={() => handleIssueInvoice(p)}>
                            Emitir factura
                          </button>
                        )}
                        {p.convertedInvoiceId && <span className={styles.cellMuted}>Facturada</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {drawerOpen && <div className={styles.backdrop} onClick={closeDrawer} />}
      <aside className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""}`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerLabel}>{editing ? `Editar ${editing.number}` : "Nueva propuesta"}</span>
          <button type="button" onClick={closeDrawer} className={styles.drawerClose}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.drawerBody}>
          <div className={styles.aiPanel}>
            <div className={styles.aiPanelHead}>
              <Sparkles size={14} />
              <span>Rellenar con IA</span>
            </div>
            <p className={styles.aiHint}>
              Pega un email, notas o lo hablado con el cliente y la IA propondrá título,
              alcance y líneas. Podrás revisarlo y editarlo antes de guardar.
            </p>
            <textarea
              className={styles.textarea}
              rows={3}
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Ej.: El cliente quiere una web de 5 páginas, dominio y mantenimiento anual…"
            />
            {aiError && <p className={styles.aiError}>{aiError}</p>}
            <button type="button" className={styles.aiBtn} onClick={handleAiFill} disabled={aiBusy || !aiText.trim()}>
              <Sparkles size={13} /> {aiBusy ? "Generando…" : "Generar propuesta"}
            </button>
          </div>

          <div className={styles.formGrid}>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.fieldLabel}>Título *</label>
              <input
                ref={titleRef}
                className={styles.input}
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Rediseño web, mantenimiento anual…"
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Cliente *</label>
              <select className={styles.select} value={form.clientId} onChange={(e) => handleClientChange(e.target.value)} required>
                <option value="">Selecciona…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Proyecto (opcional)</label>
              <select className={styles.select} value={form.projectId} onChange={(e) => handleProjectChange(e.target.value)}>
                <option value="">Sin proyecto</option>
                {clientProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Válida hasta</label>
              <input type="date" className={styles.input} value={form.validUntil} onChange={(e) => setField("validUntil", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Moneda</label>
              <select className={styles.select} value={form.currency} onChange={(e) => setField("currency", e.target.value)}>
                <option value="EUR">EUR €</option>
                <option value="USD">USD $</option>
                <option value="GBP">GBP £</option>
              </select>
            </div>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.fieldLabel}>Alcance / notas</label>
              <textarea className={styles.textarea} rows={3} value={form.scope} onChange={(e) => setField("scope", e.target.value)} placeholder="Qué incluye la propuesta…" />
            </div>
          </div>

          <div className={styles.linesHeader}>
            <span className={styles.fieldLabel}>Líneas</span>
            <button type="button" className={styles.miniBtnGhost} onClick={addLine}>
              <Plus size={12} /> Añadir línea
            </button>
          </div>
          <div className={styles.lines}>
            {form.lines.map((line) => (
              <div key={line.id} className={styles.lineRow}>
                <input
                  className={styles.input}
                  value={line.description}
                  onChange={(e) => updateLine(line.id, { description: e.target.value })}
                  placeholder="Concepto"
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  className={`${styles.input} ${styles.lineQty}`}
                  value={line.quantity || ""}
                  onChange={(e) => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                  placeholder="Cant."
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={`${styles.input} ${styles.linePrice}`}
                  value={line.unitPrice || ""}
                  onChange={(e) => updateLine(line.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                  placeholder="Precio"
                />
                <span className={styles.lineBase}>{formatMoney(line.taxableBase)}</span>
                <button type="button" className={styles.lineRemove} onClick={() => removeLine(line.id)} aria-label="Eliminar línea">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className={styles.subtotalRow}>
            <span>Subtotal (sin impuestos)</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>
        </form>
        <div className={styles.drawerFooter}>
          {editing && (
            <button type="button" onClick={handleDelete} className={styles.btnDelete} disabled={saving}>
              {confirmDelete ? "¿Confirmar?" : "Eliminar"}
            </button>
          )}
          <button type="button" onClick={closeDrawer} className={styles.btnCancel}>Cancelar</button>
          <button type="button" onClick={handleSubmit} className={styles.btnSave} disabled={saving || !form.title.trim() || !form.clientId}>
            {saving ? "Guardando…" : editing ? "Guardar" : "Crear propuesta"}
          </button>
        </div>
      </aside>
    </div>
  );
}
