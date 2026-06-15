"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { subscribeToProjects, type Project } from "@/lib/projects";
import {
  createService,
  deleteService,
  subscribeToServices,
  updateService,
  type BillingCycle,
  type Service,
  type ServiceCategory,
  type ServiceInput,
} from "@/lib/services";
import { expiryLabel, expiryStatus } from "@/lib/expiry";
import styles from "@/styles/intranet-servicios.module.css";

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  hosting: "Hosting",
  infra: "Infraestructura",
  saas: "SaaS",
  otros: "Otros",
};

const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: "Mensual",
  yearly: "Anual",
  quarterly: "Trimestral",
  oneoff: "Pago único",
};

const emptyForm = (): ServiceInput => ({
  name: "",
  provider: "",
  category: "infra",
  cost: 0,
  currency: "EUR",
  billingCycle: "yearly",
  renewalDate: "",
  autoRenew: true,
  projectId: null,
  projectName: null,
  notes: "",
  links: [],
});

export function ServicesTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubS = subscribeToServices((data) => {
      setServices(data);
      setLoading(false);
    });
    const unsubP = subscribeToProjects(setProjects);
    return () => { unsubS(); unsubP(); };
  }, []);

  useEffect(() => {
    if (drawerOpen) setTimeout(() => nameRef.current?.focus(), 150);
  }, [drawerOpen]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "activo" || p.status === "pausado"),
    [projects],
  );

  function setField<K extends keyof ServiceInput>(key: K, value: ServiceInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setForm({
      name: service.name,
      provider: service.provider,
      category: service.category,
      cost: service.cost,
      currency: service.currency,
      billingCycle: service.billingCycle,
      renewalDate: service.renewalDate,
      autoRenew: service.autoRenew,
      projectId: service.projectId,
      projectName: service.projectName,
      notes: service.notes,
      links: service.links ?? [],
    });
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setConfirmDelete(false);
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
    try {
      const data: ServiceInput = { ...form, name: form.name.trim() };
      if (editing) await updateService(editing.id, data);
      else await createService(data);
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
      await deleteService(editing.id);
      closeDrawer();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className={styles.topBar}>
        <span className={styles.cellMuted}>{services.length} servicios</span>
        <button type="button" onClick={openNew} className={styles.btnNew}>
          <Plus size={13} /> Nuevo servicio
        </button>
      </div>

      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : services.length === 0 ? (
        <p className={styles.empty}>
          Sin servicios registrados.<br />
          Añade la infraestructura contratada: Google Cloud, Firebase, VPS, SaaS…
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Servicio</th>
                <th className={styles.th}>Proveedor</th>
                <th className={styles.th}>Categoría</th>
                <th className={styles.th}>Proyecto</th>
                <th className={styles.th}>Renueva</th>
                <th className={`${styles.th} ${styles.thRight}`}>Coste</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => {
                const status = expiryStatus(s.renewalDate);
                return (
                  <tr key={s.id} className={styles.tr} data-status={status} onClick={() => openEdit(s)}>
                    <td className={`${styles.td} ${styles.cellName}`}>{s.name}</td>
                    <td className={styles.td}>{s.provider || <span className={styles.cellEmpty}>—</span>}</td>
                    <td className={styles.td}><span className={styles.badge}>{CATEGORY_LABELS[s.category]}</span></td>
                    <td className={styles.td}>
                      {s.projectName || <span className={styles.cellEmpty}>—</span>}
                    </td>
                    <td className={styles.td}>
                      <span className={styles.expiryCell}>
                        <span className={styles.expiryDot} data-status={status} />
                        <span className={styles.expiryText} data-status={status}>{expiryLabel(s.renewalDate)}</span>
                      </span>
                    </td>
                    <td className={`${styles.td} ${styles.tdRight}`}>
                      {s.cost > 0 ? `${s.cost.toFixed(2)} ${s.currency}/${CYCLE_LABELS[s.billingCycle].toLowerCase()}` : <span className={styles.cellEmpty}>—</span>}
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
          <span className={styles.drawerLabel}>{editing ? "Editar servicio" : "Nuevo servicio"}</span>
          <button type="button" onClick={closeDrawer} className={styles.drawerClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className={styles.drawerBody}>
          <div className={styles.formGrid}>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.fieldLabel}>Nombre *</label>
              <input ref={nameRef} className={styles.input} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Google Cloud, Firebase…" required />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Proveedor</label>
              <input className={styles.input} value={form.provider} onChange={(e) => setField("provider", e.target.value)} placeholder="Google, AWS…" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Categoría</label>
              <select className={styles.select} value={form.category} onChange={(e) => setField("category", e.target.value as ServiceCategory)}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
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
              <label className={styles.fieldLabel}>Ciclo de facturación</label>
              <select className={styles.select} value={form.billingCycle} onChange={(e) => setField("billingCycle", e.target.value as BillingCycle)}>
                {Object.entries(CYCLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Próxima renovación</label>
              <input type="date" className={styles.input} value={form.renewalDate} onChange={(e) => setField("renewalDate", e.target.value)} />
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
        <div className={styles.drawerFooter}>
          {editing && (
            <button type="button" onClick={handleDelete} className={styles.btnDelete} disabled={saving}>
              {confirmDelete ? "¿Confirmar?" : "Eliminar"}
            </button>
          )}
          <button type="button" onClick={closeDrawer} className={styles.btnCancel}>Cancelar</button>
          <button type="button" onClick={handleSubmit} className={styles.btnSave} disabled={saving || !form.name.trim()}>
            {saving ? "Guardando…" : editing ? "Guardar" : "Crear servicio"}
          </button>
        </div>
      </aside>
    </div>
  );
}
