export type ServiceCheck = {
  ok: boolean;
  status: number;
  url: string;
  data: unknown;
  error?: string;
};

export type FormetaServicesStatus = {
  checkedAt: string;
  fiscal: {
    health: ServiceCheck;
    status: ServiceCheck;
  };
  rag: {
    health: ServiceCheck;
    collections: ServiceCheck;
  };
};

export type RagCollectionsResult = ServiceCheck;

const DEFAULT_FISCAL_API_BASE_URL = "https://fiscal.formeta.es";
const DEFAULT_RAG_API_BASE_URL = "https://frag.formeta.es";

function serviceHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const clientId = process.env.CF_ACCESS_CLIENT_ID?.trim();
  const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET?.trim();
  if (clientId && clientSecret) {
    headers["CF-Access-Client-Id"] = clientId;
    headers["CF-Access-Client-Secret"] = clientSecret;
  }
  return headers;
}

function baseUrl(kind: "fiscal" | "rag"): string {
  const value = kind === "fiscal"
    ? process.env.FISCAL_API_BASE_URL
    : process.env.RAG_API_BASE_URL;
  return (value?.trim() || (kind === "fiscal" ? DEFAULT_FISCAL_API_BASE_URL : DEFAULT_RAG_API_BASE_URL)).replace(/\/$/, "");
}

async function fetchJson(base: string, path: string): Promise<ServiceCheck> {
  const url = `${base}${path}`;
  try {
    const response = await fetch(url, {
      headers: serviceHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    // "ok" se basa en el estado HTTP; el payload solo puede degradarlo si el
    // servicio declara explícitamente { ok: false }.
    const payloadSaysDown =
      typeof data === "object" && data !== null && "ok" in data && (data as { ok?: unknown }).ok === false;
    return {
      ok: response.ok && !payloadSaysDown,
      status: response.status,
      url,
      data,
      ...(!response.ok ? { error: `HTTP ${response.status}` } : {}),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      data: null,
      error: error instanceof Error ? error.message : "No se pudo conectar",
    };
  }
}

export async function getFormetaServicesStatus(): Promise<FormetaServicesStatus> {
  const fiscalBase = baseUrl("fiscal");
  const ragBase = baseUrl("rag");
  const [fiscalHealth, fiscalStatus, ragHealth, ragCollections] = await Promise.all([
    fetchJson(fiscalBase, "/health"),
    fetchJson(fiscalBase, "/status"),
    fetchJson(ragBase, "/health"),
    fetchJson(ragBase, "/collections"),
  ]);

  return {
    checkedAt: new Date().toISOString(),
    fiscal: {
      health: fiscalHealth,
      status: fiscalStatus,
    },
    rag: {
      health: ragHealth,
      collections: ragCollections,
    },
  };
}

export async function getRagCollections(): Promise<RagCollectionsResult> {
  return fetchJson(baseUrl("rag"), "/collections");
}
