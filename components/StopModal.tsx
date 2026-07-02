"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatElapsed, useTimer } from "@/lib/timerContext";
import { subscribeToProjects, type Project } from "@/lib/projects";
import { normalize } from "@/lib/text";
import styles from "@/styles/intranet-stop-modal.module.css";

export function StopModal() {
  const { activeTimer, elapsed, pendingStop, confirmStop, discardTimer, cancelStop } = useTimer();

  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const preselectedRef = useRef(false);

  // Load projects
  useEffect(() => {
    const unsub = subscribeToProjects(setProjects);
    return unsub;
  }, []);

  // When modal opens, reset fields
  useEffect(() => {
    if (!pendingStop || !activeTimer) return;
    setNotes("");
    setSearch("");
    setSaveError(null);
    setSelectedProject(null);
    preselectedRef.current = false;
    if (!activeTimer.projectId) {
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [pendingStop]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preselecciona el proyecto del timer en cuanto la lista de proyectos esté disponible
  useEffect(() => {
    if (!pendingStop || preselectedRef.current) return;
    const timerProjectId = activeTimer?.projectId;
    if (!timerProjectId) return;
    const found = projects.find((p) => p.id === timerProjectId);
    if (found) {
      setSelectedProject(found);
      preselectedRef.current = true;
    }
  }, [pendingStop, activeTimer?.projectId, projects]);

  const filtered = useMemo(() => {
    const q = search.trim();
    const list = projects.filter((p) => p.status === "activo" || p.status === "pausado");
    if (!q) return list.slice(0, 8);
    const nq = normalize(q);
    return list
      .filter((p) => normalize(p.name).includes(nq) || normalize(p.clientName ?? "").includes(nq))
      .slice(0, 8);
  }, [projects, search]);

  if (!pendingStop || !activeTimer) return null;

  async function handleSave() {
    if (!selectedProject) return;
    setSaving(true);
    setSaveError(null);
    try {
      await confirmStop(notes, selectedProject.id, selectedProject.name);
      setNotes("");
      setSearch("");
      setSelectedProject(null);
    } catch {
      // El timer sigue activo: la sesión no se pierde
      setSaveError("No se pudo guardar la sesión. Comprueba la conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    // Stop timer without saving any entry
    discardTimer();
    setNotes("");
    setSearch("");
    setSelectedProject(null);
  }

  function handleBackdropClick() {
    // No cerrar con click fuera si ya hay notas escritas: se perderían
    if (notes.trim()) return;
    cancelStop();
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Sesión finalizada</p>
            <p className={styles.elapsed}>{formatElapsed(elapsed)}</p>
          </div>
        </div>

        {/* Project selector */}
        <div className={styles.section}>
          <label className={styles.label}>
            Proyecto *
          </label>

          {selectedProject ? (
            <div className={styles.selectedProject}>
              <div className={styles.selectedProjectInfo}>
                <span className={styles.selectedProjectName}>{selectedProject.name}</span>
                {selectedProject.clientName && (
                  <span className={styles.selectedProjectClient}>{selectedProject.clientName}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setSelectedProject(null); setSearch(""); setTimeout(() => searchRef.current?.focus(), 60); }}
                className={styles.btnChange}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className={styles.projectPicker}>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar proyecto…"
                className={styles.searchInput}
                autoComplete="off"
              />
              {filtered.length > 0 && (
                <div className={styles.projectList}>
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={styles.projectRow}
                      onClick={() => setSelectedProject(p)}
                    >
                      <div className={styles.projectRowInfo}>
                        <span className={styles.projectRowName}>{p.name}</span>
                        {p.clientName && (
                          <span className={styles.projectRowClient}>{p.clientName}</span>
                        )}
                      </div>
                      <span className={styles.projectRowStatus} data-status={p.status} />
                    </button>
                  ))}
                </div>
              )}
              {filtered.length === 0 && search && (
                <p className={styles.noResults}>Sin resultados</p>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className={styles.section}>
          <label htmlFor="stopNotes" className={styles.label}>
            ¿En qué trabajaste? <span style={{ opacity: 0.45 }}>(opcional)</span>
          </label>
          <textarea
            id="stopNotes"
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Maquetación header, fix bug login, reunión cliente…"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && selectedProject) void handleSave();
            }}
          />
        </div>

        {saveError && (
          <p role="alert" style={{ color: "#b3261e", fontSize: "0.8rem", margin: "0 0 0.6rem" }}>
            {saveError}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleDiscard}
            className={styles.btnDiscard}
            disabled={saving}
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            className={styles.btnSave}
            disabled={saving || !selectedProject}
          >
            {saving ? "Guardando…" : "Guardar sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
