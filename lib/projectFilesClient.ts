import { auth } from "@/lib/firebase";

// Cliente (browser) para las rutas /api/projects/[id]/files. Envía el ID token
// de Firebase como Bearer. Las operaciones de Drive ocurren en el servidor.

export type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
  isFolder: boolean;
};

export type FileListing = {
  rootId: string;
  folderId: string;
  items: DriveItem[];
};

async function token(): Promise<string> {
  const t = await auth?.currentUser?.getIdToken();
  if (!t) throw new Error("Sesión no válida");
  return t;
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error) return data.error as string;
  } catch {
    /* ignore */
  }
  return "Error en la operación";
}

export async function listProjectFiles(
  projectId: string,
  folderId?: string,
): Promise<FileListing> {
  const url = new URL(`/api/projects/${projectId}/files`, window.location.origin);
  if (folderId) url.searchParams.set("folderId", folderId);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${await token()}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function uploadProjectFile(
  projectId: string,
  folderId: string,
  file: File,
): Promise<DriveItem> {
  const body = new FormData();
  body.append("file", file);
  body.append("folderId", folderId);
  const res = await fetch(`/api/projects/${projectId}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}` },
    body,
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()).item;
}

export async function createProjectFolder(
  projectId: string,
  parentId: string,
  name: string,
): Promise<DriveItem> {
  const res = await fetch(`/api/projects/${projectId}/files/folder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await token()}`,
    },
    body: JSON.stringify({ parentId, name }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()).item;
}

export async function deleteProjectFile(projectId: string, fileId: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (!res.ok) throw new Error(await readError(res));
}

// Descarga vía servidor (blob) para no exponer el token en la URL.
export async function downloadProjectFile(
  projectId: string,
  fileId: string,
  fileName: string,
): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/files/${fileId}/download`, {
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (!res.ok) throw new Error(await readError(res));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Dispara la creación de la estructura de carpetas (al crear un proyecto).
export async function ensureProjectFiles(projectId: string): Promise<void> {
  try {
    await listProjectFiles(projectId);
  } catch {
    /* fire-and-forget: la pestaña Files la recreará al abrirse */
  }
}
