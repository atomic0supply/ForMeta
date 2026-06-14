import { NextResponse } from "next/server";

import type { VerifactuPayload } from "@/lib/verifactu";

type VerifactuSendRequest = {
  recordId?: string;
  payload?: VerifactuPayload;
  environment?: "test" | "production";
};

export async function POST(request: Request) {
  let body: VerifactuSendRequest;
  try {
    body = await request.json() as VerifactuSendRequest;
  } catch {
    return NextResponse.json({ error: "JSON no válido." }, { status: 400 });
  }

  if (!body.payload || !body.recordId) {
    return NextResponse.json({ error: "recordId y payload son requeridos." }, { status: 400 });
  }

  const certificateAlias = process.env.AEAT_CERTIFICATE_ALIAS?.trim() || "";
  const certificateP12 = process.env.AEAT_CERTIFICATE_P12_BASE64?.trim() || "";
  const mock = process.env.VERIFACTU_AEAT_MOCK === "true";
  const endpoint = process.env.AEAT_VERIFACTU_ENDPOINT?.trim() || "";

  if (!mock && (!certificateAlias || !certificateP12)) {
    return NextResponse.json({
      ok: false,
      status: "certificate_required",
      code: "CERT_REQUIRED",
      message: "Configura AEAT_CERTIFICATE_ALIAS y AEAT_CERTIFICATE_P12_BASE64 antes de enviar a AEAT.",
    });
  }

  if (mock) {
    return NextResponse.json({
      ok: true,
      status: "accepted",
      code: "MOCK_ACCEPTED",
      message: `Registro ${body.payload.invoiceNumber} aceptado en modo simulación.`,
      environment: body.environment ?? "test",
    });
  }

  if (!endpoint) {
    return NextResponse.json({
      ok: false,
      status: "failed",
      code: "ENDPOINT_REQUIRED",
      message: "Configura AEAT_VERIFACTU_ENDPOINT para activar el cliente AEAT real.",
    });
  }

  return NextResponse.json({
    ok: false,
    status: "failed",
    code: "CLIENT_NOT_ENABLED",
    message: "Cliente AEAT real preparado pero no habilitado: falta implementar firma TLS/XML final contra el endpoint oficial.",
  });
}
