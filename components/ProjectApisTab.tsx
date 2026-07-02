"use client";

import { ExternalLink, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  createExternalApi,
  deleteExternalApi,
  subscribeToExternalApis,
  type ApiEnvironment,
  type ExternalApi,
  type ExternalApiInput,
  updateExternalApi,
} from "@/lib/externalApis";
import { expiryLabel } from "@/lib/expiry";
import styles from "@/styles/intranet-apis.module.css";

type Props = { projectId: string };

const ENV_LABELS: Record<ApiEnvironment, string> = {
  prod: "Producción",
  test: "Test",
  dev: "Dev",
};

const emptyForm: ExternalApiInput = {
  name: "",
  provider: "",
  baseUrl: "",
  apiKey: "",
  docUrl: "",
  environment: "prod",
  notes: "",
  expiresAt: "",
};

export function ProjectApisTab({ projectId }: Props) {
  const [apis, setApis] = useState<ExternalApi[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ExternalApi | null>(null);
  const [form, setForm] = useState<ExternalApiInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [showKeyInForm, setShowKeyInForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeToExternalApis(projectId, setApis);
    return unsub;
  }, [projectId]);

  useEffect(() => {
    if (drawerOpen) setTimeout(() => nameRef.current?.focus(), 120);
  }, [drawerOpen]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setShowKeyInForm(false);
    setConfirmDelete(false);
    setFormError(null);
    setDrawerOpen(true);
  }

  function openEdit(api: ExternalApi) {
    setEditing(api);
    setForm({
      name: api.name,
      provider: api.provider ?? "",
      baseUrl: api.baseUrl ?? "",
      apiKey: api.apiKey ?? "",
      docUrl: api.docUrl ?? "",
      environment: api.environment ?? "prod",
      notes: api.notes ?? "",
      expiresAt: api.expiresAt ?? "",
    });
    setShowKeyInForm(false);
    setConfirmDelete(false);
    setFormError(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditing(null);
    setConfirmDelete(false);
    setShowKeyInForm(false);
    setFormError(null);
  }

  function handleField(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateExternalApi(projectId, editing.id, form);
      } else {
        await createExternalApi(projectId, form);
      }
      closeDrawer();
    } catch {
      // No se cierra el drawer para no perder lo escrito
      setFormError("No se han podido guardar los cambios. Inténtalo de nuevo.");
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
    setFormError(null);
    try {
      await deleteExternalApi(projectId, editing.id);
      closeDrawer();
    } catch {
      setFormError("No se ha podido eliminar la API. Inténtalo de nuevo.");
    }
  }

  function toggleReveal(id: string) {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyKey(api: ExternalApi) {
    if (!api.apiKey) return;
    await navigator.clipboard.writeText(api.apiKey);
    setCopiedId(api.id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  const maskKey = (key: string) => {
    if (!key) return "—";
    if (key.length <= 8) return "●".repeat(key.length);
    return key.slice(0, 4) + "●".repeat(Math.min(key.length - 8, 20)) + key.slice(-4);
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <span />
        <button type="button" onClick={openNew} className={styles.btnNew}>
          <Plus width={14} height={14} strokeWidth={2} />
          Añadir API
        </button>
      </div>

      {apis.length === 0 && (
        <p className={styles.empty}>
          No hay APIs externas registradas. Añade las integraciones que usa este proyecto: Stripe, OpenAI, SendGrid, etc.
        </p>
      )}

      {apis.length > 0 && (
        <div className={styles.grid}>
          {apis.map((api) => {
            const revealed = revealedKeys.has(api.id);
            return (
              <div key={api.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className={styles.cardName}>{api.name}</span>
                      {api.provider && (
                        <span className={styles.cardProvider}>{api.provider}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={styles.envBadge}
                    data-env={api.environment ?? "prod"}
                  >
                    {ENV_LABELS[api.environment ?? "prod"]}
                  </span>
                  <div className={styles.cardActions}>
                    {api.apiKey && (
                      <button
                        type="button"
                        onClick={() => void copyKey(api)}
                        className={`${styles.btnAction} ${copiedId === api.id ? styles.btnCopied : ""}`}
                      >
                        {copiedId === api.id ? "Copiado" : "Copiar key"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(api)}
                      className={styles.btnAction}
                    >
                      Editar
                    </button>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  {api.baseUrl && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardRowLabel}>Base URL</span>
                      <span className={styles.cardRowValue}>{api.baseUrl}</span>
                    </div>
                  )}

                  {api.apiKey && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardRowLabel}>API Key</span>
                      <div className={styles.keyRow}>
                        <span className={revealed ? styles.keyVisible : styles.keyMasked}>
                          {revealed ? api.apiKey : maskKey(api.apiKey)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleReveal(api.id)}
                          className={styles.btnReveal}
                        >
                          {revealed ? "Ocultar" : "Ver"}
                        </button>
                      </div>
                    </div>
                  )}

                  {api.docUrl && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardRowLabel}>Docs</span>
                      <a
                        href={api.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.docLink}
                      >
                        {api.docUrl}
                        <ExternalLink
                          width={11}
                          height={11}
                          strokeWidth={1.5}
                          style={{ display: "inline", marginLeft: 4, verticalAlign: "middle" }}
                        />
                      </a>
                    </div>
                  )}

                  {api.expiresAt && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardRowLabel}>Caduca</span>
                      <span className={styles.cardRowValue}>{expiryLabel(api.expiresAt)}</span>
                    </div>
                  )}

                  {api.notes && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardRowLabel}>Notas</span>
                      <span className={styles.cardNotes}>{api.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <div
          className={styles.backdrop}
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}
      <aside
        className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""}`}
      >
        <div className={styles.drawerHeader}>
          <span className={styles.drawerLabel}>
            {editing ? "Editar API" : "Nueva API"}
          </span>
          <button
            type="button"
            onClick={closeDrawer}
            className={styles.drawerClose}
          >
            <X width={16} height={16} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="apiName" className={styles.label}>
                Nombre *
              </label>
              <input
                ref={nameRef}
                id="apiName"
                name="name"
                type="text"
                value={form.name}
                onChange={handleField}
                className={styles.input}
                required
                autoComplete="off"
                placeholder="Stripe"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="apiProvider" className={styles.label}>
                Proveedor
              </label>
              <input
                id="apiProvider"
                name="provider"
                type="text"
                value={form.provider}
                onChange={handleField}
                className={styles.input}
                autoComplete="off"
                placeholder="Stripe Inc."
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="apiEnv" className={styles.label}>
                Entorno
              </label>
              <select
                id="apiEnv"
                name="environment"
                value={form.environment}
                onChange={handleField}
                className={styles.input}
              >
                <option value="prod">Producción</option>
                <option value="test">Test</option>
                <option value="dev">Dev</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="apiBase" className={styles.label}>
                Base URL
              </label>
              <input
                id="apiBase"
                name="baseUrl"
                type="text"
                value={form.baseUrl}
                onChange={handleField}
                className={styles.input}
                autoComplete="off"
                placeholder="https://api.stripe.com/v1"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="apiKey" className={styles.label}>
              API Key / Secret
            </label>
            <div className={styles.keyInputRow}>
              <input
                id="apiKey"
                name="apiKey"
                type={showKeyInForm ? "text" : "password"}
                value={form.apiKey}
                onChange={handleField}
                className={styles.input}
                autoComplete="off"
                placeholder="sk_live_…"
              />
              <button
                type="button"
                onClick={() => setShowKeyInForm((v) => !v)}
                className={styles.btnToggleKey}
              >
                {showKeyInForm ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="apiDoc" className={styles.label}>
                URL Documentación
              </label>
              <input
                id="apiDoc"
                name="docUrl"
                type="text"
                value={form.docUrl}
                onChange={handleField}
                className={styles.input}
                autoComplete="off"
                placeholder="https://stripe.com/docs"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="apiExpires" className={styles.label}>
                Caducidad
              </label>
              <input
                id="apiExpires"
                name="expiresAt"
                type="date"
                value={form.expiresAt ?? ""}
                onChange={handleField}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="apiNotes" className={styles.label}>
              Notas
            </label>
            <textarea
              id="apiNotes"
              name="notes"
              value={form.notes}
              onChange={handleField}
              className={`${styles.input} ${styles.textarea}`}
              rows={3}
              placeholder="Límites de rate, endpoints usados, notas de configuración…"
            />
          </div>

          {formError && (
            <p role="alert" style={{ color: "#b3261e", fontSize: 12, margin: 0 }}>
              {formError}
            </p>
          )}

          <div className={styles.formActions}>
            <div>
              {editing && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className={styles.btnDelete}
                >
                  {confirmDelete ? "¿Eliminar?" : "Eliminar"}
                </button>
              )}
            </div>
            <div className={styles.formActionsRight}>
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
                {saving ? "Guardando…" : editing ? "Guardar" : "Añadir API"}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
}
