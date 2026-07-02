import "server-only";

import { Readable } from "node:stream";

import { google, type drive_v3 } from "googleapis";

// Cliente de Google Drive (server-only). La cuenta de servicio opera como miembro
// de una Unidad compartida (Shared Drive); por eso TODAS las llamadas pasan
// `supportsAllDrives: true`. No hay delegación de dominio.

const FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

export const BASE_FOLDERS = ["Diseño", "Imágenes", "Código", "Administración"];

const PROJECT_PROP = "fmetaProjectId";

export type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
  isFolder: boolean;
};

let cachedDrive: drive_v3.Drive | null = null;
let cachedSaEmail = "";

function serviceAccount(): { client_email?: string; private_key?: string } {
  const raw =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.GMAIL_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error(
      "Falta GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON (clave de la cuenta de servicio con acceso a Drive).",
    );
  }
  return JSON.parse(raw);
}

export function driveRootId(): string {
  const id = process.env.GOOGLE_DRIVE_ROOT_ID?.trim();
  if (!id) throw new Error("Falta GOOGLE_DRIVE_ROOT_ID (ID de la Unidad compartida).");
  return id;
}

export function serviceAccountEmail(): string {
  if (!cachedSaEmail) cachedSaEmail = serviceAccount().client_email ?? "";
  return cachedSaEmail;
}

function getDrive(): drive_v3.Drive {
  if (cachedDrive) return cachedDrive;
  const sa = serviceAccount();
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: sa.client_email, private_key: sa.private_key },
    scopes: [DRIVE_SCOPE],
  });
  cachedDrive = google.drive({ version: "v3", auth });
  return cachedDrive;
}

/** Escapa un valor para interpolarlo en una consulta `q` de Drive (comillas simples y barras). */
function escapeDriveValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function toItem(file: drive_v3.Schema$File): DriveItem {
  return {
    id: file.id ?? "",
    name: file.name ?? "",
    mimeType: file.mimeType ?? "",
    size: file.size ? Number(file.size) : null,
    modifiedTime: file.modifiedTime ?? null,
    isFolder: file.mimeType === FOLDER_MIME,
  };
}

/** Lista los hijos directos de una carpeta (carpetas primero, luego por nombre). */
export async function listChildren(folderId: string): Promise<DriveItem[]> {
  const drive = getDrive();
  const items: DriveItem[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${escapeDriveValue(folderId)}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime)",
      orderBy: "folder,name",
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: "drive",
      driveId: driveRootId(),
    });
    for (const f of res.data.files ?? []) items.push(toItem(f));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return items;
}

export async function createFolder(parentId: string, name: string): Promise<DriveItem> {
  const drive = getDrive();
  const res = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: "id, name, mimeType, size, modifiedTime",
    supportsAllDrives: true,
  });
  return toItem(res.data);
}

export async function uploadFile(
  parentId: string,
  file: { name: string; mimeType: string; body: Readable | Buffer },
): Promise<DriveItem> {
  const drive = getDrive();
  const body = Buffer.isBuffer(file.body) ? Readable.from(file.body) : file.body;
  const res = await drive.files.create({
    requestBody: { name: file.name, parents: [parentId] },
    media: { mimeType: file.mimeType || "application/octet-stream", body },
    fields: "id, name, mimeType, size, modifiedTime",
    supportsAllDrives: true,
  });
  return toItem(res.data);
}

export async function getFileMeta(fileId: string): Promise<drive_v3.Schema$File | null> {
  const drive = getDrive();
  try {
    const res = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size, parents, trashed, driveId",
      supportsAllDrives: true,
    });
    return res.data;
  } catch {
    return null;
  }
}

export async function deleteItem(fileId: string): Promise<void> {
  const drive = getDrive();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

export async function renameItem(fileId: string, name: string): Promise<DriveItem> {
  const drive = getDrive();
  const res = await drive.files.update({
    fileId,
    requestBody: { name },
    fields: "id, name, mimeType, size, modifiedTime",
    supportsAllDrives: true,
  });
  return toItem(res.data);
}

export type DriveSearchResult = DriveItem & { path: string };

/**
 * Busca por nombre (substring, sin distinguir mayúsculas) dentro del árbol del
 * proyecto. Recorre las carpetas del proyecto (suelen ser pocas), así el ámbito
 * queda acotado de forma exacta a `rootId`.
 */
export async function searchProjectFiles(
  rootId: string,
  query: string,
  max = 200,
): Promise<DriveSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: DriveSearchResult[] = [];
  const queue: { id: string; path: string }[] = [{ id: rootId, path: "Archivos" }];
  let visited = 0;
  while (queue.length && results.length < max && visited < 3000) {
    const { id, path } = queue.shift() as { id: string; path: string };
    visited += 1;
    const children = await listChildren(id);
    for (const child of children) {
      if (child.name.toLowerCase().includes(q)) {
        results.push({ ...child, path });
      }
      if (child.isFolder) {
        queue.push({ id: child.id, path: `${path} / ${child.name}` });
      }
    }
  }
  return results;
}

export async function downloadFile(
  fileId: string,
): Promise<{ meta: drive_v3.Schema$File; stream: Readable }> {
  const drive = getDrive();
  const meta = await getFileMeta(fileId);
  if (!meta) throw new Error("Archivo no encontrado");
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" },
  );
  return { meta, stream: res.data as unknown as Readable };
}

/** Comprueba que `fileId` cuelga (directa o indirectamente) de `rootId`. */
export async function assertWithinProject(fileId: string, rootId: string): Promise<boolean> {
  if (fileId === rootId) return true;
  let currentId = fileId;
  for (let i = 0; i < 25; i += 1) {
    const meta = await getFileMeta(currentId);
    const parents = meta?.parents ?? [];
    if (parents.includes(rootId)) return true;
    if (!parents.length) return false;
    currentId = parents[0];
    if (currentId === rootId) return true;
  }
  return false;
}

/** True si `fileId` es la raíz del proyecto o una de las 4 carpetas base. */
export async function isProtectedFolder(fileId: string, rootId: string): Promise<boolean> {
  if (fileId === rootId) return true;
  const meta = await getFileMeta(fileId);
  if (!meta || meta.mimeType !== FOLDER_MIME) return false;
  return Boolean(
    meta.name &&
      BASE_FOLDERS.includes(meta.name) &&
      (meta.parents ?? []).includes(rootId),
  );
}

/**
 * Garantiza que existe la carpeta raíz del proyecto (bajo la Unidad compartida)
 * con sus 4 subcarpetas base. Idempotente. Devuelve el id de la raíz.
 * Busca por appProperties (fmetaProjectId) para sobrevivir a renombrados.
 */
export async function ensureProjectFolder(
  projectId: string,
  projectName: string,
  knownRootId?: string,
): Promise<{ rootId: string; created: boolean }> {
  const drive = getDrive();
  const root = driveRootId();
  let rootId = "";
  let created = false;

  // 1) Usar el id conocido si sigue siendo válido.
  if (knownRootId) {
    const meta = await getFileMeta(knownRootId);
    if (meta && !meta.trashed && meta.mimeType === FOLDER_MIME) rootId = knownRootId;
  }

  // 2) Buscar por appProperties.
  if (!rootId) {
    const res = await drive.files.list({
      q: `mimeType = '${FOLDER_MIME}' and trashed = false and appProperties has { key='${PROJECT_PROP}' and value='${escapeDriveValue(projectId)}' }`,
      fields: "files(id, name)",
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: "drive",
      driveId: root,
    });
    if (res.data.files?.[0]?.id) rootId = res.data.files[0].id;
  }

  // 3) Crear la carpeta raíz.
  if (!rootId) {
    const res = await drive.files.create({
      requestBody: {
        name: projectName || projectId,
        mimeType: FOLDER_MIME,
        parents: [root],
        appProperties: { [PROJECT_PROP]: projectId },
      },
      fields: "id",
      supportsAllDrives: true,
    });
    rootId = res.data.id ?? "";
    created = true;
  }

  // 4) Asegurar las 4 carpetas base.
  const children = await listChildren(rootId);
  const existing = new Set(
    children.filter((c) => c.isFolder).map((c) => c.name),
  );
  for (const name of BASE_FOLDERS) {
    if (!existing.has(name)) await createFolder(rootId, name);
  }

  return { rootId, created };
}

export type DriveStatus = {
  ok: boolean;
  serviceAccountEmail: string;
  sharedDriveId: string;
  sharedDriveName: string;
  filesUsedBytes: number;
  fileCount: number;
  quota: { limit: number; usage: number } | null;
  error?: string;
};

/** Estado de la conexión con Drive + uso de la Unidad compartida. */
export async function driveStatus(): Promise<DriveStatus> {
  const base: DriveStatus = {
    ok: false,
    serviceAccountEmail: "",
    sharedDriveId: "",
    sharedDriveName: "",
    filesUsedBytes: 0,
    fileCount: 0,
    quota: null,
  };
  try {
    const drive = getDrive();
    const root = driveRootId();
    base.serviceAccountEmail = serviceAccountEmail();
    base.sharedDriveId = root;

    // Conexión + nombre (prueba la membresía del SA en la unidad).
    const driveInfo = await drive.drives.get({ driveId: root, fields: "id, name" });
    base.sharedDriveName = driveInfo.data.name ?? "";

    // Uso: suma de tamaños de ficheros (ignora carpetas y Docs nativos sin size).
    let pageToken: string | undefined;
    do {
      const res = await drive.files.list({
        q: `trashed = false and mimeType != '${FOLDER_MIME}'`,
        fields: "nextPageToken, files(size)",
        pageSize: 1000,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: "drive",
        driveId: root,
      });
      for (const f of res.data.files ?? []) {
        if (f.size) {
          base.filesUsedBytes += Number(f.size);
          base.fileCount += 1;
        }
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    // Cuota (best-effort; con SA puede no reflejar el pool de la organización).
    try {
      const about = await drive.about.get({ fields: "storageQuota" });
      const q = about.data.storageQuota;
      if (q?.limit) {
        base.quota = { limit: Number(q.limit), usage: Number(q.usage ?? 0) };
      }
    } catch {
      /* ignore */
    }

    base.ok = true;
    return base;
  } catch (error) {
    base.error = error instanceof Error ? error.message : "Error desconocido";
    return base;
  }
}
