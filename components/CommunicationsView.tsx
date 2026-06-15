"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { subscribeToClients, type Client } from "@/lib/clients";
import {
  approveClientNotification,
  CLIENT_MAIL_KINDS,
  clientMailKindLabel,
  createClientNotification,
  deleteClientNotification,
  subscribeToClientMailOutbox,
  type ClientMailOutbox,
  type ClientMailStatus,
} from "@/lib/clientNotifications";
import {
  renderClientMail,
  type ClientMailKind,
  type MailLine,
} from "@/lib/clientMailTemplates";
import { formatMoney } from "@/lib/fiscal";
import { useCurrentUser } from "@/lib/useCurrentUser";
import styles from "@/styles/intranet-comunicaciones.module.css";

type Composer = {
  kind: ClientMailKind;
  clientId: string;
  to: string; // emails separados por coma
  title: string;
  intro: string;
  scope: string;
  message: string;
  currency: string;
  validUntil: string;
  serviceName: string;
  fromDate: string;
  toDate: string;
  reason: string;
  lines: MailLine[];
};

const STATUS_GROUPS: { status: ClientMailStatus; label: string }[] = [
  { status: "draft", label: "Borradores" },
  { status: "approved", label: "Aprobadas" },
  { status: "sending", label: "Enviando" },
  { status: "sent", label: "Enviadas" },
  { status: "failed", label: "Fallidas" },
];

const STATUS_LABELS: Record<ClientMailStatus, string> = {
  draft: "Borrador",
  approved: "Aprobada",
  sending: "Enviando",
  sent: "Enviada",
  failed: "Fallida",
};

const emptyLine = (): MailLine => ({ description: "", quantity: 1, unitPrice: 0, taxableBase: 0 });

const emptyComposer = (): Composer => ({
  kind: "general",
  clientId: "",
  to: "",
  title: "",
  intro: "",
  scope: "",
  message: "",
  currency: "EUR",
  validUntil: "",
  serviceName: "",
  fromDate: "",
  toDate: "",
  reason: "",
  lines: [emptyLine()],
});

function isProposalKind(kind: ClientMailKind): boolean {
  return kind === "proposal" || kind === "improvement_quote";
}

function currentUserApprover(user: ReturnType<typeof useCurrentUser>) {
  return {
    uid: user?.uid ?? "",
    name: user?.displayName || user?.email || "Equipo Formeta",
    email: user?.email ?? "",
  };
}

export function CommunicationsView() {
  const currentUser = useCurrentUser();
  const [items, setItems] = useState<ClientMailOutbox[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<Composer>(emptyComposer());
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const unsubOut = subscribeToClientMailOutbox((data) => {
      setItems(data);
      setLoading(false);
    });
    const unsubCli = subscribeToClients(setClients);
    return () => {
      unsubOut();
      unsubCli();
    };
  }, []);

  function setField<K extends keyof Composer>(key: K, value: Composer[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const subtotal = useMemo(
    () => form.lines.reduce((sum, l) => sum + (l.taxableBase || 0), 0),
    [form.lines],
  );

  // Variables para el renderizador según el tipo.
  const renderVars = useMemo(() => {
    const client = clients.find((c) => c.id === form.clientId);
    return {
      clientName: client?.contact || client?.name || "",
      title: form.title,
      intro: form.intro,
      scope: form.scope,
      message: form.message,
      lines: form.lines.filter((l) => l.description.trim() || l.taxableBase > 0),
      subtotal,
      currency: form.currency,
      validUntil: form.validUntil,
      serviceName: form.serviceName,
      fromDate: form.fromDate,
      toDate: form.toDate,
      reason: form.reason,
    };
  }, [clients, form, subtotal]);

  const rendered = useMemo(() => renderClientMail(form.kind, renderVars), [form.kind, renderVars]);

  function openNew() {
    setForm(emptyComposer());
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => setForm(emptyComposer()), 320);
  }

  function handleClientChange(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    const emails = client
      ? [client.email, ...(client.contacts ?? []).map((c) => c.email)].filter(Boolean)
      : [];
    setForm((f) => ({
      ...f,
      clientId,
      to: Array.from(new Set(emails)).join(", "),
    }));
  }

  function updateLine(index: number, patch: Partial<MailLine>) {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        const quantity = Number.isFinite(next.quantity) ? next.quantity : 0;
        const unitPrice = Number.isFinite(next.unitPrice) ? next.unitPrice : 0;
        return { ...next, taxableBase: Math.round(quantity * unitPrice * 100) / 100 };
      }),
    }));
  }

  function addLine() {
    setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }));
  }

  function removeLine(index: number) {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }));
  }

  function parseRecipients(value: string) {
    return value
      .split(/[,;]+/)
      .map((email) => email.trim())
      .filter(Boolean)
      .map((email) => ({ name: "", email }));
  }

  async function handleCreateDraft() {
    const to = parseRecipients(form.to);
    if (!to.length) {
      setNotice("Indica al menos un destinatario.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      await createClientNotification({
        kind: form.kind,
        to,
        subject: rendered.subject,
        templateData: renderVars as Record<string, unknown>,
        html: rendered.html,
        text: rendered.text,
        clientId: form.clientId,
        relatedEntity: form.clientId ? { type: "client", id: form.clientId } : null,
      });
      closeDrawer();
      setNotice("Borrador creado. Revísalo y apruébalo para enviarlo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(item: ClientMailOutbox) {
    setBusyId(item.id);
    try {
      await approveClientNotification(item.id, currentUserApprover(currentUser));
      setNotice("Aprobada. El worker la enviará en el próximo ciclo.");
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(item: ClientMailOutbox) {
    setBusyId(item.id);
    try {
      await deleteClientNotification(item.id);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Intranet</p>
          <h1 className={styles.title}>Comunicaciones</h1>
        </div>
        <button type="button" onClick={openNew} className={styles.btnNew}>
          <Plus size={13} /> Nueva comunicación
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
      ) : items.length === 0 ? (
        <p className={styles.empty}>
          Sin comunicaciones todavía.<br />
          Crea propuestas, presupuestos de mejora o avisos con la marca Formeta, desde info@formeta.es.
        </p>
      ) : (
        STATUS_GROUPS.map((group) => {
          const groupItems = items.filter((item) => item.status === group.status);
          if (!groupItems.length) return null;
          return (
            <section key={group.status} className={styles.group}>
              <h2 className={styles.groupLabel}>
                {group.label} <span className={styles.groupCount}>{groupItems.length}</span>
              </h2>
              <div className={styles.cardList}>
                {groupItems.map((item) => (
                  <article key={item.id} className={styles.card}>
                    <div className={styles.cardMain}>
                      <span className={styles.cardKind}>{clientMailKindLabel(item.kind)}</span>
                      <p className={styles.cardSubject}>{item.subject}</p>
                      <p className={styles.cardTo}>
                        {item.to.map((c) => c.email).join(", ") || "—"}
                      </p>
                      {item.status === "failed" && item.error && (
                        <p className={styles.cardError}>{item.error}</p>
                      )}
                    </div>
                    <div className={styles.cardSide}>
                      <span className={styles.statusBadge} data-status={item.status}>
                        {STATUS_LABELS[item.status]}
                      </span>
                      <div className={styles.cardActions}>
                        {item.status === "draft" && (
                          <button
                            type="button"
                            className={styles.miniBtn}
                            disabled={busyId === item.id}
                            onClick={() => handleApprove(item)}
                          >
                            Aprobar y enviar
                          </button>
                        )}
                        {(item.status === "draft" || item.status === "failed") && (
                          <button
                            type="button"
                            className={styles.iconBtn}
                            disabled={busyId === item.id}
                            onClick={() => handleDelete(item)}
                            aria-label="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })
      )}

      {drawerOpen && <div className={styles.backdrop} onClick={closeDrawer} />}
      <aside className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""}`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerLabel}>Nueva comunicación</span>
          <button type="button" onClick={closeDrawer} className={styles.drawerClose}>
            <X size={16} />
          </button>
        </div>
        <div className={styles.drawerBody}>
          <div className={styles.composeGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Tipo</label>
              <select
                className={styles.select}
                value={form.kind}
                onChange={(e) => setField("kind", e.target.value as ClientMailKind)}
              >
                {CLIENT_MAIL_KINDS.map((k) => (
                  <option key={k} value={k}>{clientMailKindLabel(k)}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Cliente</label>
              <select className={styles.select} value={form.clientId} onChange={(e) => handleClientChange(e.target.value)}>
                <option value="">Sin asociar</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className={`${styles.field} ${styles.full}`}>
              <label className={styles.fieldLabel}>Para (emails, separados por coma)</label>
              <input className={styles.input} value={form.to} onChange={(e) => setField("to", e.target.value)} placeholder="cliente@empresa.com" />
            </div>
            <div className={`${styles.field} ${styles.full}`}>
              <label className={styles.fieldLabel}>Título</label>
              <input className={styles.input} value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Asunto / encabezado" />
            </div>

            {form.kind === "general" && (
              <div className={`${styles.field} ${styles.full}`}>
                <label className={styles.fieldLabel}>Introducción (opcional)</label>
                <input className={styles.input} value={form.intro} onChange={(e) => setField("intro", e.target.value)} />
              </div>
            )}

            {isProposalKind(form.kind) && (
              <div className={`${styles.field} ${styles.full}`}>
                <label className={styles.fieldLabel}>Alcance / qué incluye</label>
                <textarea className={styles.textarea} rows={3} value={form.scope} onChange={(e) => setField("scope", e.target.value)} />
              </div>
            )}

            {isProposalKind(form.kind) && (
              <div className={styles.full}>
                <div className={styles.linesHeader}>
                  <span className={styles.fieldLabel}>Líneas</span>
                  <button type="button" className={styles.miniBtnGhost} onClick={addLine}>
                    <Plus size={12} /> Añadir
                  </button>
                </div>
                {form.lines.map((line, i) => (
                  <div key={i} className={styles.lineRow}>
                    <input className={styles.input} value={line.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="Concepto" />
                    <input type="number" min={0} className={`${styles.input} ${styles.lineNum}`} value={line.quantity || ""} onChange={(e) => updateLine(i, { quantity: parseFloat(e.target.value) || 0 })} placeholder="Cant." />
                    <input type="number" min={0} step={0.01} className={`${styles.input} ${styles.lineNum}`} value={line.unitPrice || ""} onChange={(e) => updateLine(i, { unitPrice: parseFloat(e.target.value) || 0 })} placeholder="Precio" />
                    <span className={styles.lineBase}>{formatMoney(line.taxableBase)}</span>
                    <button type="button" className={styles.lineRemove} onClick={() => removeLine(i)} aria-label="Eliminar línea"><Trash2 size={14} /></button>
                  </div>
                ))}
                <div className={styles.subtotalRow}><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
              </div>
            )}

            {isProposalKind(form.kind) && (
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Válida hasta</label>
                <input type="date" className={styles.input} value={form.validUntil} onChange={(e) => setField("validUntil", e.target.value)} />
              </div>
            )}

            {form.kind === "service_unavailable" && (
              <>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Servicio</label>
                  <input className={styles.input} value={form.serviceName} onChange={(e) => setField("serviceName", e.target.value)} placeholder="Hosting, correo…" />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Desde</label>
                  <input type="date" className={styles.input} value={form.fromDate} onChange={(e) => setField("fromDate", e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Hasta</label>
                  <input type="date" className={styles.input} value={form.toDate} onChange={(e) => setField("toDate", e.target.value)} />
                </div>
                <div className={`${styles.field} ${styles.full}`}>
                  <label className={styles.fieldLabel}>Motivo</label>
                  <textarea className={styles.textarea} rows={2} value={form.reason} onChange={(e) => setField("reason", e.target.value)} />
                </div>
              </>
            )}

            {(form.kind === "general" || form.kind === "service_unavailable") && (
              <div className={`${styles.field} ${styles.full}`}>
                <label className={styles.fieldLabel}>Mensaje</label>
                <textarea className={styles.textarea} rows={4} value={form.message} onChange={(e) => setField("message", e.target.value)} />
              </div>
            )}
          </div>

          <div className={styles.previewWrap}>
            <span className={styles.fieldLabel}>Previsualización</span>
            <iframe className={styles.preview} title="Previsualización del correo" srcDoc={rendered.html} />
          </div>
        </div>
        <div className={styles.drawerFooter}>
          <button type="button" onClick={closeDrawer} className={styles.btnCancel}>Cancelar</button>
          <button type="button" onClick={handleCreateDraft} className={styles.btnSave} disabled={saving || !form.to.trim()}>
            {saving ? "Guardando…" : "Crear borrador"}
          </button>
        </div>
      </aside>
    </div>
  );
}
