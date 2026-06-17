import { NextResponse } from "next/server";

import { AdminAuthError, requireAuth } from "@/lib/firebaseAdmin";
import { resolveProjectRoot } from "@/lib/projectDrive";
import { searchProjectFiles } from "@/lib/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/files/search?q= — busca por nombre dentro del proyecto.
export async function GET(request: Request, { params }: RouteContext) {
  try {
    await requireAuth(request.headers.get("authorization"));
    const { id } = await params;
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (!q) return NextResponse.json({ results: [] });

    const { rootId } = await resolveProjectRoot(id);
    const results = await searchProjectFiles(rootId, q);
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo buscar" },
      { status: 500 },
    );
  }
}
