"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  createMailbox,
  deleteMailbox,
  subscribeToMailboxes,
  updateMailbox,
  type Mailbox,
  type MailboxInput,
} from "@/lib/mailboxes";
import styles from "@/styles/intranet-servicios.module.css";

const emptyForm = (): MailboxInput => ({
  alias: "",
  account: "",
  description: "",
  tool: "API de Gmail",
  active: true,
  notes: "",
});

// Validación básica de formato de email (alias y cuenta destino).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MailboxesTab() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Mailbox | null>(null);
  const [form, setForm] = useState<MailboxInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState("");
  const aliasRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeToMailboxes((data) => {
      setMailboxes(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (drawerOpen) setTimeout(() => aliasRef.current?.focus(), 150);
  }, [drawerOpen]);

  function setField<K extends keyof MailboxInput>(key: K, value: MailboxInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setConfirmDelete(false);
    setFormError("");
    setDrawerOpen(true);
  }

  function openEdit(mailbox: Mailbox) {
    setEditing(mailbox);
    setForm({
      alias: mailbox.alias,
      account: mailbox.account,
      description: mailbox.description,
      tool: mailbox.tool || "API de Gmail",
      active: mailbox.active,
      notes: mailbox.notes,
    });
    setConfirmDelete(false);
    setFormError("");
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setConfirmDelete(false);
    setFormError("");
    setTimeout(() => { setEditing(null); setForm(emptyForm()); }, 320);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const alias = form.alias.trim();
    const account = form.account.trim();
    if (!alias) return;
    // Valida el formato antes de guardar: ambos campos son direcciones de correo.
    if (!EMAIL_RE.test(alias)) {
      setFormError("El alias debe ser una dirección de correo válida (p. ej. soporte@formeta.es).");
      return;
    }
    if (account && !EMAIL_RE.test(account)) {
      setFormError("La cuenta destino debe ser una dirección de correo válida.");
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      const data: MailboxInput = { ...form, alias, account };
      if (editing) await updateMailbox(editing.id, data);
      else await createMailbox(data);
      closeDrawer();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try {
      await deleteMailbox(editing.id);
      closeDrawer();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className={styles.infoCard}>
        <p className={styles.infoTitle}>Correo de Workspace · API de Gmail</p>
        <p className={styles.infoText}>
          Los tickets entran y salen por la <strong>API de Gmail</strong>, que maneja los hilos
          (<code>threadId</code>) y el envío de respuestas. Esto mantiene el historial unificado
          para el cliente y evita crear tickets duplicados. Registra aquí los alias y a qué cuenta
          real entregan, con una nota de para qué se usa cada buzón.
        </p>
      </div>

      <div className={styles.topBar}>
        <span className={styles.cellMuted}>{mailboxes.length} buzones / alias</span>
        <button type="button" onClick={openNew} className={styles.btnNew}>
          <Plus size={13} /> Nuevo alias
        </button>
      </div>

      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : mailboxes.length === 0 ? (
        <p className={styles.empty}>
          Sin alias registrados.<br />
          Añade el primero: alias, cuenta destino y para qué se usa.
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Alias</th>
                <th className={styles.th}>Entrega en</th>
                <th className={styles.th}>Uso</th>
                <th className={styles.th}>Herramienta</th>
                <th className={styles.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {mailboxes.map((m) => (
                <tr key={m.id} className={styles.tr} onClick={() => openEdit(m)}>
                  <td className={`${styles.td} ${styles.cellName}`}>{m.alias}</td>
                  <td className={styles.td}>
                    <span className={styles.cellMuted}>{m.account || "—"}</span>
                  </td>
                  <td className={styles.td}>{m.description || <span className={styles.cellEmpty}>—</span>}</td>
                  <td className={styles.td}><span className={styles.badge}>{m.tool || "API de Gmail"}</span></td>
                  <td className={styles.td}>
                    <span className={styles.badge}>{m.active ? "Activo" : "Inactivo"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawerOpen && <div className={styles.backdrop} onClick={closeDrawer} />}
      <aside className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""}`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerLabel}>{editing ? "Editar alias" : "Nuevo alias"}</span>
          <button type="button" onClick={closeDrawer} className={styles.drawerClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className={styles.drawerBody}>
          <div className={styles.formGrid}>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.fieldLabel}>Alias / dirección *</label>
              <input ref={aliasRef} className={styles.input} value={form.alias} onChange={(e) => setField("alias", e.target.value)} placeholder="soporte@formeta.es" required />
            </div>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.fieldLabel}>Entrega en (cuenta destino)</label>
              <input className={styles.input} value={form.account} onChange={(e) => setField("account", e.target.value)} placeholder="formeta@formeta.es" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Herramienta</label>
              <input className={styles.input} value={form.tool} onChange={(e) => setField("tool", e.target.value)} placeholder="API de Gmail" />
            </div>
            <div className={styles.field}>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Activo</span>
                <label className={styles.toggle}>
                  <input type="checkbox" checked={form.active} onChange={(e) => setField("active", e.target.checked)} />
                  <span className={styles.toggleTrack} />
                </label>
              </div>
            </div>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.fieldLabel}>¿Para qué se usa este buzón?</label>
              <textarea className={styles.textarea} rows={3} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Ej.: recepción de incidencias de clientes; entra como ticket vía API de Gmail." />
            </div>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.fieldLabel}>Notas</label>
              <textarea className={styles.textarea} rows={2} value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
            </div>
          </div>
          {formError && (
            <p role="alert" style={{ color: "#b3261e", fontSize: "12.5px", margin: "10px 0 0" }}>
              {formError}
            </p>
          )}
        </form>
        <div className={styles.drawerFooter}>
          {editing && (
            <button type="button" onClick={handleDelete} className={styles.btnDelete} disabled={saving}>
              {confirmDelete ? "¿Confirmar?" : "Eliminar"}
            </button>
          )}
          <button type="button" onClick={closeDrawer} className={styles.btnCancel}>Cancelar</button>
          <button type="button" onClick={handleSubmit} className={styles.btnSave} disabled={saving || !form.alias.trim()}>
            {saving ? "Guardando…" : editing ? "Guardar" : "Crear alias"}
          </button>
        </div>
      </aside>
    </div>
  );
}
