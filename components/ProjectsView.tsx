"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Code, Database, Folder, GitBranch, Globe, Plus, X } from "lucide-react";

import { subscribeToClients, type Client } from "@/lib/clients";
import {
  createProject,
  deleteProject,
  type Project,
  type ProjectInput,
  type ProjectStatus,
  subscribeToProjects,
  updateProject,
} from "@/lib/projects";
import { ensureProjectFiles } from "@/lib/projectFilesClient";
import styles from "@/styles/intranet-projects.module.css";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  activo: "Activo",
  pausado: "Pausado",
  cerrado: "Cerrado",
};

const LINK_ICONS = [
  { key: "githubUrl", label: "GitHub", icon: GitBranch, isPath: false },
  { key: "firebaseUrl", label: "Firebase Console", icon: Database, isPath: false },
  { key: "localPath", label: "Carpeta local", icon: Folder, isPath: true },
  { key: "devUrl", label: "Dev / Staging", icon: Code, isPath: false },
  { key: "externalUrl", label: "Web pública", icon: Globe, isPath: false },
] as const;

function buildHref(value: string, isPath: boolean) {
  if (!value) return null;
  if (isPath) {
    if (/^[a-z]+:\/\//i.test(value) || value.startsWith("file://")) return value;
    return `file://${value}`;
  }
  return value;
}

const emptyForm: ProjectInput = {
  name: "",
  clientId: "",
  clientName: "",
  status: "activo",
  description: "",
  tags: [],
  notes: "",
  githubUrl: "",
  firebaseUrl: "",
  localPath: "",
  devUrl: "",
  externalUrl: "",
};

export function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectInput>(emptyForm);
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubProjects = subscribeToProjects((data) => {
      setProjects(data);
      setLoading(false);
    });
    const unsubClients = subscribeToClients(setClients);
    return () => {
      unsubProjects();
      unsubClients();
    };
  }, []);

  useEffect(() => {
    if (drawerOpen) setTimeout(() => nameRef.current?.focus(), 120);
  }, [drawerOpen]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setTagsInput("");
    setDrawerOpen(true);
  }

  function openEdit(project: Project, e: React.MouseEvent) {
    e.preventDefault();
    setEditing(project);
    setForm({
      name: project.name,
      clientId: project.clientId,
      clientName: project.clientName,
      status: project.status,
      description: project.description,
      tags: project.tags,
      notes: project.notes,
      githubUrl: project.githubUrl ?? "",
      firebaseUrl: project.firebaseUrl ?? "",
      localPath: project.localPath ?? "",
      devUrl: project.devUrl ?? "",
      externalUrl: project.externalUrl ?? "",
    });
    setTagsInput(project.tags.join(", "));
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setTagsInput("");
  }

  function handleField(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleClientSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = clients.find((c) => c.id === e.target.value);
    setForm((prev) => ({
      ...prev,
      clientId: selected?.id ?? "",
      clientName: selected?.name ?? "",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      if (editing) {
        await updateProject(editing.id, { ...form, tags });
      } else {
        const newId = await createProject({ ...form, tags });
        // Crea en segundo plano la estructura de carpetas en Drive (Diseño,
        // Imágenes, Código, Administración). No bloquea el cierre del drawer.
        void ensureProjectFiles(newId);
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
    await deleteProject(id);
    setConfirmDelete(null);
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Trabajo activo</p>
          <h1 className={styles.title}>Proyectos</h1>
        </div>
        <button type="button" onClick={openNew} className={styles.btnNew}>
          <Plus width={14} height={14} strokeWidth={2} />
          Nuevo proyecto
        </button>
      </div>

      {loading && <p className={styles.empty}>Cargando proyectos…</p>}

      {!loading && projects.length === 0 && (
        <p className={styles.empty}>
          Aún no hay proyectos. Crea el primero con el botón de arriba.
        </p>
      )}

      {!loading && projects.length > 0 && (
        <div className={styles.list}>
          <div className={styles.listHeader}>
            <span>Proyecto</span>
            <span>Cliente</span>
            <span>Estado</span>
            <span>Tags</span>
            <span>Enlaces</span>
            <span />
          </div>
          {projects.map((project) => (
            <div key={project.id} className={styles.row}>
              <Link
                href={`/intranet/proyectos/${project.id}`}
                className={styles.rowName}
              >
                {project.name}
              </Link>
              <span className={styles.rowMeta}>
                {project.clientName || "—"}
              </span>
              <span>
                <span
                  className={styles.statusBadge}
                  data-status={project.status}
                >
                  {STATUS_LABELS[project.status]}
                </span>
              </span>
              <div className={styles.tagList}>
                {project.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className={styles.linkIcons}>
                {LINK_ICONS.map(({ key, label, icon: Icon, isPath }) => {
                  const value = (project[key] ?? "").trim();
                  const href = buildHref(value, isPath);
                  if (href) {
                    return (
                      <a
                        key={key}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        title={`${label}: ${value}`}
                        aria-label={`${label} de ${project.name}`}
                        className={`${styles.linkIcon} ${styles.linkIconActive}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icon width={14} height={14} strokeWidth={1.6} />
                      </a>
                    );
                  }
                  return (
                    <span
                      key={key}
                      title={`${label}: sin guardar`}
                      aria-label={`${label} no guardado`}
                      className={styles.linkIcon}
                    >
                      <Icon width={14} height={14} strokeWidth={1.6} />
                    </span>
                  );
                })}
              </div>
              <div className={styles.rowActions}>
                <button
                  type="button"
                  onClick={(e) => openEdit(project, e)}
                  className={styles.btnAction}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(project.id)}
                  className={`${styles.btnAction} ${confirmDelete === project.id ? styles.btnDanger : ""}`}
                  onBlur={() => setConfirmDelete(null)}
                >
                  {confirmDelete === project.id ? "¿Seguro?" : "Eliminar"}
                </button>
              </div>
            </div>
          ))}
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
            {editing ? "Editar proyecto" : "Nuevo proyecto"}
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
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Nombre *
            </label>
            <input
              ref={nameRef}
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleField}
              className={styles.input}
              required
              autoComplete="off"
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="clientSelect" className={styles.label}>
                Cliente
              </label>
              <select
                id="clientSelect"
                value={form.clientId}
                onChange={handleClientSelect}
                className={styles.input}
              >
                <option value="">Sin cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="status" className={styles.label}>
                Estado
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleField}
                className={styles.input}
              >
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleField}
              className={`${styles.input} ${styles.textarea}`}
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="tagsInput" className={styles.label}>
              Tags (separados por coma)
            </label>
            <input
              id="tagsInput"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className={styles.input}
              placeholder="nextjs, firebase, web"
              autoComplete="off"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="notes" className={styles.label}>
              Notas internas
            </label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleField}
              className={`${styles.input} ${styles.textarea}`}
              rows={4}
            />
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
              {saving
                ? "Guardando…"
                : editing
                  ? "Guardar cambios"
                  : "Crear proyecto"}
            </button>
          </div>
        </form>
      </aside>
    </main>
  );
}
