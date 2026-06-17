"use client";

import {
  ChevronRight,
  Download,
  File as FileIcon,
  Folder,
  FolderPlus,
  Lock,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  createProjectFolder,
  deleteProjectFile,
  downloadProjectFile,
  listProjectFiles,
  uploadProjectFile,
  type DriveItem,
} from "@/lib/projectFilesClient";
import styles from "@/styles/intranet-files.module.css";

const BASE_FOLDERS = ["Diseño", "Imágenes", "Código", "Administración"];

type Crumb = { id: string; name: string };

function formatSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ProjectFilesTab({ projectId }: { projectId: string }) {
  const [rootId, setRootId] = useState("");
  const [path, setPath] = useState<Crumb[]>([]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newFolder, setNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFolderId = path.length ? path[path.length - 1].id : "";
  const isRoot = path.length <= 1;

  const load = useCallback(
    async (folderId?: string) => {
      setLoading(true);
      setError("");
      try {
        const listing = await listProjectFiles(projectId, folderId);
        setRootId(listing.rootId);
        setItems(listing.items);
        return listing;
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudieron cargar los archivos");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  // Carga inicial (raíz del proyecto).
  useEffect(() => {
    let active = true;
    (async () => {
      const listing = await listProjectFiles(projectId).catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Error");
        return null;
      });
      if (!active) return;
      setLoading(false);
      if (listing) {
        setRootId(listing.rootId);
        setItems(listing.items);
        setPath([{ id: listing.rootId, name: "Archivos" }]);
      }
    })();
    return () => {
      active = false;
    };
  }, [projectId]);

  async function openFolder(item: DriveItem) {
    setPath((p) => [...p, { id: item.id, name: item.name }]);
    await load(item.id);
  }

  async function goToCrumb(index: number) {
    const target = path[index];
    setPath((p) => p.slice(0, index + 1));
    await load(target.id);
  }

  async function reload() {
    await load(currentFolderId);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBusy(true);
    setError("");
    try {
      for (const file of files) {
        await uploadProjectFile(projectId, currentFolderId, file);
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleCreateFolder() {
    if (!folderName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await createProjectFolder(projectId, currentFolderId, folderName.trim());
      setFolderName("");
      setNewFolder(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la carpeta");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(item: DriveItem) {
    setError("");
    try {
      await downloadProjectFile(projectId, item.id, item.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar");
    }
  }

  async function handleDelete(item: DriveItem) {
    if (!window.confirm(`¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteProjectFile(projectId, item.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  }

  function isProtected(item: DriveItem): boolean {
    return isRoot && item.isFolder && BASE_FOLDERS.includes(item.name);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <nav className={styles.breadcrumb} aria-label="Ruta de carpetas">
          {path.map((crumb, i) => (
            <span key={crumb.id} className={styles.crumbItem}>
              {i > 0 && <ChevronRight size={13} className={styles.crumbSep} />}
              <button
                type="button"
                className={styles.crumb}
                disabled={i === path.length - 1}
                onClick={() => void goToCrumb(i)}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => setNewFolder((v) => !v)}
            disabled={busy || !rootId}
          >
            <FolderPlus size={14} /> Nueva carpeta
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || !rootId}
          >
            <Upload size={14} /> Subir archivo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => void handleUpload(e)}
          />
        </div>
      </div>

      {newFolder && (
        <div className={styles.newFolderRow}>
          <input
            className={styles.input}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Nombre de la carpeta"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreateFolder();
              if (e.key === "Escape") setNewFolder(false);
            }}
            autoFocus
          />
          <button type="button" className={styles.btnPrimary} onClick={() => void handleCreateFolder()} disabled={busy || !folderName.trim()}>
            Crear
          </button>
          <button type="button" className={styles.btnGhost} onClick={() => { setNewFolder(false); setFolderName(""); }}>
            <X size={14} />
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.empty}>Cargando archivos…</p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>Esta carpeta está vacía. Sube un archivo o crea una carpeta.</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.row} data-folder={item.isFolder ? "true" : "false"}>
              <button
                type="button"
                className={styles.rowMain}
                onClick={() => (item.isFolder ? void openFolder(item) : void handleDownload(item))}
              >
                <span className={styles.icon}>
                  {item.isFolder ? <Folder size={18} /> : <FileIcon size={18} />}
                </span>
                <span className={styles.name}>
                  {item.name}
                  {isProtected(item) && <Lock size={12} className={styles.lockIcon} />}
                </span>
                <span className={styles.meta}>{item.isFolder ? "Carpeta" : formatSize(item.size)}</span>
                <span className={styles.meta}>{formatDate(item.modifiedTime)}</span>
              </button>
              <div className={styles.rowActions}>
                {!item.isFolder && (
                  <button type="button" className={styles.iconBtn} title="Descargar" onClick={() => void handleDownload(item)}>
                    <Download size={15} />
                  </button>
                )}
                {!isProtected(item) && (
                  <button type="button" className={styles.iconBtn} title="Eliminar" onClick={() => void handleDelete(item)} disabled={busy}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
