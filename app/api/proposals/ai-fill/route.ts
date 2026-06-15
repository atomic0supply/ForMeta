import { NextResponse } from "next/server";

import { DEFAULT_GEMINI_MODEL, extractJsonObject } from "@/lib/taskPlanning";

const MAX_INPUT_CHARS = 12000;

type AiFillRequest = {
  text: string;
  currency?: string;
  apiKeyOverride?: string;
};

type AiFillLine = { description: string; quantity: number; unitPrice: number };
type AiFillResult = { title: string; scope: string; lines: AiFillLine[] };

function availability() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  return {
    available: Boolean(apiKey),
    model,
    disabledReason: apiKey
      ? undefined
      : "Configura GEMINI_API_KEY en el servidor (o tu clave en el perfil) para activar la IA.",
  };
}

function isAiFillRequest(value: unknown): value is AiFillRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.text === "string" &&
    (record.currency === undefined || typeof record.currency === "string") &&
    (record.apiKeyOverride === undefined || typeof record.apiKeyOverride === "string")
  );
}

function buildPrompt(text: string, currency: string): string {
  return `
Eres un asistente comercial de Formeta. Conviertes notas desordenadas (un email,
unos apuntes, una llamada transcrita) en una PROPUESTA estructurada para un cliente.

Idioma de salida: español.
Moneda: ${currency}.

Reglas obligatorias:
- Devuelve SOLO JSON válido, sin markdown ni texto extra.
- "title": un título corto y claro para la propuesta.
- "scope": 2-5 frases describiendo el alcance / qué incluye, en español, tono profesional.
- "lines": las partidas presupuestables. Cada línea: description (string),
  quantity (número, normalmente 1), unitPrice (número en ${currency}, sin símbolo).
- Si el texto menciona precios, úsalos; si no, deja unitPrice en 0 para que el equipo lo complete.
- No inventes importes concretos si el texto no los da (usa 0).
- Máximo 12 líneas.

JSON esperado:
{
  "title": "string",
  "scope": "string",
  "lines": [ { "description": "string", "quantity": 1, "unitPrice": 0 } ]
}

Notas del usuario:
${JSON.stringify(text.slice(0, MAX_INPUT_CHARS))}
`.trim();
}

function parseResult(value: unknown): AiFillResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const rawLines = Array.isArray(record.lines) ? record.lines : [];
  const lines: AiFillLine[] = rawLines
    .map((line) => {
      if (!line || typeof line !== "object") return null;
      const l = line as Record<string, unknown>;
      const description = typeof l.description === "string" ? l.description.trim() : "";
      if (!description) return null;
      const quantity = Number(l.quantity);
      const unitPrice = Number(l.unitPrice);
      return {
        description,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        unitPrice: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0,
      };
    })
    .filter((l): l is AiFillLine => l !== null)
    .slice(0, 12);

  return {
    title: typeof record.title === "string" ? record.title.trim() : "",
    scope: typeof record.scope === "string" ? record.scope.trim() : "",
    lines,
  };
}

export async function GET() {
  return NextResponse.json(availability(), { status: 200 });
}

export async function POST(request: Request) {
  const info = availability();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo no es JSON válido." }, { status: 400 });
  }

  if (!isAiFillRequest(body)) {
    return NextResponse.json({ error: "Falta el texto a interpretar." }, { status: 400 });
  }

  const text = body.text.trim();
  const currency = (body.currency || "EUR").trim();
  if (!text) {
    return NextResponse.json(
      { error: "Pega primero las notas que quieres convertir en propuesta." },
      { status: 400 },
    );
  }

  const apiKey = body.apiKeyOverride?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
  if (!apiKey) {
    return NextResponse.json(info, { status: 503 });
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${info.model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "Devuelve propuestas comerciales estrictamente estructuradas en JSON." }],
          },
          contents: [{ role: "user", parts: [{ text: buildPrompt(text, currency) }] }],
          generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
        }),
        cache: "no-store",
      },
    );

    if (!geminiResponse.ok) {
      const detail = await geminiResponse.text();
      return NextResponse.json(
        { error: "Gemini no ha podido generar la propuesta.", detail: detail.slice(0, 400) },
        { status: 502 },
      );
    }

    const geminiJson = (await geminiResponse.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const responseText =
      geminiJson.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";

    const parsed = parseResult(extractJsonObject(responseText));
    if (!parsed) {
      return NextResponse.json(
        { error: "La respuesta de Gemini no tiene un formato válido." },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "No se ha podido conectar con Gemini en este momento." },
      { status: 502 },
    );
  }
}
