"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  FolderPlus,
  Lightbulb,
  Link2,
  MessageSquare,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  type Idea,
  type IdeaLink,
  type IdeaStatus,
  type IdeaCategory,
  type AiQuestion,
  IDEA_CATEGORY_LABELS,
  STATUS_LABELS,
  createIdea,
  updateIdea,
  deleteIdea,
  listIdeas,
} from "@/lib/ideas";
import { createProject } from "@/lib/projects";
import { auth } from "@/lib/firebase";
import { useCurrentUser } from "@/lib/useCurrentUser";
import styles from "@/styles/intranet-ideas.module.css";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type AiPhase1Result = {
  category: IdeaCategory;
  viabilityScore: number;
  summary: string;
  conclusions: string[];
  questions: AiQuestion[];
  model: string;
};

type AiPhase2Result = {
  report: string;
  model: string;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function viabilityColor(score: number): string {
  if (score >= 8) return "var(--sage)";
  if (score >= 5) return "var(--terracotta)";
  return "var(--danger)";
}

function viabilityLabel(score: number): string {
  if (score >= 8) return "Alta";
  if (score >= 6) return "Media-alta";
  if (score >= 4) return "Media";
  return "Baja";
}

function formatDate(ts: { seconds: number } | undefined): string {
  if (!ts) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function padNum(n: number): string {
  return String(n).padStart(2, "0");
}

/** Cabecera Authorization con el ID token de Firebase; lanza si no hay sesión. */
async function authHeader(): Promise<Record<string, string>> {
  if (!auth?.currentUser) throw new Error("Sesión no iniciada. Vuelve a entrar.");
  const token = await auth.currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/** Escapa HTML antes de aplicar los regex de markdown (evita XSS vía dangerouslySetInnerHTML). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Converts markdown to HTML — handles ##/###, bold, italic, links, lists, tables and paragraphs */
function renderMarkdown(md: string): string {
  const inline = (s: string) =>
    escapeHtml(s)
      // Links [texto](url): solo se permiten esquemas http(s) y mailto.
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, href: string) =>
        /^(https?:\/\/|mailto:)/i.test(href)
          ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
          : text,
      )
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");

  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  let inTable = false;
  let tableHeader = false;

  function closeList()  { if (inList)  { out.push("</ul>");  inList  = false; } }
  function closeTable() { if (inTable) { out.push("</tbody></table>"); inTable = false; tableHeader = false; } }

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (/^\|/.test(trimmed)) {
      const isSeparator = /^\|[-:| ]+\|$/.test(trimmed);
      if (isSeparator) {
        tableHeader = false;
        continue;
      }
      closeList();
      const cells = trimmed.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      if (!inTable) {
        out.push("<table><thead><tr>");
        cells.forEach((c) => out.push(`<th>${inline(c)}</th>`));
        out.push("</tr></thead><tbody>");
        inTable = true;
        tableHeader = true;
        continue;
      }
      if (tableHeader) {
        tableHeader = false;
        continue;
      }
      out.push("<tr>");
      cells.forEach((c) => out.push(`<td>${inline(c)}</td>`));
      out.push("</tr>");
      continue;
    }

    closeTable();

    if (/^## (.+)/.test(trimmed)) {
      closeList();
      out.push(`<h2>${inline(trimmed.replace(/^## /, ""))}</h2>`);
    } else if (/^### (.+)/.test(trimmed)) {
      closeList();
      out.push(`<h3>${inline(trimmed.replace(/^### /, ""))}</h3>`);
    } else if (/^- (.+)/.test(trimmed)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(trimmed.replace(/^- /, ""))}</li>`);
    } else if (trimmed === "") {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(trimmed)}</p>`);
    }
  }

  closeList();
  closeTable();
  return out.join("\n");
}

/* ─── Step pipeline ──────────────────────────────────────────────────────── */

type Step = { key: string; label: string; icon: React.ReactNode };

const STEPS: Step[] = [
  { key: "draft",      label: "Idea",     icon: <Lightbulb width={14} height={14} /> },
  { key: "questioned", label: "Análisis", icon: <Sparkles width={14} height={14} /> },
  { key: "reported",   label: "Informe",  icon: <FileText width={14} height={14} /> },
];

function stepIndex(status: IdeaStatus): number {
  if (status === "reported") return 2;
  if (status === "questioned") return 1;
  return 0;
}

function StepPipeline({ status }: { status: IdeaStatus }) {
  const current = stepIndex(status);
  return (
    <div className={styles.pipeline}>
      {STEPS.map((step, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={step.key} className={styles.pipelineItem}>
            <div
              className={`${styles.pipelineStep} ${done ? styles.pipelineDone : ""} ${active ? styles.pipelineActive : ""}`}
            >
              {done ? <CheckCircle2 width={14} height={14} /> : active ? step.icon : <Circle width={14} height={14} />}
            </div>
            <span className={`${styles.pipelineLabel} ${active ? styles.pipelineLabelActive : ""}`}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`${styles.pipelineConnector} ${done ? styles.pipelineConnectorDone : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Analyzing overlay ──────────────────────────────────────────────────── */

function AnalyzingOverlay() {
  const [tick, setTick] = useState(0);
  const messages = [
    "Leyendo tu idea...",
    "Identificando el mercado objetivo...",
    "Evaluando viabilidad...",
    "Formulando preguntas estratégicas...",
    "Extrayendo conclusiones clave...",
  ];

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={styles.analyzingOverlay}>
      <div className={styles.analyzingPulse}>
        <Sparkles width={28} height={28} strokeWidth={1.5} />
      </div>
      <p className={styles.analyzingTitle}>Analizando tu idea</p>
      <p className={styles.analyzingMsg}>{messages[tick % messages.length]}</p>
      <div className={styles.analyzingDots}>
        <span /><span /><span />
      </div>
    </div>
  );
}

/* ─── Status badge ───────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: IdeaStatus }) {
  const cls: Record<IdeaStatus, string> = {
    draft:      styles.statusDraft,
    analyzing:  styles.statusAnalyzing,
    questioned: styles.statusQuestioned,
    reported:   styles.statusReported,
    archived:   styles.statusArchived,
  };
  return (
    <span className={`${styles.statusBadge} ${cls[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

/* ─── New Idea Form ──────────────────────────────────────────────────────── */

type NewIdeaFormProps = {
  onCreated: (id: string) => void;
  onCancel: () => void;
  userId: string;
};

function NewIdeaForm({ onCreated, onCancel, userId }: NewIdeaFormProps) {
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setLoading(true);
    setError("");
    try {
      const id = await createIdea({ title, description, userId });
      onCreated(id);
    } catch {
      setError("No se pudo guardar la idea. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const charCount  = description.length;
  const charTarget = 300;

  return (
    <form className={styles.newIdeaForm} onSubmit={(e) => void handleSubmit(e)}>
      <div className={styles.formHeader}>
        <h2 className={styles.formTitle}>Nueva idea</h2>
        <p className={styles.formSubtitle}>
          Cuanto más detalle aportes, más preciso será el análisis de la IA.
        </p>
      </div>

      <div className={styles.formField}>
        <label className={styles.fieldLabel} htmlFor="idea-title">Título</label>
        <input
          id="idea-title"
          className={styles.fieldInput}
          type="text"
          placeholder="Un nombre corto y descriptivo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
        />
      </div>

      <div className={styles.formField}>
        <div className={styles.fieldLabelRow}>
          <label className={styles.fieldLabel} htmlFor="idea-desc">Descripción</label>
          <span className={`${styles.charCount} ${charCount >= charTarget ? styles.charCountOk : ""}`}>
            {charCount} / {charTarget}+ chars recomendados
          </span>
        </div>
        <textarea
          id="idea-desc"
          className={`${styles.fieldInput} ${styles.fieldTextarea}`}
          placeholder={`Describe la idea con el mayor detalle posible:\n\n• ¿Qué problema resuelve?\n• ¿A quién va dirigida?\n• ¿Cómo funcionaría?\n• ¿Qué te inspiró?\n• ¿Qué diferencia a esta idea de las existentes?`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className={styles.formHintBox}>
        <Sparkles width={14} height={14} className={styles.formHintIcon} />
        <p className={styles.formHint}>
          La IA analizará la idea, calculará su viabilidad (1–10), extraerá conclusiones
          clave y generará preguntas estratégicas. Luego, con tus respuestas, producirá
          un informe completo con análisis DAFO, modelo de negocio y próximos pasos.
        </p>
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      <div className={styles.formActions}>
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading || !title.trim() || !description.trim()}
        >
          {loading ? <span className={styles.spinner} /> : <Plus width={14} height={14} />}
          Guardar idea
        </button>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/* ─── Idea Detail ────────────────────────────────────────────────────────── */

type IdeaDetailProps = {
  idea: Idea;
  onUpdate: (updated: Idea) => void;
  onDelete: (id: string) => void;
  apiKeyOverride: string;
};

function IdeaDetail({ idea, onUpdate, onDelete, apiKeyOverride }: IdeaDetailProps) {
  const router = useRouter();
  const [analyzing, setAnalyzing]               = useState(false);
  const [generatingReport, setGeneratingReport]   = useState(false);
  const [answers, setAnswers]                   = useState<Record<string, string>>(idea.answers ?? {});
  const [savingAnswers, setSavingAnswers]        = useState(false);
  const [analyzeError, setAnalyzeError]         = useState("");
  const [reportError, setReportError]           = useState("");
  const [creatingProject, setCreatingProject]   = useState(false);
  const [projectCreated, setProjectCreated]     = useState(!!idea.projectId);
  // Links state
  const [links, setLinks]                       = useState<IdeaLink[]>(idea.links ?? []);
  const [showLinkForm, setShowLinkForm]         = useState(false);
  const [linkLabel, setLinkLabel]               = useState("");
  const [linkUrl, setLinkUrl]                   = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAnswers = useRef<Record<string, string> | null>(null);
  const mountedRef = useRef(true);

  /* Limpieza del timer de autoguardado: al desmontar se cancela el timer y se
     vuelca la última respuesta pendiente para no perderla. */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (pendingAnswers.current) {
        void updateIdea(idea.id, { answers: pendingAnswers.current }).catch(() => undefined);
        pendingAnswers.current = null;
      }
    };
  }, [idea.id]);

  /* Auto-save answers with 1.5s debounce */
  function handleAnswerChange(qid: string, value: string) {
    const next = { ...answers, [qid]: value };
    setAnswers(next);
    pendingAnswers.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      pendingAnswers.current = null;
      setSavingAnswers(true);
      updateIdea(idea.id, { answers: next })
        .catch(() => undefined)
        .finally(() => { if (mountedRef.current) setSavingAnswers(false); });
    }, 1500);
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError("");

    try {
      await updateIdea(idea.id, { status: "analyzing" });
      onUpdate({ ...idea, status: "analyzing" });

      const res = await fetch("/api/ideas/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({
          phase: "analyze",
          title: idea.title,
          description: idea.description,
          apiKeyOverride,
        }),
      });

      const data = (await res.json()) as AiPhase1Result & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Error desconocido");

      const updates: Partial<Idea> = {
        status: "questioned",
        category: data.category,
        viabilityScore: data.viabilityScore,
        aiSummary: data.summary,
        aiConclusions: data.conclusions,
        aiQuestions: data.questions,
        aiModel: data.model,
        answers: {},
      };

      await updateIdea(idea.id, updates);
      onUpdate({ ...idea, ...updates } as Idea);
      setAnswers({});
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al analizar";
      setAnalyzeError(msg);
      await updateIdea(idea.id, { status: "draft" });
      onUpdate({ ...idea, status: "draft" });
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerateReport() {
    setGeneratingReport(true);
    setReportError("");

    try {
      const res = await fetch("/api/ideas/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({
          phase: "report",
          title: idea.title,
          description: idea.description,
          questions: idea.aiQuestions,
          answers,
          apiKeyOverride,
        }),
      });

      const data = (await res.json()) as AiPhase2Result & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Error desconocido");

      const updates: Partial<Idea> = {
        status: "reported",
        aiReport: data.report,
        answers,
        aiModel: data.model,
      };

      await updateIdea(idea.id, updates);
      onUpdate({ ...idea, ...updates } as Idea);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al generar informe";
      setReportError(msg);
    } finally {
      setGeneratingReport(false);
    }
  }

  function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    const raw = linkUrl.trim();
    const url  = raw.startsWith("http") ? raw : `https://${raw}`;
    const label = linkLabel.trim() || url;
    const newLink: IdeaLink = { id: crypto.randomUUID(), label, url };
    const next = [...links, newLink];
    setLinks(next);
    setLinkLabel("");
    setLinkUrl("");
    setShowLinkForm(false);
    void updateIdea(idea.id, { links: next });
  }

  function handleRemoveLink(id: string) {
    const next = links.filter((l) => l.id !== id);
    setLinks(next);
    void updateIdea(idea.id, { links: next });
  }

  async function handleCreateProject() {
    setCreatingProject(true);
    try {
      const projectId = await createProject({
        name: idea.title,
        clientId: "",
        clientName: "",
        status: "activo",
        description: idea.aiSummary
          ? `${idea.description}\n\n---\n${idea.aiSummary}`
          : idea.description,
        tags: idea.category ? [idea.category] : [],
        notes: idea.aiReport ?? "",
        githubUrl: "",
        firebaseUrl: "",
        localPath: "",
        devUrl: "",
        externalUrl: "",
      });
      await updateIdea(idea.id, { projectId });
      onUpdate({ ...idea, projectId });
      setProjectCreated(true);
      router.push(`/intranet/proyectos/${projectId}`);
    } catch {
      setCreatingProject(false);
    }
  }

  async function handleArchive() {
    const next: IdeaStatus = idea.status === "archived" ? "draft" : "archived";
    await updateIdea(idea.id, { status: next });
    onUpdate({ ...idea, status: next });
  }

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar "${idea.title}"? Esta acción no se puede deshacer.`)) return;
    await deleteIdea(idea.id);
    onDelete(idea.id);
  }

  const answeredCount  = Object.values(answers).filter((a) => a.trim()).length;
  const totalQuestions = idea.aiQuestions?.length ?? 0;
  const allAnswered    = answeredCount === totalQuestions && totalQuestions > 0;
  const isAnalyzing    = analyzing || idea.status === "analyzing";

  return (
    <div className={styles.detail}>

      {/* ── Header ── */}
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderLeft}>
          <h1 className={styles.detailTitle}>{idea.title}</h1>
          <div className={styles.detailMeta}>
            {idea.category && (
              <span className={styles.categoryBadge}>
                {IDEA_CATEGORY_LABELS[idea.category]}
              </span>
            )}
            {idea.createdAt && (
              <span className={styles.detailDate}>
                {formatDate(idea.createdAt as unknown as { seconds: number })}
              </span>
            )}
          </div>
        </div>

        <div className={styles.detailHeaderActions}>
          {(idea.status === "questioned" || idea.status === "reported") && (
            <button
              type="button"
              className={styles.reAnalyzeBtn}
              onClick={() => void handleAnalyze()}
              disabled={isAnalyzing}
              title="Re-analizar con IA"
            >
              <RotateCcw width={13} height={13} />
              Re-analizar
            </button>
          )}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => void handleArchive()}
            title={idea.status === "archived" ? "Restaurar" : "Archivar"}
          >
            <Archive width={15} height={15} />
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            onClick={() => void handleDelete()}
            title="Eliminar idea"
          >
            <Trash2 width={15} height={15} />
          </button>
        </div>
      </div>

      {/* ── Step pipeline ── */}
      <div className={styles.pipelineBar}>
        <StepPipeline status={idea.status === "analyzing" ? "draft" : idea.status} />
        {idea.viabilityScore !== undefined && (
          <div className={styles.viabilityChip} style={{ borderColor: viabilityColor(idea.viabilityScore) }}>
            <span className={styles.viabilityNum} style={{ color: viabilityColor(idea.viabilityScore) }}>
              {idea.viabilityScore}
            </span>
            <span className={styles.viabilityTen}>/10</span>
            <span className={styles.viabilityWordLabel} style={{ color: viabilityColor(idea.viabilityScore) }}>
              {viabilityLabel(idea.viabilityScore)}
            </span>
          </div>
        )}
      </div>

      {/* ── Analyzing overlay ── */}
      {isAnalyzing && <AnalyzingOverlay />}

      {!isAnalyzing && (
        <>
          {/* ── Description ── */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Descripción</p>
            <p className={styles.descriptionText}>{idea.description}</p>
          </div>

          {/* ── Links ── */}
          <div className={styles.section}>
            <div className={styles.linksHeader}>
              <p className={styles.sectionLabel}>Links de referencia</p>
              {!showLinkForm && (
                <button
                  type="button"
                  className={styles.addLinkBtn}
                  onClick={() => setShowLinkForm(true)}
                >
                  <Plus width={12} height={12} />
                  Añadir
                </button>
              )}
            </div>

            {showLinkForm && (
              <form className={styles.linkForm} onSubmit={handleAddLink}>
                <input
                  className={styles.linkInput}
                  type="text"
                  placeholder="Etiqueta (opcional)"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                />
                <input
                  className={styles.linkInput}
                  type="text"
                  placeholder="URL (ej: https://ejemplo.com)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  autoFocus
                  required
                />
                <div className={styles.linkFormActions}>
                  <button type="submit" className={styles.linkSaveBtn}>
                    <Link2 width={12} height={12} /> Guardar
                  </button>
                  <button
                    type="button"
                    className={styles.linkCancelBtn}
                    onClick={() => { setShowLinkForm(false); setLinkLabel(""); setLinkUrl(""); }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {links.length > 0 ? (
              <ul className={styles.linksList}>
                {links.map((l) => (
                  <li key={l.id} className={styles.linkItem}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkAnchor}
                    >
                      <ExternalLink width={12} height={12} className={styles.linkIcon} />
                      {l.label}
                    </a>
                    <button
                      type="button"
                      className={styles.linkRemoveBtn}
                      onClick={() => handleRemoveLink(l.id)}
                      title="Eliminar enlace"
                    >
                      <X width={12} height={12} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              !showLinkForm && (
                <p className={styles.linksEmpty}>Sin enlaces. Añade referencias, competidores o recursos útiles.</p>
              )
            )}
          </div>

          {/* ── Crear proyecto ── */}
          {idea.status === "reported" && (
            <div className={styles.createProjectBar}>
              {projectCreated || idea.projectId ? (
                <div className={styles.projectLinked}>
                  <CheckCircle2 width={15} height={15} className={styles.projectLinkedIcon} />
                  <span>Proyecto creado</span>
                  {idea.projectId && (
                    <a
                      href={`/intranet/proyectos/${idea.projectId}`}
                      className={styles.projectLinkedLink}
                    >
                      Ver proyecto →
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <div className={styles.createProjectText}>
                    <FolderPlus width={16} height={16} className={styles.createProjectIcon} />
                    <span>
                      <strong>¿Lista para ejecutar?</strong> Convierte esta idea en un proyecto y empieza a trabajar.
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.createProjectBtn}
                    onClick={() => void handleCreateProject()}
                    disabled={creatingProject}
                  >
                    {creatingProject ? <span className={styles.spinner} /> : <FolderPlus width={13} height={13} />}
                    {creatingProject ? "Creando…" : "Crear proyecto"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Draft CTA ── */}
          {(idea.status === "draft" || idea.status === "archived") && (
            <div className={styles.analyzeCta}>
              <div className={styles.analyzeCtaInner}>
                <div className={styles.analyzeCtaIcon}>
                  <Sparkles width={22} height={22} strokeWidth={1.5} />
                </div>
                <div className={styles.analyzeCtaText}>
                  <strong>Analizar con inteligencia artificial</strong>
                  <span>
                    Gemini leerá tu idea y devolverá: puntuación de viabilidad,
                    resumen ejecutivo, conclusiones clave y preguntas estratégicas
                    para profundizar antes de generar el informe final.
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.analyzeBtn}
                  onClick={() => void handleAnalyze()}
                  disabled={isAnalyzing}
                >
                  <Sparkles width={14} height={14} />
                  Analizar ahora
                </button>
              </div>
              {analyzeError && <p className={styles.errorMsg}>{analyzeError}</p>}
            </div>
          )}

          {/* ── AI Summary + Conclusions ── */}
          {idea.aiSummary && (
            <div className={styles.aiSection}>
              <div className={styles.aiSectionHeader}>
                <span className={styles.aiLabel}>
                  <Sparkles width={13} height={13} />
                  Resumen IA
                </span>
                {idea.aiModel && <span className={styles.modelTag}>{idea.aiModel}</span>}
              </div>

              <p className={styles.aiSummaryText}>{idea.aiSummary}</p>

              {idea.aiConclusions && idea.aiConclusions.length > 0 && (
                <div className={styles.conclusionsGrid}>
                  {idea.aiConclusions.map((c, i) => (
                    <div key={i} className={styles.conclusionCard}>
                      <span className={styles.conclusionNum}>{padNum(i + 1)}</span>
                      <p className={styles.conclusionText}>{c}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Questions ── */}
          {idea.aiQuestions && idea.aiQuestions.length > 0 && (
            <div className={styles.questionsSection}>
              <div className={styles.questionsSectionHeader}>
                <div className={styles.aiLabel}>
                  <MessageSquare width={13} height={13} />
                  Preguntas de profundización
                </div>
                <div className={styles.answersProgress}>
                  <div className={styles.answersProgressBar}>
                    <div
                      className={styles.answersProgressFill}
                      style={{ width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%` }}
                    />
                  </div>
                  <span className={styles.answersProgressLabel}>
                    {answeredCount}/{totalQuestions}
                  </span>
                  {savingAnswers && (
                    <span className={styles.savingIndicator}>Guardando…</span>
                  )}
                </div>
              </div>

              <div className={styles.questionsList}>
                {idea.aiQuestions.map((q, i) => {
                  const currentVal = answers[q.id] ?? idea.answers?.[q.id] ?? "";
                  const selectedOption = q.options?.find((o) => o === currentVal) ?? null;
                  const isCustom = currentVal !== "" && selectedOption === null;
                  const answered = currentVal.trim() !== "";
                  return (
                    <div
                      key={q.id}
                      className={`${styles.questionItem} ${answered ? styles.questionItemAnswered : ""}`}
                    >
                      <div className={styles.questionHeader}>
                        <span className={styles.questionNumber}>{padNum(i + 1)}</span>
                        <p className={styles.questionText}>{q.text}</p>
                        {answered && idea.status !== "reported" && (
                          <CheckCircle2 width={15} height={15} className={styles.questionCheck} />
                        )}
                      </div>

                      {idea.status === "reported" ? (
                        <div className={styles.answeredText}>
                          {currentVal || <em className={styles.noAnswer}>Sin respuesta</em>}
                        </div>
                      ) : (
                        <div className={styles.questionBody}>
                          {q.options && q.options.length > 0 && (
                            <div className={styles.optionsGrid}>
                              {q.options.map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  className={`${styles.optionChip} ${opt === selectedOption ? styles.optionChipSelected : ""}`}
                                  onClick={() => handleAnswerChange(q.id, opt === selectedOption ? "" : opt)}
                                >
                                  {opt === selectedOption && (
                                    <CheckCircle2 width={12} height={12} className={styles.optionCheck} />
                                  )}
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className={styles.customAnswerRow}>
                            <span className={styles.customAnswerLabel}>Respuesta propia</span>
                            <textarea
                              className={`${styles.questionAnswer} ${isCustom ? styles.questionAnswerActive : ""}`}
                              placeholder="O escribe tu propia respuesta…"
                              value={isCustom ? currentVal : ""}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              rows={2}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {idea.status !== "reported" && (
                <div className={styles.reportCta}>
                  {!allAnswered && (
                    <p className={styles.reportCtaHint}>
                      Puedes generar el informe ahora o responder más preguntas para un análisis más profundo.
                    </p>
                  )}
                  {reportError && <p className={styles.errorMsg}>{reportError}</p>}
                  <button
                    type="button"
                    className={styles.generateReportBtn}
                    onClick={() => void handleGenerateReport()}
                    disabled={generatingReport}
                  >
                    {generatingReport ? (
                      <>
                        <span className={styles.spinner} />
                        Generando informe…
                      </>
                    ) : (
                      <>
                        <FileText width={14} height={14} />
                        {allAnswered ? "Generar informe completo" : "Generar informe"}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Report ── */}
          {idea.aiReport && (
            <div className={styles.reportSection}>
              <div className={styles.reportSectionHeader}>
                <div className={styles.aiLabel}>
                  <FileText width={13} height={13} />
                  Informe completo
                </div>
                {idea.aiModel && <span className={styles.modelTag}>{idea.aiModel}</span>}
              </div>
              <div
                className={styles.reportContent}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(idea.aiReport) }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Main view ──────────────────────────────────────────────────────────── */

export function IdeasView() {
  const user            = useCurrentUser();
  const apiKeyOverride  = user?.geminiApiKey?.trim() ?? "";
  const [ideas, setIdeas]       = useState<Idea[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew]   = useState(false);

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const data = await listIdeas(uid);
      setIdeas(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void load(user.uid);
  }, [user, load]);

  const selectedIdea = ideas.find((i) => i.id === selectedId) ?? null;

  function handleCreated(id: string) {
    if (!user) return;
    setShowNew(false);
    void load(user.uid).then(() => setSelectedId(id));
  }

  function handleUpdate(updated: Idea) {
    setIdeas((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  function handleDelete(id: string) {
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
  }

  function handleNew() {
    setShowNew(true);
    setSelectedId(null);
  }

  if (!user || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Ideas</h2>
          </div>
        </div>
        <div className={styles.main}>
          <div className={styles.emptyState}>
            <span
              className={styles.spinner}
              style={{ width: 24, height: 24, borderColor: "var(--line)", borderTopColor: "var(--muted)" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Ideas</h2>
          <p className={styles.sidebarSub}>Análisis IA</p>
        </div>

        <button type="button" className={styles.newBtn} onClick={handleNew}>
          <Plus width={14} height={14} />
          Nueva idea
        </button>

        <div className={styles.ideaList}>
          {ideas.length === 0 ? (
            <p className={styles.emptyList}>
              Aún no hay ideas. Añade la primera para que la IA la analice.
            </p>
          ) : (
            ideas.map((idea) => (
              <div
                key={idea.id}
                className={`${styles.ideaCard} ${selectedId === idea.id ? styles.ideaCardActive : ""}`}
                onClick={() => { setSelectedId(idea.id); setShowNew(false); }}
              >
                <p className={styles.ideaCardTitle}>{idea.title}</p>
                <div className={styles.ideaCardMeta}>
                  <StatusBadge status={idea.status} />
                  {idea.viabilityScore !== undefined && (
                    <span
                      className={styles.viabilityDot}
                      style={{ color: viabilityColor(idea.viabilityScore) }}
                    >
                      ● {idea.viabilityScore}/10
                    </span>
                  )}
                </div>
                {idea.createdAt && (
                  <span className={styles.ideaCardDate}>
                    {formatDate(idea.createdAt as unknown as { seconds: number })}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main panel */}
      <div className={styles.main}>
        {showNew && user ? (
          <NewIdeaForm
            userId={user.uid}
            onCreated={handleCreated}
            onCancel={() => setShowNew(false)}
          />
        ) : selectedIdea ? (
          <IdeaDetail
            key={selectedIdea.id}
            idea={selectedIdea}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            apiKeyOverride={apiKeyOverride}
          />
        ) : (
          <div className={styles.emptyState}>
            <Lightbulb className={styles.emptyIcon} width={56} height={56} strokeWidth={1} />
            <h3 className={styles.emptyStateTitle}>Registra una idea</h3>
            <p className={styles.emptyStateText}>
              La IA analizará tu idea, calculará su viabilidad, generará preguntas
              estratégicas y producirá un informe completo.
            </p>
            <button type="button" className={styles.emptyStateBtn} onClick={handleNew}>
              <Plus width={14} height={14} />
              Nueva idea
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
