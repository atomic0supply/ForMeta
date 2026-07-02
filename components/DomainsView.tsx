"use client";

import { Globe, Pencil, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { subscribeToProjects, type Project } from "@/lib/projects";
import {
  createDomain,
  deleteDomain,
  expiryLabel,
  expiryStatus,
  subscribeToDomains,
  updateDomain,
  type Domain,
  type DomainInput,
  type DomainLink,
} from "@/lib/domains";
import styles from "@/styles/intranet-domains.module.css";

/* ── Empty form ─────────────────────────────────────────────────────────── */

const emptyForm = (): DomainInput => ({
  name: "",
  registrar: "",
  registrationDate: "",
  expiryDate: "",
  autoRenew: true,
  price: 0,
  currency: "EUR",
  projectId: null,
  projectName: null,
  dnsNotes: "",
  links: [],
  notes: "",
});

/* ── Component ──────────────────────────────────────────────────────────── */

export function DomainsView() {
  const [domains, setDomains]   = useState<Domain[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);

  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [editing, setEditing]             = useState<Domain | null>(null);
  const [form, setForm]                   = useState<DomainInput>(emptyForm());
  const [saving, setSaving]               = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError]         = useState("");

  const nameRef = useRef<HTMLInputElement>(null);

  /* Suscripciones */
  useEffect(() => {
    const unsubD = subscribeToDomains((data) => {
      setDomains(data);
      setLoading(false);
    });
    const unsubP = subscribeToProjects(setProjects);
    return () => { unsubD(); unsubP(); };
  }, []);

  /* Focus al abrir drawer */
  useEffect(() => {
    if (drawerOpen) setTimeout(() => nameRef.current?.focus(), 150);
  }, [drawerOpen]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "activo" || p.status === "pausado"),
    [projects],
  );

  /* ── Drawer helpers ─────────────────────────────────────────────────── */

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setConfirmDelete(false);
    setFormError("");
    setDrawerOpen(true);
  }

  function openEdit(domain: Domain, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditing(domain);
    setForm({
      name:             domain.name,
      registrar:        domain.registrar,
      registrationDate: domain.registrationDate,
      expiryDate:       domain.expiryDate,
      autoRenew:        domain.autoRenew,
      price:            domain.price,
      currency:         domain.currency,
      projectId:        domain.projectId,
      projectName:      domain.projectName,
      dnsNotes:         domain.dnsNotes,
      links:            domain.links ?? [],
      notes:            domain.notes,
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

  /* ── Field helpers ──────────────────────────────────────────────────── */

  function setField<K extends keyof DomainInput>(key: K, value: DomainInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleProjectChange(projectId: string) {
    if (!projectId) {
      setField("projectId", null);
      setField("projectName", null);
      return;
    }
    const p = projects.find((pr) => pr.id === projectId);
    setField("projectId", projectId);
    setField("projectName", p?.name ?? null);
  }

  /* ── Links helpers ──────────────────────────────────────────────────── */

  function addLink() {
    setForm((f) => ({ ...f, links: [...(f.links ?? []), { label: "", url: "" }] }));
  }

  function updateLink(idx: number, field: keyof DomainLink, value: string) {
    setForm((f) => {
      const links = [...(f.links ?? [])];
      links[idx] = { ...links[idx], [field]: value };
      return { ...f, links };
    });
  }

  function removeLink(idx: number) {
    setForm((f) => ({ ...f, links: (f.links ?? []).filter((_, i) => i !== idx) }));
  }

  /* ── CRUD ───────────────────────────────────────────────────────────── */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.expiryDate) return;
    setSaving(true);
    setFormError("");
    try {
      const data: DomainInput = {
        ...form,
        name:    form.name.trim(),
        links:   (form.links ?? []).filter((l) => l.url.trim()),
      };
      if (editing) {
        await updateDomain(editing.id, data);
      } else {
        await createDomain(data);
      }
      closeDrawer();
    } catch (err) {
      // El fallo debe verse: sin catch el error quedaba silenciado.
      console.error("DomainsView.handleSubmit:", err);
      setFormError("No se pudo guardar el dominio. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    setFormError("");
    try {
      await deleteDomain(editing.id);
      closeDrawer();
    } catch (err) {
      console.error("DomainsView.handleDelete:", err);
      setFormError("No se pudo eliminar el dominio. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <main className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <p className={styles.kicker}>Intranet</p>
          <h1 className={styles.title}>Dominios</h1>
        </div>
        <button type="button" onClick={openNew} className={styles.btnNew}>
          <Plus size={13} />
          Nuevo dominio
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : domains.length === 0 ? (
        <p className={styles.empty}>
          Sin dominios registrados.<br />
          Añade el primero con el botón &ldquo;Nuevo dominio&rdquo;.
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <div className={styles.tableHeader}>
            <span>Dominio</span>
            <span>Proveedor</span>
            <span>Proyecto</span>
            <span>Caduca</span>
            <span>Auto-renew</span>
            <span style={{ textAlign: "right" }}>Precio</span>
            <span />
          </div>
          {domains.map((domain) => {
            const status = expiryStatus(domain.expiryDate);
            return (
              <div
                key={domain.id}
                className={styles.row}
                data-status={status}
                onClick={() => openEdit(domain)}
              >
                {/* Dominio */}
                <div className={styles.cellDomain}>
                  <span className={styles.domainIcon}>
                    <Globe size={13} />
                  </span>
                  <span className={styles.domainName}>{domain.name}</span>
                </div>

                {/* Proveedor */}
                <span className={styles.cellText}>
                  {domain.registrar || <span className={styles.cellEmpty}>—</span>}
                </span>

                {/* Proyecto */}
                <span className={styles.cellMuted}>
                  {domain.projectName || <span className={styles.cellEmpty}>—</span>}
                </span>

                {/* Caduca */}
                <div className={styles.expiryCell}>
                  <span className={styles.expiryDot} data-status={status} />
                  <span className={styles.expiryText} data-status={status}>
                    {expiryLabel(domain.expiryDate)}
                  </span>
                </div>

                {/* Auto-renew */}
                <span
                  className={styles.renewBadge}
                  data-active={String(domain.autoRenew)}
                >
                  {domain.autoRenew ? "Activo" : "No"}
                </span>

                {/* Precio */}
                <span className={styles.priceCell}>
                  {domain.price > 0
                    ? `${domain.price.toFixed(2)} ${domain.currency}`
                    : <span className={styles.cellEmpty}>—</span>}
                </span>

                {/* Editar */}
                <button
                  type="button"
                  className={styles.rowBtn}
                  onClick={(e) => openEdit(domain, e)}
                  title="Editar"
                >
                  <Pencil size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Backdrop */}
      {drawerOpen && <div className={styles.backdrop} onClick={closeDrawer} />}

      {/* Drawer */}
      <aside className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""}`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerLabel}>
            {editing ? "Editar dominio" : "Nuevo dominio"}
          </span>
          <button type="button" onClick={closeDrawer} className={styles.drawerClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.drawerBody}>

          {/* ── General ── */}
          <div className={styles.formSection}>
            <p className={styles.formSectionTitle}>General</p>
            <div className={styles.formGrid}>
              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.fieldLabel}>Dominio *</label>
                <input
                  ref={nameRef}
                  className={styles.input}
                  placeholder="example.com"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Proveedor / Registrar</label>
                <input
                  className={styles.input}
                  placeholder="GoDaddy, Namecheap…"
                  value={form.registrar}
                  onChange={(e) => setField("registrar", e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Fecha de registro</label>
                <input
                  type="date"
                  className={styles.input}
                  value={form.registrationDate}
                  onChange={(e) => setField("registrationDate", e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Fecha de caducidad *</label>
                <input
                  type="date"
                  className={styles.input}
                  value={form.expiryDate}
                  onChange={(e) => setField("expiryDate", e.target.value)}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Precio anual</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={styles.input}
                  placeholder="12.00"
                  value={form.price || ""}
                  onChange={(e) => setField("price", parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Moneda</label>
                <select
                  className={styles.select}
                  value={form.currency}
                  onChange={(e) => setField("currency", e.target.value)}
                >
                  <option value="EUR">EUR €</option>
                  <option value="USD">USD $</option>
                  <option value="GBP">GBP £</option>
                </select>
              </div>

              <div className={`${styles.field} ${styles.formGridFull}`}>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Auto-renovación</span>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={form.autoRenew}
                      onChange={(e) => setField("autoRenew", e.target.checked)}
                    />
                    <span className={styles.toggleTrack} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ── Proyecto ── */}
          <div className={styles.formSection}>
            <p className={styles.formSectionTitle}>Proyecto asociado</p>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Proyecto</label>
              <select
                className={styles.select}
                value={form.projectId ?? ""}
                onChange={(e) => handleProjectChange(e.target.value)}
              >
                <option value="">Sin proyecto</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── DNS / Notas técnicas ── */}
          <div className={styles.formSection}>
            <p className={styles.formSectionTitle}>DNS / Notas técnicas</p>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Apuntes DNS</label>
              <textarea
                className={styles.textarea}
                placeholder={"A     @     185.x.x.x\nCNAME www   @\nMX    @     mail.example.com"}
                rows={4}
                value={form.dnsNotes}
                onChange={(e) => setField("dnsNotes", e.target.value)}
              />
            </div>
          </div>

          {/* ── Links activos ── */}
          <div className={styles.formSection}>
            <p className={styles.formSectionTitle}>Links activos</p>
            {form.links && form.links.length > 0 && (
              <div className={styles.linksList}>
                {form.links.map((link, idx) => (
                  <div key={idx} className={styles.linkRow}>
                    <input
                      className={styles.linkRowInput}
                      placeholder="Etiqueta"
                      value={link.label}
                      onChange={(e) => updateLink(idx, "label", e.target.value)}
                    />
                    <input
                      className={styles.linkRowInput}
                      placeholder="https://…"
                      type="url"
                      value={link.url}
                      onChange={(e) => updateLink(idx, "url", e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.btnRemoveLink}
                      onClick={() => removeLink(idx)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={addLink} className={styles.btnAddLink}>
              <Plus size={11} />
              Añadir link
            </button>
          </div>

          {/* ── Notas ── */}
          <div className={styles.formSection}>
            <p className={styles.formSectionTitle}>Notas</p>
            <div className={styles.field}>
              <textarea
                className={styles.textarea}
                placeholder="Cualquier información adicional…"
                rows={3}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        {formError && (
          <p style={{ color: "var(--danger)", fontSize: "0.8rem", margin: "0 20px 8px" }}>{formError}</p>
        )}
        <div className={styles.drawerFooter}>
          {editing && (
            <button
              type="button"
              onClick={handleDelete}
              className={styles.btnDelete}
              disabled={saving}
            >
              {confirmDelete ? "¿Confirmar?" : "Eliminar"}
            </button>
          )}
          <button type="button" onClick={closeDrawer} className={styles.btnCancel}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={styles.btnSave}
            disabled={saving || !form.name.trim() || !form.expiryDate}
          >
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear dominio"}
          </button>
        </div>
      </aside>
    </main>
  );
}
