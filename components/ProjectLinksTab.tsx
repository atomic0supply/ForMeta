"use client";

import { Code, Database, ExternalLink, Folder, GitBranch, Globe } from "lucide-react";
import { useState } from "react";

import { updateProject } from "@/lib/projects";
import styles from "@/styles/intranet-links.module.css";

type LinksData = {
  githubUrl: string;
  firebaseUrl: string;
  localPath: string;
  devUrl: string;
  externalUrl: string;
};

type Props = {
  projectId: string;
  links: LinksData;
  onUpdate: (links: LinksData) => void;
};

const LINK_DEFS = [
  {
    key: "githubUrl" as const,
    label: "GitHub",
    icon: GitBranch,
    placeholder: "https://github.com/org/repo",
  },
  {
    key: "firebaseUrl" as const,
    label: "Firebase Console",
    icon: Database,
    placeholder: "https://console.firebase.google.com/project/...",
  },
  {
    key: "localPath" as const,
    label: "Carpeta local",
    icon: Folder,
    placeholder: "/Users/tu/dev/proyecto",
  },
  {
    key: "devUrl" as const,
    label: "Dev / Staging",
    icon: Code,
    placeholder: "https://staging.tu-proyecto.com",
  },
  {
    key: "externalUrl" as const,
    label: "URL externa (prod)",
    icon: Globe,
    placeholder: "https://tu-proyecto.com",
  },
];

export function ProjectLinksTab({ projectId, links, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<LinksData>(links);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasAnyLink = Object.values(links).some((v) => v?.trim());

  function handleField(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function openEdit() {
    setForm({
      githubUrl: links.githubUrl ?? "",
      firebaseUrl: links.firebaseUrl ?? "",
      localPath: links.localPath ?? "",
      devUrl: links.devUrl ?? "",
      externalUrl: links.externalUrl ?? "",
    });
    setSaveError(null);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await updateProject(projectId, form);
      onUpdate(form);
      setEditing(false);
    } catch {
      // No se cierra el formulario para no perder lo escrito
      setSaveError("No se han podido guardar los enlaces. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.hint}>Accesos rápidos del proyecto</span>
        <button type="button" onClick={openEdit} className={styles.btnEdit}>
          {hasAnyLink ? "Editar enlaces" : "Añadir enlaces"}
        </button>
      </div>

      {!hasAnyLink && !editing && (
        <p className={styles.empty}>
          No hay enlaces configurados. Añade el repositorio, la consola de Firebase, la carpeta local y las URLs del proyecto.
        </p>
      )}

      {!editing && hasAnyLink && (
        <div className={styles.linksGrid}>
          {LINK_DEFS.map(({ key, label, icon: Icon }) => {
            const url = links[key] ?? "";
            if (!url.trim()) return null;
            const isLocalPath = key === "localPath";
            return (
              <a
                key={key}
                href={isLocalPath ? `file://${url}` : url}
                target={isLocalPath ? undefined : "_blank"}
                rel="noopener noreferrer"
                className={styles.linkCard}
              >
                <Icon
                  width={18}
                  height={18}
                  strokeWidth={1.5}
                  className={styles.linkIcon}
                />
                <div className={styles.linkInfo}>
                  <span className={styles.linkLabel}>{label}</span>
                  <span className={styles.linkUrl}>{url}</span>
                </div>
                <ExternalLink
                  width={12}
                  height={12}
                  strokeWidth={1.5}
                  className={styles.linkArrow}
                />
              </a>
            );
          })}
        </div>
      )}

      {editing && (
        <form onSubmit={(e) => void handleSave(e)} className={styles.editForm}>
          {LINK_DEFS.map(({ key, label, icon: Icon, placeholder }) => (
            <div key={key} className={styles.editRow}>
              <Icon
                width={16}
                height={16}
                strokeWidth={1.5}
                className={styles.editIcon}
              />
              <div className={styles.editField}>
                <label className={styles.editLabel}>{label}</label>
                <input
                  name={key}
                  type="text"
                  value={form[key]}
                  onChange={handleField}
                  placeholder={placeholder}
                  className={styles.editInput}
                  autoComplete="off"
                />
              </div>
            </div>
          ))}
          {saveError && (
            <p role="alert" style={{ color: "#b3261e", fontSize: 12, margin: 0 }}>
              {saveError}
            </p>
          )}
          <div className={styles.editActions}>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={styles.btnCancel}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={styles.btnSave}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
