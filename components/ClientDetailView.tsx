"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Globe, Mail, Phone, Plus, Trash2, X } from "lucide-react";

import {
  CLIENT_STATUSES,
  clientStatusLabel,
  deleteClient,
  getClient,
  type Client,
  type ClientContact,
  type ClientInput,
  type ClientLink,
  type ClientStatus,
  updateClient,
} from "@/lib/clients";
import { subscribeToProjectsByClient, type Project } from "@/lib/projects";
import { subscribeToTimeEntriesByProjectIds, type TimeEntry } from "@/lib/timeEntries";
import { formatDuration } from "@/lib/timerContext";
import styles from "@/styles/intranet-clients.module.css";

function makeId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export function ClientDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ClientInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    void getClient(id).then((data) => {
      setClient(data);
      setLoading(false);
    });
  }, [id]);

  // Subscribe to projects of this client
  useEffect(() => {
    const unsub = subscribeToProjectsByClient(id, setProjects);
    return unsub;
  }, [id]);

  // Subscribe to time entries for those projects
  useEffect(() => {
    const ids = projects.map((p) => p.id);
    if (ids.length === 0) {
      setEntries([]);
      return;
    }
    const unsub = subscribeToTimeEntriesByProjectIds(ids, setEntries);
    return unsub;
  }, [projects]);

  /* ── Stats ───────────────────────────────────────────────────────── */
  const totalSeconds = useMemo(
    () => entries.reduce((a, e) => a + e.durationSeconds, 0),
    [entries],
  );
  const totalSeconds30d = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    return entries
      .filter((e) => e.startedAt.seconds * 1000 >= cutoff)
      .reduce((a, e) => a + e.durationSeconds, 0);
  }, [entries]);
  const activeProjectsCount = useMemo(
    () => projects.filter((p) => p.status === "activo").length,
    [projects],
  );
  const billableEstimate = useMemo(() => {
    // sum hours * each project's hourlyRate
    let total = 0;
    const ratesByProject = new Map(projects.map((p) => [p.id, p.hourlyRate ?? 0]));
    for (const e of entries) {
      const rate = ratesByProject.get(e.projectId) ?? 0;
      total += (e.durationSeconds / 3600) * rate;
    }
    return total;
  }, [projects, entries]);

  /* ── Edit drawer ────────────────────────────────────────────────── */

  function openEdit() {
    if (!client) return;
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
    setEditing(true);
  }

  function setField<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function addContact() {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            contacts: [
              ...prev.contacts,
              { id: makeId(), name: "", role: "", email: "", phone: "" },
            ],
          }
        : prev,
    );
  }

  function updateContact(idx: number, key: keyof ClientContact, val: string) {
    setForm((prev) => {
      if (!prev) return prev;
      const next = [...prev.contacts];
      next[idx] = { ...next[idx], [key]: val };
      return { ...prev, contacts: next };
    });
  }

  function removeContact(idx: number) {
    setForm((prev) =>
      prev ? { ...prev, contacts: prev.contacts.filter((_, i) => i !== idx) } : prev,
    );
  }

  function addLink() {
    setForm((prev) =>
      prev
        ? { ...prev, links: [...prev.links, { id: makeId(), label: "", url: "" }] }
        : prev,
    );
  }

  function updateLink(idx: number, key: keyof ClientLink, val: string) {
    setForm((prev) => {
      if (!prev) return prev;
      const next = [...prev.links];
      next[idx] = { ...next[idx], [key]: val };
      return { ...prev, links: next };
    });
  }

  function removeLink(idx: number) {
    setForm((prev) =>
      prev ? { ...prev, links: prev.links.filter((_, i) => i !== idx) } : prev,
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !client) return;
    setSaving(true);
    try {
      // Strip out contacts/links with no content
      const cleanContacts = form.contacts.filter(
        (c) => c.name.trim() || c.email.trim() || c.phone.trim(),
      );
      const cleanLinks = form.links.filter((l) => l.url.trim());
      const payload: ClientInput = {
        ...form,
        contacts: cleanContacts,
        links: cleanLinks,
      };
      await updateClient(client.id, payload);
      setClient({ ...client, ...payload });
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
        <div className={styles.detailTitleRow}>
          <p className={styles.kicker}>{client.sector || "Cliente"}</p>
          <span className={styles.statusBadge} data-status={client.status}>
            {clientStatusLabel(client.status)}
          </span>
        </div>
        <h1 className={styles.title}>{client.name}</h1>
        {client.website && (
          <a
            href={client.website}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.websiteLink}
          >
            <Globe width={12} height={12} />
            {client.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            <ExternalLink width={10} height={10} />
          </a>
        )}
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statBlock}>
          <span className={styles.statValue}>{projects.length}</span>
          <span className={styles.statLabel}>proyectos</span>
          {activeProjectsCount > 0 && projects.length > activeProjectsCount && (
            <span className={styles.statDelta}>{activeProjectsCount} activos</span>
          )}
        </div>
        <div className={styles.statBlock}>
          <span className={styles.statValue}>
            {totalSeconds > 0 ? formatDuration(totalSeconds) : "—"}
          </span>
          <span className={styles.statLabel}>horas registradas</span>
          {totalSeconds30d > 0 && (
            <span className={styles.statDelta}>{formatDuration(totalSeconds30d)} últimos 30 días</span>
          )}
        </div>
        <div className={styles.statBlock}>
          <span className={styles.statValue}>
            {billableEstimate > 0
              ? billableEstimate.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €"
              : "—"}
          </span>
          <span className={styles.statLabel}>estimado facturable</span>
          <span className={styles.statDelta}>según tarifa por hora</span>
        </div>
        <div className={styles.statBlock}>
          <span className={styles.statValue}>
            {1 + client.contacts.length}
          </span>
          <span className={styles.statLabel}>
            contacto{client.contacts.length === 0 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className={styles.detailBody}>
        {/* Left: Projects */}
        <section className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Proyectos asociados</h2>
            <Link
              href={`/intranet/proyectos?nuevo=1&clientId=${client.id}`}
              className={styles.sectionAction}
            >
              <Plus width={11} height={11} strokeWidth={2} />
              Nuevo
            </Link>
          </div>
          {projects.length === 0 ? (
            <p className={styles.sectionEmpty}>Aún no hay proyectos asociados.</p>
          ) : (
            <ul className={styles.projectsList}>
              {projects.map((p) => {
                const projSeconds = entries
                  .filter((e) => e.projectId === p.id)
                  .reduce((a, e) => a + e.durationSeconds, 0);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/intranet/proyectos/${p.id}`}
                      className={styles.projectRow}
                    >
                      <span
                        className={styles.projectStatusDot}
                        data-status={p.status}
                      />
                      <span className={styles.projectRowName}>{p.name}</span>
                      {p.tags?.[0] && (
                        <span className={styles.projectRowTag}>{p.tags[0]}</span>
                      )}
                      <span className={styles.projectRowHours}>
                        {projSeconds > 0 ? formatDuration(projSeconds) : "—"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Right: Contacts + Links */}
        <aside className={styles.detailAside}>
          <section className={styles.detailSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Contactos</h2>
            </div>
            <div className={styles.contactsList}>
              {/* Primary contact */}
              {(client.contact || client.email || client.phone) && (
                <article className={styles.contactCard}>
                  <div className={styles.contactCardHeader}>
                    <span className={styles.contactCardName}>
                      {client.contact || "Contacto principal"}
                    </span>
                    <span className={styles.contactCardRole}>Principal</span>
                  </div>
                  {client.email && (
                    <a
                      href={`mailto:${client.email}`}
                      className={styles.contactCardLink}
                    >
                      <Mail width={11} height={11} />
                      {client.email}
                    </a>
                  )}
                  {client.phone && (
                    <a
                      href={`tel:${client.phone}`}
                      className={styles.contactCardLink}
                    >
                      <Phone width={11} height={11} />
                      {client.phone}
                    </a>
                  )}
                </article>
              )}
              {/* Secondary contacts */}
              {client.contacts.map((c) => (
                <article key={c.id} className={styles.contactCard}>
                  <div className={styles.contactCardHeader}>
                    <span className={styles.contactCardName}>{c.name || "—"}</span>
                    {c.role && <span className={styles.contactCardRole}>{c.role}</span>}
                  </div>
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className={styles.contactCardLink}
                    >
                      <Mail width={11} height={11} />
                      {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className={styles.contactCardLink}
                    >
                      <Phone width={11} height={11} />
                      {c.phone}
                    </a>
                  )}
                </article>
              ))}
              {!client.contact && !client.email && !client.phone && client.contacts.length === 0 && (
                <p className={styles.sectionEmpty}>Sin contactos registrados.</p>
              )}
            </div>
          </section>

          {client.links.length > 0 && (
            <section className={styles.detailSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Links</h2>
              </div>
              <ul className={styles.linksList}>
                {client.links.map((l) => (
                  <li key={l.id}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkRow}
                    >
                      <span className={styles.linkRowLabel}>{l.label || "Link"}</span>
                      <ExternalLink width={11} height={11} strokeWidth={1.75} />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {client.notes && (
        <div className={styles.detailNotes}>
          <span className={styles.detailFieldLabel}>Notas internas</span>
          <p className={styles.notesText}>{client.notes}</p>
        </div>
      )}

      {/* Edit drawer */}
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
              <div className={styles.formSection}>
                <div className={styles.field}>
                  <label htmlFor="name" className={styles.label}>Nombre *</label>
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className={styles.input}
                    required
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
                  />
                </div>
              </div>

              <div className={styles.formSection}>
                <div className={styles.formSectionHeader}>
                  <p className={styles.formSectionLabel}>Contactos secundarios</p>
                  <button type="button" onClick={addContact} className={styles.btnAddInline}>
                    <Plus width={11} height={11} strokeWidth={2} /> Añadir
                  </button>
                </div>
                {form.contacts.length === 0 && (
                  <p className={styles.formHint}>
                    Otras personas relevantes en este cliente (financiero, técnico…).
                  </p>
                )}
                {form.contacts.map((c, idx) => (
                  <div key={c.id} className={styles.repeaterCard}>
                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label className={styles.label}>Nombre</label>
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => updateContact(idx, "name", e.target.value)}
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Rol</label>
                        <input
                          type="text"
                          value={c.role}
                          placeholder="Financiero, Técnico…"
                          onChange={(e) => updateContact(idx, "role", e.target.value)}
                          className={styles.input}
                        />
                      </div>
                    </div>
                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label className={styles.label}>Email</label>
                        <input
                          type="email"
                          value={c.email}
                          onChange={(e) => updateContact(idx, "email", e.target.value)}
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Teléfono</label>
                        <input
                          type="tel"
                          value={c.phone}
                          onChange={(e) => updateContact(idx, "phone", e.target.value)}
                          className={styles.input}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContact(idx)}
                      className={styles.btnRemoveInline}
                      aria-label="Eliminar contacto"
                    >
                      <Trash2 width={12} height={12} strokeWidth={1.75} />
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.formSection}>
                <div className={styles.formSectionHeader}>
                  <p className={styles.formSectionLabel}>Links</p>
                  <button type="button" onClick={addLink} className={styles.btnAddInline}>
                    <Plus width={11} height={11} strokeWidth={2} /> Añadir
                  </button>
                </div>
                {form.links.length === 0 && (
                  <p className={styles.formHint}>
                    Portales, paneles internos, drives, documentos compartidos…
                  </p>
                )}
                {form.links.map((l, idx) => (
                  <div key={l.id} className={styles.repeaterRow}>
                    <input
                      type="text"
                      value={l.label}
                      placeholder="Etiqueta"
                      onChange={(e) => updateLink(idx, "label", e.target.value)}
                      className={`${styles.input} ${styles.repeaterRowLabel}`}
                    />
                    <input
                      type="url"
                      value={l.url}
                      placeholder="https://..."
                      onChange={(e) => updateLink(idx, "url", e.target.value)}
                      className={`${styles.input} ${styles.repeaterRowUrl}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(idx)}
                      className={styles.btnRemoveInline}
                      aria-label="Eliminar link"
                    >
                      <Trash2 width={12} height={12} strokeWidth={1.75} />
                    </button>
                  </div>
                ))}
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
                <button type="button" onClick={() => setEditing(false)} className={styles.btnCancel}>
                  Cancelar
                </button>
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
