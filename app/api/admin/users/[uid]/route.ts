import { NextResponse } from "next/server";

import { AdminAuthError, adminAuth, adminDb, requireAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UpdateUserBody = {
  role?: "admin" | "team";
  roleId?: string | null;
  active?: boolean;
  displayName?: string | null;
};

type RouteContext = { params: Promise<{ uid: string }> };

// PATCH /api/admin/users/:uid — update role / roleId / active / displayName.
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { uid: callerUid } = await requireAdmin(request.headers.get("authorization"));
    const { uid } = await params;
    const body = (await request.json()) as UpdateUserBody;

    // Anti-lockout: un admin no puede auto-degradarse ni desactivar su propia
    // cuenta (evita dejar el sistema sin ningún administrador activo).
    if (uid === callerUid && (body.role === "team" || body.active === false)) {
      return NextResponse.json(
        { error: "No puedes quitarte el rol admin ni desactivar tu propia cuenta" },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    if (body.role === "admin" || body.role === "team") {
      updates.role = body.role;
      // Admins have implicit access to everything, so clear any roleId.
      if (body.role === "admin") updates.roleId = null;
    }
    if ("roleId" in body) updates.roleId = body.roleId ?? null;
    if (typeof body.active === "boolean") updates.active = body.active;
    if ("displayName" in body) updates.displayName = body.displayName ?? null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    await adminDb().collection("users").doc(uid).update(updates);

    // Keep the Auth account disabled state in sync with the active flag.
    if (typeof body.active === "boolean") {
      await adminAuth().updateUser(uid, { disabled: !body.active });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar" },
      { status: 400 },
    );
  }
}

// DELETE /api/admin/users/:uid — remove from Auth + Firestore.
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { uid: callerUid } = await requireAdmin(request.headers.get("authorization"));
    const { uid } = await params;

    if (uid === callerUid) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta" },
        { status: 400 },
      );
    }

    await adminAuth().deleteUser(uid);
    await adminDb().collection("users").doc(uid).delete();

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo eliminar" },
      { status: 400 },
    );
  }
}
