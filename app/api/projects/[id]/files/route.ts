import { NextResponse } from "next/server";
import { Readable } from "node:stream";

import { AdminAuthError, requireAuth } from "@/lib/firebaseAdmin";
import { resolveProjectRoot } from "@/lib/projectDrive";
import { assertWithinProject, listChildren, uploadFile } from "@/lib/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB (límite de petición de App Hosting)

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Error en archivos" },
    { status: 500 },
  );
}

// GET — lista los hijos de una carpeta (por defecto la raíz del proyecto).
export async function GET(request: Request, { params }: RouteContext) {
  try {
    await requireAuth(request.headers.get("authorization"));
    const { id } = await params;
    const { rootId } = await resolveProjectRoot(id);

    const folderId = new URL(request.url).searchParams.get("folderId") || rootId;
    if (folderId !== rootId && !(await assertWithinProject(folderId, rootId))) {
      return NextResponse.json({ error: "Carpeta fuera del proyecto" }, { status: 403 });
    }

    const items = await listChildren(folderId);
    return NextResponse.json({ rootId, folderId, items });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST — sube un archivo (multipart) a `folderId` (campo del formulario).
export async function POST(request: Request, { params }: RouteContext) {
  try {
    await requireAuth(request.headers.get("authorization"));
    const { id } = await params;
    const { rootId } = await resolveProjectRoot(id);

    const form = await request.formData();
    const file = form.get("file");
    const folderId = (form.get("folderId") as string) || rootId;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `El archivo supera el máximo de ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.` },
        { status: 413 },
      );
    }
    if (folderId !== rootId && !(await assertWithinProject(folderId, rootId))) {
      return NextResponse.json({ error: "Carpeta fuera del proyecto" }, { status: 403 });
    }

    const body = Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]);
    const item = await uploadFile(folderId, {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      body,
    });
    return NextResponse.json({ item });
  } catch (error) {
    return errorResponse(error);
  }
}
