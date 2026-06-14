import { NextResponse } from "next/server";

import {
  DEFAULT_TICKET_AI_MODEL,
  MAX_TICKET_AI_CHARS,
  extractTicketJson,
  parseTicketAiSuggestion,
  type TicketAiSuggestion,
} from "@/lib/ticketAi";

type TicketAiRequest = {
  ticket: {
    number: string;
    subject: string;
    requesterEmail: string;
    clientName: string;
    projectName: string;
    status: string;
    priority: string;
    severity: string;
    summary: string;
    tags: string[];
  };
  messages: Array<{
    direction: string;
    from: string;
    subject: string;
    text: string;
    attachments: Array<{
      filename: string;
      contentType: string;
      textPreview?: string;
    }>;
  }>;
  recentTickets: Array<{
    number: string;
    subject: string;
    summary: string;
    status: string;
  }>;
  apiKeyOverride?: string;
};

type AvailabilityResponse = {
  available: boolean;
  model: string;
  disabledReason?: string;
};

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_TICKET_AI_MODEL;
}

function getApiKey(override?: string): string {
  return override?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
}

function getAvailability(): AvailabilityResponse {
  const model = getModel();
  if (!getApiKey()) {
    return {
      available: false,
      model,
      disabledReason:
        "Configura GEMINI_API_KEY en el servidor para activar la IA de tickets.",
    };
  }

  return { available: true, model };
}

function isTicketAiRequest(value: unknown): value is TicketAiRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    !!record.ticket &&
    typeof record.ticket === "object" &&
    !Array.isArray(record.ticket) &&
    Array.isArray(record.messages) &&
    Array.isArray(record.recentTickets) &&
    (record.apiKeyOverride === undefined ||
      typeof record.apiKeyOverride === "string")
  );
}

function buildPrompt(input: TicketAiRequest): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
  }).format(new Date());

  const payload = {
    ticket: input.ticket,
    messages: input.messages.map((message) => ({
      direction: message.direction,
      from: message.from,
      subject: message.subject,
      text: message.text.slice(0, 6000),
      attachments: message.attachments.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        textPreview: attachment.textPreview?.slice(0, 3000) ?? "",
      })),
    })),
    recentTickets: input.recentTickets.slice(0, 8),
  };

  return `
Eres responsable senior de soporte y delivery para Formeta. Analiza un ticket de cliente y devuelve SOLO JSON valido.

Fecha actual: ${today}
Idioma de salida: espanol

Reglas:
- No inventes datos. Si falta informacion, ponla en missingInfo.
- replyDraft debe ser un correo listo para enviar, profesional, concreto y en espanol.
- proposedTasks debe tener como maximo 3 tareas accionables.
- Usa intent: bug | request | question | access | billing | improvement | other.
- Usa severity: low | medium | high | critical.
- Usa prioridad de tareas: low | medium | high.
- Si ves un duplicado probable en recentTickets, rellena duplicateTicketNumber y duplicateReason; si no, ambos vacios.
- Devuelve SOLO JSON sin markdown.

JSON esperado:
{
  "summary": "Resumen ejecutivo del caso en 2-4 frases",
  "intent": "bug | request | question | access | billing | improvement | other",
  "severity": "low | medium | high | critical",
  "severityReason": "Motivo claro de la severidad sugerida",
  "missingInfo": ["dato que falta 1", "dato que falta 2"],
  "replyDraft": "Correo de respuesta sugerido",
  "proposedTasks": [
    {
      "title": "string",
      "description": "string",
      "priority": "low | medium | high",
      "sourceNote": "por que sale esta tarea del ticket"
    }
  ],
  "duplicateTicketNumber": "",
  "duplicateReason": ""
}

Contexto:
${JSON.stringify(payload).slice(0, MAX_TICKET_AI_CHARS)}
`.trim();
}

export async function GET() {
  return NextResponse.json(getAvailability(), { status: 200 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es JSON valido." },
      { status: 400 },
    );
  }

  if (!isTicketAiRequest(body)) {
    return NextResponse.json(
      { error: "Faltan datos para analizar el ticket." },
      { status: 400 },
    );
  }

  const model = getModel();
  const apiKey = getApiKey(body.apiKeyOverride);

  if (!apiKey) {
    return NextResponse.json(getAvailability(), { status: 503 });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "Devuelve analisis de tickets de soporte en JSON estricto.",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: buildPrompt(body) }],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            responseMimeType: "application/json",
          },
        }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        {
          error: "Gemini no ha podido analizar el ticket.",
          detail: detail.slice(0, 400),
        },
        { status: 502 },
      );
    }

    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text =
      json.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";

    const parsed: TicketAiSuggestion | null = parseTicketAiSuggestion(
      extractTicketJson(text),
      model,
    );

    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "La respuesta de Gemini no ha devuelto un formato valido para tickets.",
        },
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
