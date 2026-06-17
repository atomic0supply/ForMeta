import "server-only";

import { adminDb } from "@/lib/firebaseAdmin";
import { ensureProjectFolder } from "@/lib/googleDrive";

/**
 * Carga el proyecto, garantiza su estructura de carpetas en Drive y persiste el
 * `driveFolderId`. Devuelve la raíz del proyecto. Usado por todas las rutas de
 * archivos para acotar las operaciones a la carpeta del proyecto.
 */
export async function resolveProjectRoot(
  projectId: string,
): Promise<{ rootId: string; projectName: string }> {
  const ref = adminDb().collection("projects").doc(projectId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Proyecto no encontrado");
  const data = snap.data() ?? {};
  const projectName = String(data.name ?? projectId);
  const known = typeof data.driveFolderId === "string" ? data.driveFolderId : undefined;
  const { rootId } = await ensureProjectFolder(projectId, projectName, known);
  if (data.driveFolderId !== rootId) {
    await ref.update({ driveFolderId: rootId });
  }
  return { rootId, projectName };
}
