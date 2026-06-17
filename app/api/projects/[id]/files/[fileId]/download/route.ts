import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { AdminAuthError, requireAuth } from "@/lib/firebaseAdmin";
import { resolveProjectRoot } from "@/lib/projectDrive";
import { assertWithinProject, downloadFile } from "@/lib/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

// GET — descarga (stream) un archivo del proyecto a través del servidor.
export async function GET(request: Request, { params }: RouteContext) {
  try {
    await requireAuth(request.headers.get("authorization"));
    const { id, fileId } = await params;
    const { rootId } = await resolveProjectRoot(id);

    if (!(await assertWithinProject(fileId, rootId))) {
      return NextResponse.json({ error: "Archivo fuera del proyecto" }, { status: 404 });
    }

    const { meta, stream } = await downloadFile(fileId);
    const webStream = Readable.toWeb(stream) as unknown as ReadableStream;
    const filename = encodeURIComponent(meta.name ?? "archivo");

    const headers = new Headers({
      "Content-Type": meta.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store",
    });
    if (meta.size) headers.set("Content-Length", String(meta.size));

    return new Response(webStream, { status: 200, headers });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo descargar" },
      { status: 500 },
    );
  }
}
