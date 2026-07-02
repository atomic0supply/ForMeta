import { NextResponse } from "next/server";

import { getFormetaServicesStatus } from "@/lib/formetaServices";

// El estado debe consultarse en vivo en cada petición, sin caché estática.
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getFormetaServicesStatus();
  const ok = status.fiscal.health.ok && status.fiscal.status.ok && status.rag.health.ok && status.rag.collections.ok;
  return NextResponse.json(status, { status: ok ? 200 : 207 });
}
