import { NextResponse } from "next/server";

import { AdminAuthError, requireAuth } from "@/lib/firebaseAdmin";
import { resolveProjectRoot } from "@/lib/projectDrive";
import { assertWithinProject, deleteItem, isProtectedFolder, renameItem } from "@/lib/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

// PATCH — renombra un archivo o carpeta. Protege la raíz y las 4 base.
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await requireAuth(request.headers.get("authorization"));
    const { id, fileId } = await params;
    const { rootId } = await resolveProjectRoot(id);

    const body = (await request.json()) as { name?: string };
    const name = (body.name ?? "").trim();
    if (!name || /[\\/]/.test(name)) {
      return NextResponse.json({ error: "Nombre no válido" }, { status: 400 });
    }
    if (!(await assertWithinProject(fileId, rootId))) {
      return NextResponse.json({ error: "Elemento fuera del proyecto" }, { status: 404 });
    }
    if (await isProtectedFolder(fileId, rootId)) {
      return NextResponse.json(
        { error: "No se puede renombrar la carpeta raíz ni las carpetas base." },
        { status: 409 },
      );
    }

    const item = await renameItem(fileId, name);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo renombrar" },
      { status: 500 },
    );
  }
}

// DELETE — borra un archivo o carpeta del proyecto. Protege la raíz y las 4 base.
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    await requireAuth(request.headers.get("authorization"));
    const { id, fileId } = await params;
    const { rootId } = await resolveProjectRoot(id);

    if (!(await assertWithinProject(fileId, rootId))) {
      return NextResponse.json({ error: "Elemento fuera del proyecto" }, { status: 404 });
    }
    if (await isProtectedFolder(fileId, rootId)) {
      return NextResponse.json(
        { error: "No se puede borrar la carpeta raíz ni las carpetas base." },
        { status: 409 },
      );
    }

    await deleteItem(fileId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo borrar" },
      { status: 500 },
    );
  }
}
