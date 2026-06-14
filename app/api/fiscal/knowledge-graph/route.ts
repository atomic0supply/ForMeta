import { NextResponse } from "next/server";

import type { FiscalAssistantContext } from "@/lib/fiscalAssistant";
import {
  buildKnowledgeGraphFromForMeta,
  buildKnowledgeGraphFromSQLiteProjection,
  queryKnowledgeGraph,
  summarizeKnowledgeGraph,
  type SQLiteProjectionRows,
} from "@/lib/knowledgeGraph";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON no válido." }, { status: 400 });
  }

  const payload = body as {
    rows?: SQLiteProjectionRows;
    context?: FiscalAssistantContext;
    query?: string;
  };

  if (!payload.rows && !payload.context) {
    return NextResponse.json(
      { error: "Se requiere `rows` SQLite o `context` ForMeta para proyectar el grafo." },
      { status: 400 },
    );
  }

  const graph = payload.rows
    ? buildKnowledgeGraphFromSQLiteProjection(payload.rows)
    : buildKnowledgeGraphFromForMeta({
        profile: payload.context!.profile,
        clients: payload.context!.clients,
        projects: payload.context!.projects ?? [],
        invoices: payload.context!.invoices,
        expenses: payload.context!.expenses,
        closures: payload.context!.closures,
      });
  const query = payload.query?.trim() || "Relaciones cliente proyecto factura pago";

  return NextResponse.json({
    graph,
    summary: summarizeKnowledgeGraph(graph),
    graphRag: queryKnowledgeGraph(graph, query),
    guardrail: "El grafo es una proyección semántica. SQLite/ForMeta runtime sigue siendo la fuente de verdad.",
  });
}
