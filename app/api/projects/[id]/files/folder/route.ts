import { NextResponse } from "next/server";

import { AdminAuthError, requireAuth } from "@/lib/firebaseAdmin";
import { resolveProjectRoot } from "@/lib/projectDrive";
import { assertWithinProject, createFolder } from "@/lib/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// POST — crea una subcarpeta dentro de `parentId` (por defecto la raíz).
export async function POST(request: Request, { params }: RouteContext) {
  try {
    await requireAuth(request.headers.get("authorization"));
    const { id } = await params;
    const { rootId } = await resolveProjectRoot(id);

    const body = (await request.json()) as { parentId?: string; name?: string };
    const parentId = body.parentId || rootId;
    const name = (body.name ?? "").trim();

    if (!name || /[\\/]/.test(name)) {
      return NextResponse.json({ error: "Nombre de carpeta no válido" }, { status: 400 });
    }
    if (parentId !== rootId && !(await assertWithinProject(parentId, rootId))) {
      return NextResponse.json({ error: "Carpeta fuera del proyecto" }, { status: 403 });
    }

    const item = await createFolder(parentId, name);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear la carpeta" },
      { status: 500 },
    );
  }
}
