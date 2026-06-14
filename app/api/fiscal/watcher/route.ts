import { NextResponse } from "next/server";

import { runFiscalWatcher } from "@/lib/fiscalWatcher";

export async function GET() {
  return NextResponse.json({
    ok: true,
    module: "Fiscal Watcher",
    behavior: "Detecta novedades y devuelve alertas candidatas. No modifica constantes fiscales.",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const previousSignatures =
      body &&
      typeof body === "object" &&
      "previousSignatures" in body &&
      body.previousSignatures &&
      typeof body.previousSignatures === "object"
        ? body.previousSignatures as Record<string, string>
        : {};
    const result = await runFiscalWatcher(previousSignatures);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo ejecutar Fiscal Watcher",
      },
      { status: 500 },
    );
  }
}
