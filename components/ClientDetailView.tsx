"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mail, Phone, X } from "lucide-react";

import {
  deleteClient,
  getClient,
  type Client,
  type ClientInput,
  updateClient,
} from "@/lib/clients";
import styles from "@/styles/intranet-clients.module.css";

export function ClientDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ClientInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void getClient(id).then((data) => {
      setClient(data);
      setLoading(false);
    });
  }, [id]);

  function openEdit() {
    if (!client) return;
    setForm({
      name: client.name,
      sector: client.sector,
      contact: client.contact,
      email: client.email,
      phone: client.phone,
      notes: client.notes,
    });
    setEditing(true);
  }

  function handleField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => prev ? { ...prev, [e.target.name]: e.target.value } : prev);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !client) return;
    setSaving(true);
    try {
      await updateClient(client.id, form);
      setClient({ ...client, ...form });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteClient(id);
    router.push("/intranet/clientes");
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.empty}>Cargando…</p>
      </main>
    );
  }

  if (!client) {
    return (
      <main className={styles.page}>
        <p className={styles.empty}>Cliente no encontrado.</p>
        <Link href="/intranet/clientes" className={styles.backLink}>
          ← Volver a clientes
        </Link>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.detailNav}>
        <Link href="/intranet/clientes" className={styles.backLink}>
          ← Clientes
        </Link>
        <div className={styles.detailActions}>
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className={`${styles.btnAction} ${styles.btnContact}`}
              title={`Llamar a ${client.phone}`}
            >
              <Phone width={13} height={13} />
              Llamar
            </a>
          )}
          {client.email && (
            <a
              href={`mailto:${client.email}`}
              className={`${styles.btnAction} ${styles.btnContact}`}
              title={`Enviar correo a ${client.email}`}
            >
              <Mail width={13} height={13} />
              Email
            </a>
          )}
          <button type="button" onClick={openEdit} className={styles.btnAction}>
            Editar
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className={`${styles.btnAction} ${confirmDelete ? styles.btnDanger : ""}`}
            onBlur={() => setConfirmDelete(false)}
          >
            {confirmDelete ? "¿Eliminar?" : "Eliminar"}
          </button>
        </div>
      </div>

      <div className={styles.detailHeader}>
        <p className={styles.kicker}>{client.sector || "Cliente"}</p>
        <h1 className={styles.title}>{client.name}</h1>
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.detailBlock}>
          <span className={styles.detailFieldLabel}>Persona de contacto</span>
          <span className={styles.detailFieldValue}>{client.contact || "—"}</span>
        </div>
        <div className={styles.detailBlock}>
          <span className={styles.detailFieldLabel}>Email</span>
          {client.email ? (
            <a href={`mailto:${client.email}`} className={styles.detailFieldLink}>
              {client.email}
            </a>
          ) : (
            <span className={styles.detailFieldValue}>—</span>
          )}
        </div>
        <div className={styles.detailBlock}>
          <span className={styles.detailFieldLabel}>Teléfono</span>
          {client.phone ? (
            <a href={`tel:${client.phone}`} className={styles.detailFieldLink}>
              {client.phone}
            </a>
          ) : (
            <span className={styles.detailFieldValue}>—</span>
          )}
        </div>
      </div>

      {client.notes && (
        <div className={styles.detailNotes}>
          <span className={styles.detailFieldLabel}>Notas internas</span>
          <p className={styles.notesText}>{client.notes}</p>
        </div>
      )}

      {/* Drawer */}
      {editing && form && (
        <>
          <div
            className={styles.backdrop}
            onClick={() => setEditing(false)}
            aria-hidden="true"
          />
          <aside className={`${styles.drawer} ${styles.drawerOpen}`}>
            <div className={styles.drawerHeader}>
              <span className={styles.drawerLabel}>Editar cliente</span>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className={styles.drawerClose}
              >
                <X width={16} height={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={(e) => void handleSave(e)} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="name" className={styles.label}>Nombre *</label>
                <input id="name" name="name" type="text" value={form.name} onChange={handleField} className={styles.input} required />
              </div>
              <div className={styles.field}>
                <label htmlFor="sector" className={styles.label}>Sector</label>
                <input id="sector" name="sector" type="text" value={form.sector} onChange={handleField} className={styles.input} />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="contact" className={styles.label}>Contacto</label>
                  <input id="contact" name="contact" type="text" value={form.contact} onChange={handleField} className={styles.input} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="phone" className={styles.label}>Teléfono</label>
                  <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleField} className={styles.input} />
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <input id="email" name="email" type="email" value={form.email} onChange={handleField} className={styles.input} />
              </div>
              <div className={styles.field}>
                <label htmlFor="notes" className={styles.label}>Notas internas</label>
                <textarea id="notes" name="notes" value={form.notes} onChange={handleField} className={`${styles.input} ${styles.textarea}`} rows={4} />
              </div>
              <div className={styles.formActions}>
                <button type="button" onClick={() => setEditing(false)} className={styles.btnCancel}>Cancelar</button>
                <button type="submit" disabled={saving} className={styles.btnSave}>
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </aside>
        </>
      )}
    </main>
  );
}
