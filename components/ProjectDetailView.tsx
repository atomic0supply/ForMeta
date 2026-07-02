"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import { subscribeToClients, type Client } from "@/lib/clients";
import {
  createEndpoint,
  deleteEndpoint,
  type ApiEndpoint,
  type ApiEndpointInput,
  type EndpointMethod,
  subscribeToEndpoints,
  updateEndpoint,
} from "@/lib/endpoints";
import {
  deleteProject,
  getProject,
  type Project,
  type ProjectInput,
  type ProjectStatus,
  updateProject,
} from "@/lib/projects";
import { ProjectApisTab } from "@/components/ProjectApisTab";
import { ProjectBudgetTab } from "@/components/ProjectBudgetTab";
import { ProjectFilesTab } from "@/components/ProjectFilesTab";
import { ProjectKanbanTab } from "@/components/ProjectKanbanTab";
import { ProjectLinksTab } from "@/components/ProjectLinksTab";
import { ProjectTimeTab } from "@/components/ProjectTimeTab";
import { ProjectWikiTab } from "@/components/ProjectWikiTab";
import styles from "@/styles/intranet-projects.module.css";

type Tab = "info" | "links" | "apis" | "endpoints" | "tareas" | "tiempo" | "budget" | "wiki" | "files";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  activo: "Activo",
  pausado: "Pausado",
  cerrado: "Cerrado",
};

const METHOD_LIST: EndpointMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const emptyEndpoint: ApiEndpointInput = {
  name: "",
  url: "",
  method: "GET",
  notes: "",
};

export function ProjectDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("info");

  // Edit project state
  const [editingProject, setEditingProject] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectInput | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [projectFormError, setProjectFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Endpoints state
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [endpointDrawerOpen, setEndpointDrawerOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<ApiEndpoint | null>(null);
  const [endpointForm, setEndpointForm] = useState<ApiEndpointInput>(emptyEndpoint);
  const [savingEndpoint, setSavingEndpoint] = useState(false);
  const [confirmDeleteEndpoint, setConfirmDeleteEndpoint] = useState<string | null>(null);
  const [endpointFormError, setEndpointFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const endpointNameRef = useRef<HTMLInputElement>(null);
  // Temporizadores de auto-reset de las confirmaciones de borrado (3s)
  const confirmProjectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmEndpointTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (confirmProjectTimer.current) clearTimeout(confirmProjectTimer.current);
      if (confirmEndpointTimer.current) clearTimeout(confirmEndpointTimer.current);
    };
  }, []);

  useEffect(() => {
    void getProject(id).then((data) => {
      setProject(data);
      setLoading(false);
    });
    const unsubClients = subscribeToClients(setClients);
    const unsubEndpoints = subscribeToEndpoints(id, setEndpoints);
    return () => {
      unsubClients();
      unsubEndpoints();
    };
  }, [id]);

  useEffect(() => {
    if (endpointDrawerOpen) setTimeout(() => endpointNameRef.current?.focus(), 120);
  }, [endpointDrawerOpen]);

  // Project edit
  function openEditProject() {
    if (!project) return;
    setProjectForm({
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
    setProjectFormError(null);
    setEditingProject(true);
  }

  function handleProjectField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setProjectForm((prev) => prev ? { ...prev, [e.target.name]: e.target.value } : prev);
  }

  function handleClientSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = clients.find((c) => c.id === e.target.value);
    setProjectForm((prev) =>
      prev ? { ...prev, clientId: selected?.id ?? "", clientName: selected?.name ?? "" } : prev,
    );
  }

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectForm || !project) return;
    setSavingProject(true);
    setProjectFormError(null);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    try {
      await updateProject(project.id, { ...projectForm, tags });
      setProject({ ...project, ...projectForm, tags });
      setEditingProject(false);
    } catch {
      // No se cierra el drawer para no perder lo escrito
      setProjectFormError("No se han podido guardar los cambios. Inténtalo de nuevo.");
    } finally {
      setSavingProject(false);
    }
  }

  async function handleDeleteProject() {
    if (!confirmDeleteProject) {
      // Auto-reset a los 3s (el onBlur competía con el segundo clic)
      setConfirmDeleteProject(true);
      setPageError(null);
      if (confirmProjectTimer.current) clearTimeout(confirmProjectTimer.current);
      confirmProjectTimer.current = setTimeout(() => setConfirmDeleteProject(false), 3000);
      return;
    }
    if (confirmProjectTimer.current) clearTimeout(confirmProjectTimer.current);
    try {
      await deleteProject(id);
      router.push("/intranet/proyectos");
    } catch {
      setConfirmDeleteProject(false);
      setPageError("No se ha podido eliminar el proyecto. Inténtalo de nuevo.");
    }
  }

  // Endpoint CRUD
  function openNewEndpoint() {
    setEditingEndpoint(null);
    setEndpointForm(emptyEndpoint);
    setEndpointFormError(null);
    setEndpointDrawerOpen(true);
  }

  function openEditEndpoint(endpoint: ApiEndpoint) {
    setEditingEndpoint(endpoint);
    setEndpointForm({ name: endpoint.name, url: endpoint.url, method: endpoint.method, notes: endpoint.notes });
    setEndpointFormError(null);
    setEndpointDrawerOpen(true);
  }

  function closeEndpointDrawer() {
    setEndpointDrawerOpen(false);
    setEditingEndpoint(null);
    setEndpointForm(emptyEndpoint);
    setEndpointFormError(null);
  }

  function handleEndpointField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setEndpointForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSaveEndpoint(e: React.FormEvent) {
    e.preventDefault();
    if (!endpointForm.name.trim() || !endpointForm.url.trim()) return;
    setSavingEndpoint(true);
    setEndpointFormError(null);
    try {
      if (editingEndpoint) {
        await updateEndpoint(id, editingEndpoint.id, endpointForm);
      } else {
        await createEndpoint(id, endpointForm);
      }
      closeEndpointDrawer();
    } catch {
      // No se cierra el drawer para no perder lo escrito
      setEndpointFormError("No se ha podido guardar el endpoint. Inténtalo de nuevo.");
    } finally {
      setSavingEndpoint(false);
    }
  }

  async function handleDeleteEndpoint(endpointId: string) {
    if (confirmDeleteEndpoint !== endpointId) {
      // Auto-reset a los 3s (el onBlur competía con el segundo clic)
      setConfirmDeleteEndpoint(endpointId);
      setPageError(null);
      if (confirmEndpointTimer.current) clearTimeout(confirmEndpointTimer.current);
      confirmEndpointTimer.current = setTimeout(() => setConfirmDeleteEndpoint(null), 3000);
      return;
    }
    if (confirmEndpointTimer.current) clearTimeout(confirmEndpointTimer.current);
    try {
      await deleteEndpoint(id, endpointId);
    } catch {
      setPageError("No se ha podido eliminar el endpoint. Inténtalo de nuevo.");
    }
    setConfirmDeleteEndpoint(null);
  }

  async function copyUrl(endpoint: ApiEndpoint) {
    await navigator.clipboard.writeText(endpoint.url);
    setCopiedId(endpoint.id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  if (loading) {
    return <main className={styles.page}><p className={styles.empty}>Cargando…</p></main>;
  }

  if (!project) {
    return (
      <main className={styles.page}>
        <p className={styles.empty}>Proyecto no encontrado.</p>
        <Link href="/intranet/proyectos" className={styles.backLink}>← Volver a proyectos</Link>
      </main>
    );
  }

  const projectClient =
    clients.find((client) => client.id === project.clientId) ?? null;

  return (
    <main className={styles.page}>
      {/* Nav */}
      <div className={styles.detailNav}>
        <Link href="/intranet/proyectos" className={styles.backLink}>← Proyectos</Link>
        <div className={styles.detailActions}>
          <button type="button" onClick={openEditProject} className={styles.btnAction}>Editar</button>
          <button
            type="button"
            onClick={() => void handleDeleteProject()}
            className={`${styles.btnAction} ${confirmDeleteProject ? styles.btnDanger : ""}`}
          >
            {confirmDeleteProject ? "¿Eliminar?" : "Eliminar"}
          </button>
        </div>
      </div>

      {pageError && (
        <p role="alert" style={{ color: "#b3261e", fontSize: 12, margin: "8px 0 0" }}>
          {pageError}
        </p>
      )}

      {/* Header */}
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderMeta}>
          <span className={styles.statusBadge} data-status={project.status}>
            {STATUS_LABELS[project.status]}
          </span>
          {project.clientName && (
            <span className={styles.clientChip}>{project.clientName}</span>
          )}
        </div>
        <h1 className={styles.title}>{project.name}</h1>
        {project.tags.length > 0 && (
          <div className={styles.tagList}>
            {project.tags.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(["info", "links", "apis", "endpoints", "tareas", "tiempo", "budget", "wiki", "files"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
          >
            {tab === "info" && "Info"}
            {tab === "links" && "Links"}
            {tab === "apis" && "APIs"}
            {tab === "endpoints" && `Endpoints${endpoints.length > 0 ? ` (${endpoints.length})` : ""}`}
            {tab === "tareas" && "Tareas"}
            {tab === "tiempo" && "Tiempo"}
            {tab === "budget" && "Budget"}
            {tab === "wiki" && "Wiki"}
            {tab === "files" && "Files"}
          </button>
        ))}
      </div>

      {/* Info tab */}
      {activeTab === "info" && (
        <div className={styles.tabContent}>
          {project.description && (
            <div className={styles.detailBlock}>
              <span className={styles.detailFieldLabel}>Descripción</span>
              <p className={styles.notesText}>{project.description}</p>
            </div>
          )}
          {project.notes && (
            <div className={styles.detailBlock}>
              <span className={styles.detailFieldLabel}>Notas internas</span>
              <p className={styles.notesText}>{project.notes}</p>
            </div>
          )}
          {!project.description && !project.notes && (
            <p className={styles.empty}>Sin descripción ni notas.</p>
          )}
        </div>
      )}

      {/* Links tab */}
      {activeTab === "links" && (
        <div className={styles.tabContent}>
          <ProjectLinksTab
            projectId={project.id}
            links={{
              githubUrl: project.githubUrl ?? "",
              firebaseUrl: project.firebaseUrl ?? "",
              localPath: project.localPath ?? "",
              devUrl: project.devUrl ?? "",
              externalUrl: project.externalUrl ?? "",
            }}
            onUpdate={(links) => setProject((p) => p ? { ...p, ...links } : p)}
          />
        </div>
      )}

      {/* APIs tab */}
      {activeTab === "apis" && (
        <div className={styles.tabContent}>
          <ProjectApisTab projectId={project.id} />
        </div>
      )}

      {/* Endpoints tab */}
      {activeTab === "endpoints" && (
        <div className={styles.tabContent}>
          <div className={styles.tabActions}>
            <button type="button" onClick={openNewEndpoint} className={styles.btnNew}>
              <Plus width={14} height={14} strokeWidth={2} />
              Añadir endpoint
            </button>
          </div>

          {endpoints.length === 0 && (
            <p className={styles.empty}>No hay endpoints registrados en este proyecto.</p>
          )}

          {endpoints.length > 0 && (
            <div className={styles.endpointList}>
              {endpoints.map((ep) => (
                <div key={ep.id} className={styles.endpointRow}>
                  <span className={styles.methodBadge} data-method={ep.method}>
                    {ep.method}
                  </span>
                  <div className={styles.endpointInfo}>
                    <span className={styles.endpointName}>{ep.name}</span>
                    <span className={styles.endpointUrl}>{ep.url}</span>
                    {ep.notes && <span className={styles.endpointNotes}>{ep.notes}</span>}
                  </div>
                  <div className={styles.endpointActions}>
                    <button
                      type="button"
                      onClick={() => void copyUrl(ep)}
                      className={`${styles.btnAction} ${copiedId === ep.id ? styles.btnCopied : ""}`}
                    >
                      {copiedId === ep.id ? "Copiado" : "Copiar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditEndpoint(ep)}
                      className={styles.btnAction}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteEndpoint(ep.id)}
                      className={`${styles.btnAction} ${confirmDeleteEndpoint === ep.id ? styles.btnDanger : ""}`}
                    >
                      {confirmDeleteEndpoint === ep.id ? "¿Seguro?" : "Eliminar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Endpoint drawer */}
          {endpointDrawerOpen && (
            <div className={styles.backdrop} onClick={closeEndpointDrawer} aria-hidden="true" />
          )}
          <aside className={`${styles.drawer} ${endpointDrawerOpen ? styles.drawerOpen : ""}`}>
            <div className={styles.drawerHeader}>
              <span className={styles.drawerLabel}>
                {editingEndpoint ? "Editar endpoint" : "Nuevo endpoint"}
              </span>
              <button type="button" onClick={closeEndpointDrawer} className={styles.drawerClose}><X width={16} height={16} strokeWidth={1.5} /></button>
            </div>
            <form onSubmit={(e) => void handleSaveEndpoint(e)} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="epName" className={styles.label}>Nombre *</label>
                <input ref={endpointNameRef} id="epName" name="name" type="text" value={endpointForm.name} onChange={handleEndpointField} className={styles.input} required autoComplete="off" />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="epMethod" className={styles.label}>Método</label>
                  <select id="epMethod" name="method" value={endpointForm.method} onChange={handleEndpointField} className={styles.input}>
                    {METHOD_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className={`${styles.field} ${styles.fieldWide}`}>
                  <label htmlFor="epUrl" className={styles.label}>URL *</label>
                  <input id="epUrl" name="url" type="text" value={endpointForm.url} onChange={handleEndpointField} className={styles.input} required autoComplete="off" placeholder="https://…" />
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="epNotes" className={styles.label}>Notas</label>
                <textarea id="epNotes" name="notes" value={endpointForm.notes} onChange={handleEndpointField} className={`${styles.input} ${styles.textarea}`} rows={3} />
              </div>
              {endpointFormError && (
                <p role="alert" style={{ color: "#b3261e", fontSize: 12, margin: 0 }}>
                  {endpointFormError}
                </p>
              )}
              <div className={styles.formActions}>
                <button type="button" onClick={closeEndpointDrawer} className={styles.btnCancel}>Cancelar</button>
                <button type="submit" disabled={savingEndpoint || !endpointForm.name.trim() || !endpointForm.url.trim()} className={styles.btnSave}>
                  {savingEndpoint ? "Guardando…" : editingEndpoint ? "Guardar cambios" : "Añadir endpoint"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {/* Tareas tab */}
      {activeTab === "tareas" && (
        <div className={styles.tabContent}>
          <ProjectKanbanTab
            projectId={project.id}
            project={project}
            client={projectClient}
            onProjectPlanningSummaryChange={(summary) => {
              setProject((current) =>
                current
                  ? { ...current, taskPlanningSummary: summary }
                  : current,
              );
            }}
          />
        </div>
      )}

      {/* Tiempo tab */}
      {activeTab === "tiempo" && (
        <div className={styles.tabContent}>
          <ProjectTimeTab projectId={project.id} projectName={project.name} />
        </div>
      )}

      {/* Budget tab */}
      {activeTab === "budget" && (
        <div className={styles.tabContent}>
          <ProjectBudgetTab
            project={project}
            onProjectUpdate={(updated) => setProject((p) => p ? { ...p, ...updated } : p)}
          />
        </div>
      )}

      {/* Wiki tab */}
      {activeTab === "wiki" && (
        <div className={styles.tabContent} style={{ padding: 0 }}>
          <ProjectWikiTab projectId={project.id} />
        </div>
      )}

      {/* Files tab */}
      {activeTab === "files" && (
        <div className={styles.tabContent}>
          <ProjectFilesTab projectId={project.id} />
        </div>
      )}

      {/* Edit project drawer */}
      {editingProject && projectForm && (
        <>
          <div className={styles.backdrop} onClick={() => setEditingProject(false)} aria-hidden="true" />
          <aside className={`${styles.drawer} ${styles.drawerOpen}`}>
            <div className={styles.drawerHeader}>
              <span className={styles.drawerLabel}>Editar proyecto</span>
              <button type="button" onClick={() => setEditingProject(false)} className={styles.drawerClose}><X width={16} height={16} strokeWidth={1.5} /></button>
            </div>
            <form onSubmit={(e) => void handleSaveProject(e)} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="pname" className={styles.label}>Nombre *</label>
                <input id="pname" name="name" type="text" value={projectForm.name} onChange={handleProjectField} className={styles.input} required />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="pclient" className={styles.label}>Cliente</label>
                  <select id="pclient" value={projectForm.clientId} onChange={handleClientSelect} className={styles.input}>
                    <option value="">Sin cliente</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="pstatus" className={styles.label}>Estado</label>
                  <select id="pstatus" name="status" value={projectForm.status} onChange={handleProjectField} className={styles.input}>
                    <option value="activo">Activo</option>
                    <option value="pausado">Pausado</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="pdesc" className={styles.label}>Descripción</label>
                <textarea id="pdesc" name="description" value={projectForm.description} onChange={handleProjectField} className={`${styles.input} ${styles.textarea}`} rows={3} />
              </div>
              <div className={styles.field}>
                <label htmlFor="ptags" className={styles.label}>Tags (separados por coma)</label>
                <input id="ptags" type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className={styles.input} />
              </div>
              <div className={styles.field}>
                <label htmlFor="pnotes" className={styles.label}>Notas internas</label>
                <textarea id="pnotes" name="notes" value={projectForm.notes} onChange={handleProjectField} className={`${styles.input} ${styles.textarea}`} rows={4} />
              </div>
              <div className={styles.field}>
                <label htmlFor="pgithub" className={styles.label}>GitHub</label>
                <input id="pgithub" name="githubUrl" type="text" value={projectForm.githubUrl ?? ""} onChange={handleProjectField} className={styles.input} placeholder="https://github.com/org/repo" autoComplete="off" />
              </div>
              <div className={styles.field}>
                <label htmlFor="pfirebase" className={styles.label}>Firebase Console</label>
                <input id="pfirebase" name="firebaseUrl" type="text" value={projectForm.firebaseUrl ?? ""} onChange={handleProjectField} className={styles.input} placeholder="https://console.firebase.google.com/project/..." autoComplete="off" />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="pdev" className={styles.label}>Dev / Staging</label>
                  <input id="pdev" name="devUrl" type="text" value={projectForm.devUrl ?? ""} onChange={handleProjectField} className={styles.input} placeholder="https://staging.proyecto.com" autoComplete="off" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="pext" className={styles.label}>URL externa</label>
                  <input id="pext" name="externalUrl" type="text" value={projectForm.externalUrl ?? ""} onChange={handleProjectField} className={styles.input} placeholder="https://proyecto.com" autoComplete="off" />
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="plocal" className={styles.label}>Carpeta local</label>
                <input id="plocal" name="localPath" type="text" value={projectForm.localPath ?? ""} onChange={handleProjectField} className={styles.input} placeholder="/Users/tu/dev/proyecto" autoComplete="off" />
              </div>
              {projectFormError && (
                <p role="alert" style={{ color: "#b3261e", fontSize: 12, margin: 0 }}>
                  {projectFormError}
                </p>
              )}
              <div className={styles.formActions}>
                <button type="button" onClick={() => setEditingProject(false)} className={styles.btnCancel}>Cancelar</button>
                <button type="submit" disabled={savingProject} className={styles.btnSave}>
                  {savingProject ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </aside>
        </>
      )}
    </main>
  );
}
