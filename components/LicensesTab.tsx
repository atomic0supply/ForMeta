"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { subscribeToProjects, type Project } from "@/lib/projects";
import {
  createLicense,
  deleteLicense,
  subscribeToLicenses,
  updateLicense,
  type License,
  type LicenseInput,
} from "@/lib/licenses";
import { expiryLabel, expiryStatus } from "@/lib/expiry";
import styles from "@/styles/intranet-servicios.module.css";

const emptyForm = (): LicenseInput => ({
  name: "",
  vendor: "",
  seats: 1,
  cost: 0,
  currency: "EUR",
  purchaseDate: "",
  expiryDate: "",
  autoRenew: false,
  projectId: null,
  projectName: null,
  licenseKey: "",
  notes: "",
});

export function LicensesTab() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);
  const [form, setForm] = useState<LicenseInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubL = subscribeToLicenses((data) => {
      setLicenses(data);
      setLoading(false);
    });
    const unsubP = subscribeToProjects(setProjects);
    return () => { unsubL(); unsubP(); };
  }, []);

  useEffect(() => {
    if (drawerOpen) setTimeout(() => nameRef.current?.focus(), 150);
  }, [drawerOpen]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "activo" || p.status === "pausado"),
    [projects],
  );

  function setField<K extends keyof LicenseInput>(key: K, value: LicenseInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setConfirmDelete(false);
    setFormError("");
    setDrawerOpen(true);
  }

  function openEdit(license: License) {
    setEditing(license);
    setForm({
      name: license.name,
      vendor: license.vendor,
      seats: license.seats,
      cost: license.cost,
      currency: license.currency,
      purchaseDate: license.purchaseDate,
      expiryDate: license.expiryDate,
      autoRenew: license.autoRenew,
      projectId: license.projectId,
      projectName: license.projectName,
      licenseKey: license.licenseKey,
      notes: license.notes,
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setFormError("");
    try {
      const data: LicenseInput = { ...form, name: form.name.trim() };
      if (editing) await updateLicense(editing.id, data);
      else await createLicense(data);
      closeDrawer();
    } catch (err) {
      // El fallo debe verse: sin catch el error quedaba silenciado.
      console.error("LicensesTab.handleSubmit:", err);
      setFormError("No se pudo guardar la licencia. Inténtalo de nuevo.");
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
      await deleteLicense(editing.id);
      closeDrawer();
    } catch (err) {
      console.error("LicensesTab.handleDelete:", err);
      setFormError("No se pudo eliminar la licencia. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className={styles.topBar}>
        <span className={styles.cellMuted}>{licenses.length} licencias</span>
        <button type="button" onClick={openNew} className={styles.btnNew}>
          <Plus size={13} /> Nueva licencia
        </button>
      </div>

      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : licenses.length === 0 ? (
        <p className={styles.empty}>
          Sin licencias registradas.<br />
          Añade el software con licencia: IDEs, suites, plugins, suscripciones de pago…
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Licencia</th>
                <th className={styles.th}>Proveedor</th>
                <th className={styles.th}>Asientos</th>
                <th className={styles.th}>Proyecto</th>
                <th className={styles.th}>Caduca</th>
                <th className={`${styles.th} ${styles.thRight}`}>Coste</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((l) => {
                const status = expiryStatus(l.expiryDate);
                return (
                  <tr key={l.id} className={styles.tr} data-status={status} onClick={() => openEdit(l)}>
                    <td className={`${styles.td} ${styles.cellName}`}>{l.name}</td>
                    <td className={styles.td}>{l.vendor || <span className={styles.cellEmpty}>—</span>}</td>
                    <td className={styles.td}>{l.seats || <span className={styles.cellEmpty}>—</span>}</td>
                    <td className={styles.td}>{l.projectName || <span className={styles.cellEmpty}>—</span>}</td>
                    <td className={styles.td}>
                      <span className={styles.expiryCell}>
                        <span className={styles.expiryDot} data-status={status} />
                        <span className={styles.expiryText} data-status={status}>{expiryLabel(l.expiryDate)}</span>
                      </span>
                    </td>
                    <td className={`${styles.td} ${styles.tdRight}`}>
                      {l.cost > 0 ? `${l.cost.toFixed(2)} ${l.currency}` : <span className={styles.cellEmpty}>—</span>}
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
          <span className={styles.drawerLabel}>{editing ? "Editar licencia" : "Nueva licencia"}</span>
          <button type="button" onClick={closeDrawer} className={styles.drawerClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className={styles.drawerBody}>
          <div className={styles.formGrid}>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.fieldLabel}>Nombre *</label>
              <input ref={nameRef} className={styles.input} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="JetBrains, Adobe CC…" required />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Proveedor</label>
              <input className={styles.input} value={form.vendor} onChange={(e) => setField("vendor", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Asientos</label>
              <input type="number" min={0} className={styles.input} value={form.seats || ""} onChange={(e) => setField("seats", parseInt(e.target.value, 10) || 0)} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Coste</label>
              <input type="number" min={0} step={0.01} className={styles.input} value={form.cost || ""} onChange={(e) => setField("cost", parseFloat(e.target.value) || 0)} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Moneda</label>
              <select className={styles.select} value={form.currency} onChange={(e) => setField("currency", e.target.value)}>
                <option value="EUR">EUR €</option>
                <option value="USD">USD $</option>
                <option value="GBP">GBP £</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Fecha de compra</label>
              <input type="date" className={styles.input} value={form.purchaseDate} onChange={(e) => setField("purchaseDate", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Caducidad</label>
              <input type="date" className={styles.input} value={form.expiryDate} onChange={(e) => setField("expiryDate", e.target.value)} />
            </div>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.fieldLabel}>Clave de licencia</label>
              <input className={styles.input} value={form.licenseKey} onChange={(e) => setField("licenseKey", e.target.value)} autoComplete="off" />
            </div>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.fieldLabel}>Proyecto asociado</label>
              <select className={styles.select} value={form.projectId ?? ""} onChange={(e) => handleProjectChange(e.target.value)}>
                <option value="">Sin proyecto</option>
                {activeProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Auto-renovación</span>
                <label className={styles.toggle}>
                  <input type="checkbox" checked={form.autoRenew} onChange={(e) => setField("autoRenew", e.target.checked)} />
                  <span className={styles.toggleTrack} />
                </label>
              </div>
            </div>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.fieldLabel}>Notas</label>
              <textarea className={styles.textarea} rows={3} value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
            </div>
          </div>
        </form>
        {formError && (
          <p style={{ color: "var(--danger)", fontSize: "0.8rem", margin: "0 20px 8px" }}>{formError}</p>
        )}
        <div className={styles.drawerFooter}>
          {editing && (
            <button type="button" onClick={handleDelete} className={styles.btnDelete} disabled={saving}>
              {confirmDelete ? "¿Confirmar?" : "Eliminar"}
            </button>
          )}
          <button type="button" onClick={closeDrawer} className={styles.btnCancel}>Cancelar</button>
          <button type="button" onClick={handleSubmit} className={styles.btnSave} disabled={saving || !form.name.trim()}>
            {saving ? "Guardando…" : editing ? "Guardar" : "Crear licencia"}
          </button>
        </div>
      </aside>
    </div>
  );
}
