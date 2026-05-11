"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import {
  CLIENT_STATUSES,
  clientStatusLabel,
  createClient,
  deleteClient,
  type Client,
  type ClientInput,
  type ClientStatus,
  subscribeToClients,
  updateClient,
} from "@/lib/clients";
import styles from "@/styles/intranet-clients.module.css";

const emptyForm: ClientInput = {
  name: "",
  sector: "",
  contact: "",
  email: "",
  phone: "",
  status: "activo",
  website: "",
  contacts: [],
  links: [],
  notes: "",
};

export function ClientsView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "todos">("todos");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeToClients((data) => {
      setClients(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      setTimeout(() => nameRef.current?.focus(), 120);
    }
  }, [drawerOpen]);

  const filtered = statusFilter === "todos"
    ? clients
    : clients.filter((c) => c.status === statusFilter);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  }

  function openEdit(client: Client, e: React.MouseEvent) {
    e.preventDefault();
    setEditing(client);
    setForm({
      name:     client.name,
      sector:   client.sector,
      contact:  client.contact,
      email:    client.email,
      phone:    client.phone,
      status:   client.status,
      website:  client.website,
      contacts: client.contacts,
      links:    client.links,
      notes:    client.notes,
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function setField<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateClient(editing.id, form);
      } else {
        await createClient(form);
      }
      closeDrawer();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    await deleteClient(id);
    setConfirmDelete(null);
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Directorio</p>
          <h1 className={styles.title}>Clientes</h1>
        </div>
        <button type="button" onClick={openNew} className={styles.btnNew}>
          <Plus width={14} height={14} strokeWidth={2} />
          Nuevo cliente
        </button>
      </div>

      {/* Filter tabs by status */}
      {!loading && clients.length > 0 && (
        <div className={styles.filterTabs}>
          <button
            type="button"
            className={`${styles.filterTab} ${statusFilter === "todos" ? styles.filterTabActive : ""}`}
            onClick={() => setStatusFilter("todos")}
          >
            Todos
            <span className={styles.filterTabCount}>{clients.length}</span>
          </button>
          {CLIENT_STATUSES.map((s) => {
            const count = clients.filter((c) => c.status === s).length;
            if (count === 0) return null;
            return (
              <button
                key={s}
                type="button"
                className={`${styles.filterTab} ${statusFilter === s ? styles.filterTabActive : ""}`}
                onClick={() => setStatusFilter(s)}
              >
                {clientStatusLabel(s)}
                <span className={styles.filterTabCount}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {loading && (
        <p className={styles.empty}>Cargando clientes…</p>
      )}

      {!loading && clients.length === 0 && (
        <p className={styles.empty}>
          Aún no hay clientes. Añade el primero con el botón de arriba.
        </p>
      )}

      {!loading && clients.length > 0 && filtered.length === 0 && (
        <p className={styles.empty}>
          No hay clientes con estado «{clientStatusLabel(statusFilter as ClientStatus)}».
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <div className={styles.list}>
          <div className={styles.listHeader}>
            <span>Cliente</span>
            <span>Sector</span>
            <span>Estado</span>
            <span>Contacto</span>
            <span>Email</span>
            <span />
          </div>
          {filtered.map((client) => (
            <div key={client.id} className={styles.row}>
              <Link href={`/intranet/clientes/${client.id}`} className={styles.rowName}>
                {client.name}
              </Link>
              <span className={styles.rowMeta}>{client.sector || "—"}</span>
              <span className={styles.rowStatus}>
                <span className={styles.statusBadge} data-status={client.status}>
                  {clientStatusLabel(client.status)}
                </span>
              </span>
              <span className={styles.rowMeta}>{client.contact || "—"}</span>
              <span className={styles.rowMeta}>{client.email || "—"}</span>
              <div className={styles.rowActions}>
                <button
                  type="button"
                  onClick={(e) => openEdit(client, e)}
                  className={styles.btnAction}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(client.id)}
                  className={`${styles.btnAction} ${confirmDelete === client.id ? styles.btnDanger : ""}`}
                  onBlur={() => setConfirmDelete(null)}
                >
                  {confirmDelete === client.id ? "¿Seguro?" : "Eliminar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer (create/edit) */}
      {drawerOpen && (
        <div
          className={styles.backdrop}
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}
      <aside
        className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""}`}
        aria-label={editing ? "Editar cliente" : "Nuevo cliente"}
      >
        <div className={styles.drawerHeader}>
          <span className={styles.drawerLabel}>
            {editing ? "Editar cliente" : "Nuevo cliente"}
          </span>
          <button
            type="button"
            onClick={closeDrawer}
            className={styles.drawerClose}
            aria-label="Cerrar"
          >
            <X width={16} height={16} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
          <div className={styles.formSection}>
            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>Nombre *</label>
              <input
                ref={nameRef}
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className={styles.input}
                required
                autoComplete="off"
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="sector" className={styles.label}>Sector</label>
                <input
                  id="sector"
                  type="text"
                  value={form.sector}
                  onChange={(e) => setField("sector", e.target.value)}
                  className={styles.input}
                  autoComplete="off"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="status" className={styles.label}>Estado</label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value as ClientStatus)}
                  className={styles.input}
                >
                  {CLIENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{clientStatusLabel(s)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="website" className={styles.label}>Web</label>
              <input
                id="website"
                type="url"
                value={form.website}
                placeholder="https://..."
                onChange={(e) => setField("website", e.target.value)}
                className={styles.input}
                autoComplete="off"
              />
            </div>
          </div>

          <div className={styles.formSection}>
            <p className={styles.formSectionLabel}>Contacto principal</p>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="contact" className={styles.label}>Persona</label>
                <input
                  id="contact"
                  type="text"
                  value={form.contact}
                  onChange={(e) => setField("contact", e.target.value)}
                  className={styles.input}
                  autoComplete="off"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="phone" className={styles.label}>Teléfono</label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className={styles.input}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className={styles.input}
                autoComplete="off"
              />
            </div>
            <p className={styles.formHint}>
              Los contactos secundarios y links se editan desde la ficha del cliente.
            </p>
          </div>

          <div className={styles.formSection}>
            <div className={styles.field}>
              <label htmlFor="notes" className={styles.label}>Notas internas</label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                className={`${styles.input} ${styles.textarea}`}
                rows={4}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={closeDrawer}
              className={styles.btnCancel}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className={styles.btnSave}
            >
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear cliente"}
            </button>
          </div>
        </form>
      </aside>
    </main>
  );
}
