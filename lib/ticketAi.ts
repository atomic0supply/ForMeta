import type { TaskPriority } from "@/lib/tasks";

export const DEFAULT_TICKET_AI_MODEL = "gemini-2.5-flash-lite";
export const MAX_TICKET_AI_CHARS = 16000;

export type TicketIntent =
  | "bug"
  | "request"
  | "question"
  | "access"
  | "billing"
  | "improvement"
  | "other";

export type TicketSeverity = "low" | "medium" | "high" | "critical";

export type TicketAiTaskDraft = {
  title: string;
  description: string;
  priority: TaskPriority;
  sourceNote: string;
};

export type TicketAiSuggestion = {
  model: string;
  generatedAt: string;
  summary: string;
  intent: TicketIntent;
  severity: TicketSeverity;
  severityReason: string;
  missingInfo: string[];
  replyDraft: string;
  proposedTasks: TicketAiTaskDraft[];
  duplicateTicketNumber: string;
  duplicateReason: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanMultiline(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function isTicketIntent(value: unknown): value is TicketIntent {
  return (
    value === "bug" ||
    value === "request" ||
    value === "question" ||
    value === "access" ||
    value === "billing" ||
    value === "improvement" ||
    value === "other"
  );
}

export function isTicketSeverity(value: unknown): value is TicketSeverity {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical"
  );
}

export function extractTicketJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch) {
      try {
        return JSON.parse(fencedMatch[1].trim());
      } catch {
        return null;
      }
    }

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export function parseTicketAiSuggestion(
  value: unknown,
  model: string,
): TicketAiSuggestion | null {
  const record = asRecord(value);
  if (!record) return null;

  const summary = cleanText(record.summary, 2000);
  const intent = record.intent;
  const severity = record.severity;
  const severityReason = cleanText(record.severityReason, 800);
  const replyDraft = cleanMultiline(record.replyDraft, 6000);
  const duplicateTicketNumber = cleanText(record.duplicateTicketNumber, 40);
  const duplicateReason = cleanText(record.duplicateReason, 800);

  if (
    !summary ||
    !isTicketIntent(intent) ||
    !isTicketSeverity(severity) ||
    !severityReason ||
    !replyDraft
  ) {
    return null;
  }

  const proposedTasks: TicketAiTaskDraft[] = [];
  const rawTasks = Array.isArray(record.proposedTasks)
    ? record.proposedTasks.slice(0, 3)
    : [];

  for (const item of rawTasks) {
    const task = asRecord(item);
    if (!task) continue;

    const title = cleanText(task.title, 140);
    const description = cleanText(task.description, 1200);
    const priority = task.priority;
    const sourceNote = cleanText(task.sourceNote, 240);

    if (
      title &&
      description &&
      sourceNote &&
      (priority === "low" || priority === "medium" || priority === "high")
    ) {
      proposedTasks.push({ title, description, priority, sourceNote });
    }
  }

  return {
    model,
    generatedAt: new Date().toISOString(),
    summary,
    intent,
    severity,
    severityReason,
    missingInfo: cleanStringArray(record.missingInfo, 8, 240),
    replyDraft,
    proposedTasks,
    duplicateTicketNumber,
    duplicateReason,
  };
}
