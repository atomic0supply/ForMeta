import { NextResponse } from "next/server";

import { AdminAuthError, requireAuth } from "@/lib/firebaseAdmin";

const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const MAX_IDEA_CHARS = 8000;
const MAX_TITLE_CHARS = 300;
const MAX_ANSWER_CHARS = 2000;
const MAX_QUESTIONS = 20;
const GEMINI_TIMEOUT_MS = 30000;

function getApiKey(override?: string): string {
  return override?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
}

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  systemInstruction: string,
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.45,
          responseMimeType: "application/json",
        },
      }),
      cache: "no-store",
      // Corta la petición si Gemini no responde a tiempo.
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error ${response.status}: ${err.slice(0, 300)}`);
  }

  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return (
    json.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

const ALLOWED_CATEGORIES = [
  "saas",
  "ecommerce",
  "marketplace",
  "consulting",
  "app_movil",
  "automatizacion",
  "contenido",
  "hardware",
  "otro",
] as const;

type NormalizedPhase1 = {
  category: string;
  viabilityScore: number;
  summary: string;
  conclusions: string[];
  questions: Array<{ id: string; text: string; options: string[] }>;
};

/** Valida y normaliza la respuesta de Gemini (fase 1): la IA puede devolver
 *  campos malformados, así que no se confía en la forma del JSON parseado. */
function normalizePhase1(parsed: unknown): NormalizedPhase1 {
  const p = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;

  const category = ALLOWED_CATEGORIES.includes(p.category as (typeof ALLOWED_CATEGORIES)[number])
    ? (p.category as string)
    : "otro";

  const rawScore = Number(p.viabilityScore);
  const viabilityScore = Number.isFinite(rawScore)
    ? Math.min(10, Math.max(1, Math.round(rawScore)))
    : 5;

  const summary = typeof p.summary === "string" ? p.summary : "";

  const conclusions = Array.isArray(p.conclusions)
    ? p.conclusions.filter((c): c is string => typeof c === "string")
    : [];

  const questions = Array.isArray(p.questions)
    ? p.questions.flatMap((q, i) => {
        if (!q || typeof q !== "object") return [];
        const item = q as Record<string, unknown>;
        if (typeof item.text !== "string" || !item.text.trim()) return [];
        const id = typeof item.id === "string" && item.id.trim() ? item.id : `q${i + 1}`;
        const options = Array.isArray(item.options)
          ? item.options.filter((o): o is string => typeof o === "string")
          : [];
        return [{ id, text: item.text, options }];
      })
    : [];

  return { category, viabilityScore, summary, conclusions, questions };
}

function buildPhase1Prompt(title: string, description: string): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
  }).format(new Date());

  return `
Eres un asesor senior de negocios e innovacion con experiencia en startups, producto digital y estrategia empresarial.

Fecha: ${today}
Idioma de salida: espanol

Analiza la siguiente idea de negocio o desarrollo y devuelve SOLO JSON valido.

IDEA:
Titulo: ${title.slice(0, MAX_TITLE_CHARS)}
Descripcion: ${description.slice(0, MAX_IDEA_CHARS)}

Devuelve este JSON exacto:
{
  "category": "saas | ecommerce | marketplace | consulting | app_movil | automatizacion | contenido | hardware | otro",
  "viabilityScore": <numero entero del 1 al 10>,
  "summary": "<resumen ejecutivo de la idea en 2-3 oraciones>",
  "conclusions": [
    "<conclusion clave 1>",
    "<conclusion clave 2>",
    "<conclusion clave 3>",
    "<conclusion clave 4>"
  ],
  "questions": [
    {
      "id": "q1",
      "text": "<pregunta clarificadora 1>",
      "options": ["<opcion A>", "<opcion B>", "<opcion C>", "<opcion D>"]
    },
    {
      "id": "q2",
      "text": "<pregunta clarificadora 2>",
      "options": ["<opcion A>", "<opcion B>", "<opcion C>", "<opcion D>"]
    },
    {
      "id": "q3",
      "text": "<pregunta clarificadora 3>",
      "options": ["<opcion A>", "<opcion B>", "<opcion C>", "<opcion D>"]
    },
    {
      "id": "q4",
      "text": "<pregunta clarificadora 4>",
      "options": ["<opcion A>", "<opcion B>", "<opcion C>", "<opcion D>"]
    },
    {
      "id": "q5",
      "text": "<pregunta clarificadora 5>",
      "options": ["<opcion A>", "<opcion B>", "<opcion C>", "<opcion D>"]
    }
  ]
}

Reglas:
- viabilityScore: 1=inviable, 5=neutral, 10=excepcional. Se objetivo y critico.
- conclusions: 4 conclusiones iniciales basadas en lo que ya sabes. Se directo y util.
- questions: 5 preguntas estrategicas para completar el analisis. Enfocate en mercado, diferenciacion, modelo de negocio, recursos y riesgos.
- options: cada pregunta debe tener EXACTAMENTE 4 opciones de respuesta plausibles y distintas entre si. Las opciones deben ser concretas, cortas (max 10 palabras) y cubrir el espectro de posibilidades mas probable para esa idea especifica. No uses opciones genericas como "Otro" o "No aplica".
- Devuelve SOLO el JSON, sin texto adicional.
`.trim();
}

function buildPhase2Prompt(
  title: string,
  description: string,
  questions: Array<{ id: string; text: string }>,
  answers: Record<string, string>,
): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
  }).format(new Date());

  // Se acota el número de preguntas y el tamaño de cada respuesta para no
  // construir prompts sin límite con entrada del cliente.
  const qa = questions
    .slice(0, MAX_QUESTIONS)
    .map((q) => `P: ${q.text.slice(0, MAX_TITLE_CHARS)}\nR: ${(answers[q.id] || "(sin respuesta)").slice(0, MAX_ANSWER_CHARS)}`)
    .join("\n\n");

  return `
Eres un asesor de estrategia de negocios especializado en startups y producto digital. Tu salida es un informe ejecutivo profesional en espanol.

Fecha: ${today}

IDEA:
Titulo: ${title.slice(0, MAX_TITLE_CHARS)}
Descripcion: ${description.slice(0, MAX_IDEA_CHARS)}

CONTEXTO DEL FUNDADOR (preguntas y respuestas):
${qa}

INSTRUCCIONES DE FORMATO — OBLIGATORIAS:

1. ESTRUCTURA FIJA (usa exactamente estos encabezados ##):
   ## Elevator Pitch
   ## Diferenciales Clave
   ## Matriz Estrategica (DAFO)
   ## Modelo de Negocio
   ## Hoja de Ruta
   ## Riesgos y Mitigacion
   ## Stack Tecnologico Recomendado

2. REGLAS DE ESTILO:
   - ELEVATOR PITCH: maximo 3 lineas. Define QUE hace, PARA QUIEN y cual es el BENEFICIO PRINCIPAL.
   - DIFERENCIALES: exactamente 3 bullet points con negrita en el concepto clave. Ej: "- **IA Analitica**: reduce el tiempo de analisis un 80%."
   - MATRIZ DAFO: siempre como tabla markdown 2x2 con columnas Fortalezas/Debilidades y filas Oportunidades/Amenazas.
     Formato de tabla:
     | | **Fortalezas** | **Debilidades** |
     |---|---|---|
     | **Oportunidades** | ... | ... |
     | **Amenazas** | ... | ... |
   - MODELO DE NEGOCIO: tabla con columnas Fuente de ingreso | Tipo | Estimacion. Incluye al menos 2 fuentes.
   - HOJA DE RUTA: tabla con columnas Fase | Duracion | Hito principal. Minimo 3 fases, maximo 5.
   - RIESGOS: lista con formato "- **Riesgo**: descripcion → **Mitigacion**: accion concreta."
   - STACK TECNOLOGICO: tabla con columnas Capa | Tecnologia Recomendada | Justificacion. Incluye SIEMPRE estas capas (en este orden): Framework Frontend, Framework Backend, Base de Datos, UI Framework, Tipografia, CDN / Hosting. Incluye la capa "Graficos JS" SOLO si la idea requiere visualizar datos, metricas o dashboards — si no aplica, omitela. Se muy especifico: usa nombres exactos y versiones actuales (ej: "Next.js 15", "Tailwind CSS v4 + shadcn/ui", "Recharts 2", "Vercel Edge Network", "Inter (cuerpo) · Geist Mono (codigo)"). La columna Justificacion debe ser 1 frase corta con el motivo tecnico o de negocio.

3. TONO Y DATOS:
   - Directo y accionable. Prohibido: "se pretende lograr", "podria intentar", "en un futuro".
   - Siempre cuantifica: usa numeros, porcentajes o plazos ("2-3 meses", "€500/mes", "80% del mercado").
   - Negritas solo en conceptos clave, nunca en oraciones completas.
   - Sin introducciones genericas ni frases de relleno. Cada linea debe aportar informacion util.

Devuelve este JSON exacto:
{
  "report": "<informe en markdown siguiendo la estructura y reglas anteriores>"
}

Devuelve SOLO el JSON, sin texto adicional ni bloques de codigo.
`.trim();
}

export async function POST(request: Request) {
  // Solo usuarios autenticados y activos pueden consumir la API de Gemini.
  try {
    await requireAuth(request.headers.get("authorization"));
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo verificar la autenticación." }, { status: 500 });
  }

  const model = getModel();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es JSON válido." },
      { status: 400 },
    );
  }

  const payload = body as Record<string, unknown>;
  const apiKeyOverride = (payload.apiKeyOverride as string | undefined)?.trim();
  const apiKey = getApiKey(apiKeyOverride);
  const phase = payload.phase as string;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Configura GEMINI_API_KEY en el servidor para activar el análisis IA." },
      { status: 503 },
    );
  }

  if (phase === "analyze") {
    const title = (payload.title as string | undefined)?.trim() || "";
    const description = (payload.description as string | undefined)?.trim() || "";

    if (!title || !description) {
      return NextResponse.json(
        { error: "Título y descripción son requeridos." },
        { status: 400 },
      );
    }

    try {
      const raw = await callGemini(
        apiKey,
        model,
        buildPhase1Prompt(title, description),
        "Devuelves respuestas estructuradas en JSON para analisis de ideas de negocio.",
      );

      const parsed = normalizePhase1(JSON.parse(extractJson(raw)));

      return NextResponse.json({ ...parsed, model }, { status: 200 });
    } catch (err) {
      if (isTimeoutError(err)) {
        return NextResponse.json(
          { error: "Gemini no respondió a tiempo. Inténtalo de nuevo." },
          { status: 504 },
        );
      }
      return NextResponse.json(
        { error: "No se pudo analizar la idea con Gemini.", detail: String(err).slice(0, 200) },
        { status: 502 },
      );
    }
  }

  if (phase === "report") {
    const title = (payload.title as string | undefined)?.trim() || "";
    const description = (payload.description as string | undefined)?.trim() || "";
    const questions = (payload.questions as Array<{ id: string; text: string }> | undefined) ?? [];
    const answers = (payload.answers as Record<string, string> | undefined) ?? {};

    if (!title || !description || questions.length === 0) {
      return NextResponse.json(
        { error: "Faltan datos para generar el informe." },
        { status: 400 },
      );
    }

    try {
      const raw = await callGemini(
        apiKey,
        model,
        buildPhase2Prompt(title, description, questions, answers),
        "Generas informes de analisis de negocio detallados y estructurados en markdown.",
      );

      const parsed = JSON.parse(extractJson(raw)) as { report?: unknown };
      // Validación: el informe debe ser un string no vacío.
      if (typeof parsed.report !== "string" || !parsed.report.trim()) {
        throw new Error("Respuesta sin campo 'report' válido");
      }

      return NextResponse.json({ report: parsed.report, model }, { status: 200 });
    } catch (err) {
      if (isTimeoutError(err)) {
        return NextResponse.json(
          { error: "Gemini no respondió a tiempo. Inténtalo de nuevo." },
          { status: 504 },
        );
      }
      return NextResponse.json(
        { error: "No se pudo generar el informe con Gemini.", detail: String(err).slice(0, 200) },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    { error: "Phase no válida. Usa 'analyze' o 'report'." },
    { status: 400 },
  );
}
