import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { AdminAuthError, adminAuth, adminDb, requireAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateUserBody = {
  email?: string;
  displayName?: string;
  password?: string;
  role?: "admin" | "team";
  roleId?: string | null;
};

// POST /api/admin/users — create a Firebase Auth user + Firestore profile.
export async function POST(request: Request) {
  try {
    await requireAdmin(request.headers.get("authorization"));

    const body = (await request.json()) as CreateUserBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const displayName = body.displayName?.trim() || null;
    const role = body.role === "admin" ? "admin" : "team";
    const roleId = role === "admin" ? null : body.roleId ?? null;

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Email y contraseña (mín. 6 caracteres) son obligatorios" },
        { status: 400 },
      );
    }

    const userRecord = await adminAuth().createUser({
      email,
      password,
      displayName: displayName ?? undefined,
    });

    await adminDb()
      .collection("users")
      .doc(userRecord.uid)
      .set({
        email,
        displayName,
        role,
        roleId,
        active: true,
        createdAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ uid: userRecord.uid });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error && "errorInfo" in error
        ? // firebase-admin attaches a readable message in error.message
          error.message
        : "No se pudo crear el usuario";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
