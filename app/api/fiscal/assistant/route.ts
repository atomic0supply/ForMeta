import { NextResponse } from "next/server";

import {
  buildFiscalAssistantRecommendations,
  buildFiscalAssistantPrompt,
  prepareFiscalAssistantAnswer,
  type FiscalAssistantContext,
} from "@/lib/fiscalAssistant";
import { getRagCollections } from "@/lib/formetaServices";

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

async function callGemini(prompt: string, model: string, apiKey: string): Promise<string> {
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
          parts: [{ text: "Eres un copiloto fiscal prudente. Redactas, no recalculas." }],
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error.slice(0, 300));
  }

  const json = (await response.json()) as GeminiResponse;
  return json.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim() ?? "";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON no válido." }, { status: 400 });
  }

  const payload = body as {
    question?: string;
    context?: FiscalAssistantContext;
    apiKeyOverride?: string;
  };
  const question = payload.question?.trim() ?? "";

  if (!question || !payload.context) {
    return NextResponse.json(
      { error: "Pregunta y contexto fiscal son requeridos." },
      { status: 400 },
    );
  }

  const prepared = prepareFiscalAssistantAnswer(question, payload.context);
  if (prepared.toolResults.some((result) => result.tool === "buscar_cambios_normativos")) {
    const rag = await getRagCollections();
    prepared.toolResults = prepared.toolResults.map((result) =>
      result.tool === "buscar_cambios_normativos"
        ? {
            ...result,
            summary: rag.ok
              ? `${result.summary} RAG disponible para consulta documental.`
              : `${result.summary} RAG no disponible o sin acceso ahora.`,
            data: { ...result.data, rag },
          }
        : result,
    );
    prepared.answer = prepared.toolResults.map((result) => `**${result.title}**\n${result.summary}`).join("\n\n");
  }
  const apiKey = payload.apiKeyOverride?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const deterministicRecommendations = buildFiscalAssistantRecommendations(prepared);

  if (!apiKey) {
    return NextResponse.json({
      answer: prepared.answer,
      recommendations: deterministicRecommendations,
      usedTools: prepared.toolResults.map((result) => result.tool),
      confidence: "media",
      model: "deterministic",
      toolResults: prepared.toolResults,
      guardrail: prepared.guardrail,
    });
  }

  try {
    const raw = await callGemini(buildFiscalAssistantPrompt(question, prepared), model, apiKey);
    const parsed = JSON.parse(extractJson(raw)) as {
      answer?: string;
      recommendations?: string[];
      usedTools?: string[];
      confidence?: "alta" | "media" | "baja";
    };

    return NextResponse.json({
      answer: parsed.answer || prepared.answer,
      recommendations: parsed.recommendations ?? [],
      usedTools: parsed.usedTools ?? prepared.toolResults.map((result) => result.tool),
      confidence: parsed.confidence ?? "media",
      model,
      toolResults: prepared.toolResults,
      guardrail: prepared.guardrail,
    });
  } catch (error) {
    return NextResponse.json({
      answer: prepared.answer,
      recommendations: deterministicRecommendations,
      usedTools: prepared.toolResults.map((result) => result.tool),
      confidence: "media",
      model: "deterministic-fallback",
      toolResults: prepared.toolResults,
      guardrail: prepared.guardrail,
      detail: error instanceof Error ? error.message : "Error IA",
    });
  }
}
