import { NextResponse } from "next/server";

import { AdminAuthError, requireAdmin } from "@/lib/firebaseAdmin";
import { driveStatus } from "@/lib/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/drive/status — estado de la conexión con la Unidad compartida + uso.
export async function GET(request: Request) {
  try {
    await requireAdmin(request.headers.get("authorization"));
    const status = await driveStatus();
    const planLimitTb = Number(process.env.GOOGLE_DRIVE_PLAN_LIMIT_TB || "2");
    return NextResponse.json({ ...status, planLimitTb });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error consultando Drive" },
      { status: 500 },
    );
  }
}
