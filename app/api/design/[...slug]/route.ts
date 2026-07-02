import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

const DESIGN_DIR = path.join(process.cwd(), "design");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".otf":  "font/otf",
  ".json": "application/json",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const relative = slug.join("/");

  // Prevent path traversal
  const resolved = path.resolve(DESIGN_DIR, relative);
  if (!resolved.startsWith(DESIGN_DIR + path.sep) && resolved !== DESIGN_DIR) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const ext  = path.extname(resolved).toLowerCase();
  const mime = MIME[ext] ?? "application/octet-stream";

  let body: Uint8Array;
  try {
    body = new Uint8Array(await fs.readFile(resolved));
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  // Cast: Uint8Array es un body válido en runtime; el tipo BodyInit de TS no
  // acepta el genérico ArrayBufferLike introducido en TS 5.7.
  return new NextResponse(body as unknown as BodyInit, {
    headers: { "Content-Type": mime },
  });
}
