"use client";

import { Timestamp } from "firebase/firestore";
import { ArrowRight, Plus, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Client } from "@/lib/clients";
import { updateProject, type Project } from "@/lib/projects";
import { subscribeToAllUsers, type UserProfile } from "@/lib/adminUsers";
import { TaskCommentThread } from "@/components/TaskCommentThread";
import {
  type TaskDraft,
  type TaskPlanAvailabilityResponse,
  type TaskPlanRequest,
  type TaskRecommendationRequest,
  type TaskRecommendationResponse,
  type TaskPlanResponse,
} from "@/lib/taskPlanning";
import {
  createTask,
  deleteTask,
  subscribeToTasks,
  type Task,
  type TaskInput,
  type TaskPriority,
  type TaskStatus,
  updateTask,
} from "@/lib/tasks";
import { useCurrentUser } from "@/lib/useCurrentUser";
import styles from "@/styles/intranet-kanban.module.css";

type View = "kanban" | "list" | "gantt";

type Props = {
  projectId: string;
  project: Project;
  client: Client | null;
  onProjectPlanningSummaryChange?: (summary: string) => void;
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Pendiente",
  in_progress: "En progreso",
  review: "Revisión",
  done: "Hecho",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "review", "done"];

const GANTT_WEEKS = 10;
const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;

function ganttTimeline() {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now.getTime() - (dow === 0 ? 6 : dow - 1) * DAY_MS);
  monday.setHours(0, 0, 0, 0);
  const start = new Date(monday.getTime() - 3 * WEEK_MS);
  const end = new Date(start.getTime() + GANTT_WEEKS * WEEK_MS);
  return { start, end, total: end.getTime() - start.getTime() };
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function isOverdue(iso: string): boolean {
  return new Date(iso + "T23:59:59") < new Date();
}

const emptyForm: TaskInput = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
  order: 0,
  assignedTo: null,
};

type PlannerErrorResponse = {
  error?: string;
  detail?: string;
  disabledReason?: string;
};

export function ProjectKanbanTab({
  projectId,
  project,
  client,
  onProjectPlanningSummaryChange,
}: Props) {
  const currentUser = useCurrentUser();
  const [view, setView] = useState<View>("kanban");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [plannerInput, setPlannerInput] = useState("");
  const [plannerStatus, setPlannerStatus] = useState<TaskPlanAvailabilityResponse>({
    available: false,
    model: "gemini",
    disabledReason: "Comprobando disponibilidad de Gemini…",
  });
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerApplying, setPlannerApplying] = useState(false);
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [plannerInfo, setPlannerInfo] = useState<string | null>(null);
  const [plannerDrafts, setPlannerDrafts] = useState<TaskDraft[]>([]);
  const [selectedDrafts, setSelectedDrafts] = useState<Record<number, boolean>>(
    {},
  );
  const [hasGeneratedPlan, setHasGeneratedPlan] = useState(false);
  const [savedSummary, setSavedSummary] = useState(
    project.taskPlanningSummary ?? "",
  );
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusRefreshing, setFocusRefreshing] = useState(false);
  const [focusError, setFocusError] = useState<string | null>(null);
  const [focusInfo, setFocusInfo] = useState<string | null>(null);
  const [focusRecommendation, setFocusRecommendation] =
    useState<TaskRecommendationResponse | null>(null);
  const [focusPromoting, setFocusPromoting] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const titleRef = useRef<HTMLInputElement>(null);
  const profileGeminiApiKey = currentUser?.geminiApiKey?.trim() ?? "";
  const hasProfileGeminiApiKey = profileGeminiApiKey.length > 0;
  const plannerAvailable = plannerStatus.available || hasProfileGeminiApiKey;
  const plannerDisabledReason = plannerAvailable
    ? null
    : plannerStatus.disabledReason ??
      "Configura tu clave Gemini en Equipo para usar estas funciones.";

  useEffect(() => {
    const unsub = subscribeToTasks(projectId, setTasks);
    return unsub;
  }, [projectId]);

  useEffect(() => {
    const unsub = subscribeToAllUsers(setUsers);
    return unsub;
  }, []);

  useEffect(() => {
    setSavedSummary(project.taskPlanningSummary ?? "");
  }, [project.taskPlanningSummary]);

  useEffect(() => {
    let cancelled = false;

    async function loadPlannerAvailability() {
      try {
        const response = await fetch(`/api/projects/${projectId}/tasks/ai-plan`, {
          method: "GET",
          cache: "no-store",
        });
        const data = (await response.json()) as TaskPlanAvailabilityResponse;
        if (!cancelled) {
          setPlannerStatus(data);
        }
      } catch {
        if (!cancelled) {
          setPlannerStatus({
            available: false,
            model: "gemini",
            disabledReason:
              "No se ha podido comprobar la disponibilidad del planificador IA.",
          });
        }
      }
    }

    void loadPlannerAvailability();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (drawerOpen) setTimeout(() => titleRef.current?.focus(), 120);
  }, [drawerOpen]);

  const projectContextLines = useMemo(() => {
    const lines = [
      `Proyecto: ${project.name}`,
      `Cliente: ${client?.name || project.clientName || "Sin cliente asignado"}`,
      `Tareas registradas: ${tasks.length}`,
    ];

    if (project.tags.length > 0) {
      lines.push(`Tags: ${project.tags.join(", ")}`);
    }

    if (client?.email) {
      lines.push(`Email de cliente disponible: ${client.email}`);
    }

    if (savedSummary) {
      lines.push(`Resumen persistido: ${savedSummary}`);
    }

    if (tasks.length > 0) {
      lines.push(
        `Tareas actuales: ${tasks
          .slice(0, 5)
          .map((task) => task.title)
          .join(" · ")}${tasks.length > 5 ? "…" : ""}`,
      );
    }

    return lines;
  }, [client?.email, client?.name, project.clientName, project.name, project.tags, savedSummary, tasks]);

  const selectedDraftIndexes = useMemo(
    () =>
      plannerDrafts.flatMap((_, index) => (selectedDrafts[index] ? [index] : [])),
    [plannerDrafts, selectedDrafts],
  );

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== "done"),
    [tasks],
  );

  // Firma estable de las tareas abiertas: evita relanzar la recomendación de
  // foco (llamadas a Gemini) cuando solo cambia la identidad del array
  const openTasksSignature = useMemo(
    () => openTasks.map((t) => t.id).sort().join(","),
    [openTasks],
  );

  // Ref con las tareas abiertas actuales para leerlas dentro del callback sin
  // que cada edición invalide su identidad
  const openTasksRef = useRef(openTasks);
  useEffect(() => {
    openTasksRef.current = openTasks;
  }, [openTasks]);

  // Id incremental de petición: descarta respuestas en vuelo tras relanzar o
  // desmontar (evita setState sobre un componente desmontado)
  const focusRequestIdRef = useRef(0);

  const recommendedTask = useMemo(
    () =>
      focusRecommendation
        ? tasks.find((task) => task.id === focusRecommendation.recommendedTaskId) ??
          null
        : null,
    [focusRecommendation, tasks],
  );

  function openNew(status: TaskStatus = "todo") {
    setEditingTask(null);
    setForm({ ...emptyForm, status, order: Date.now() });
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ?? "",
      order: task.order,
      assignedTo: task.assignedTo ?? null,
    });
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingTask(null);
    setConfirmDelete(false);
  }

  function handleField(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingTask) {
        await updateTask(projectId, editingTask.id, form, {
          projectName: project.name,
          taskTitle: form.title,
          previousStatus: editingTask.status,
        });
      } else {
        await createTask(projectId, form);
      }
      closeDrawer();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingTask) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteTask(projectId, editingTask.id);
    closeDrawer();
  }

  function handleDragStart(taskId: string) {
    setDraggingId(taskId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverCol(null);
  }

  async function handleDrop(col: TaskStatus) {
    if (!draggingId) return;
    const task = tasks.find((t) => t.id === draggingId);
    setDraggingId(null);
    setDragOverCol(null);
    if (!task || task.status === col) return;
    setBoardError(null);
    try {
      await updateTask(
        projectId,
        task.id,
        { status: col },
        {
          projectName: project.name,
          taskTitle: task.title,
          previousStatus: task.status,
        },
      );
    } catch {
      setBoardError("No se ha podido mover la tarea. Inténtalo de nuevo.");
    }
  }

  function toggleDraft(index: number) {
    setSelectedDrafts((current) => ({
      ...current,
      [index]: !current[index],
    }));
  }

  function selectAllDrafts() {
    setSelectedDrafts(
      Object.fromEntries(plannerDrafts.map((_, index) => [index, true])),
    );
  }

  async function handleGeneratePlan() {
    if (!plannerAvailable || !plannerInput.trim()) {
      return;
    }

    setPlannerLoading(true);
    setPlannerError(null);
    setPlannerInfo(null);
    setHasGeneratedPlan(false);

    const payload: TaskPlanRequest = {
      contextText: plannerInput.trim(),
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        notes: project.notes,
        tags: project.tags,
        clientName: project.clientName,
        taskPlanningSummary: savedSummary,
      },
      client: client
        ? {
            name: client.name,
            sector: client.sector,
            contact: client.contact,
            email: client.email,
            notes: client.notes,
          }
        : null,
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        status: task.status,
      })),
      apiKeyOverride: profileGeminiApiKey,
    };

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/ai-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as TaskPlanResponse | PlannerErrorResponse;

      if (!response.ok || !("proposedTasks" in data)) {
        const errorData = data as PlannerErrorResponse;
        const message =
          errorData.error ||
          errorData.disabledReason ||
          "No se ha podido generar la propuesta.";
        throw new Error(
          errorData.detail ? `${message} ${errorData.detail}`.trim() : message,
        );
      }

      setPlannerDrafts(data.proposedTasks);
      setSelectedDrafts(
        Object.fromEntries(data.proposedTasks.map((_, index) => [index, true])),
      );
      setHasGeneratedPlan(true);
      setPlannerStatus((current) => ({ ...current, model: data.model }));

      if (data.summary && data.summary !== savedSummary) {
        try {
          await updateProject(projectId, {
            taskPlanningSummary: data.summary,
            taskPlanningUpdatedAt: Timestamp.now(),
          });
          setSavedSummary(data.summary);
          onProjectPlanningSummaryChange?.(data.summary);
        } catch {
          setPlannerInfo(
            "La propuesta se ha generado, pero no se ha podido guardar el resumen del proyecto.",
          );
        }
      }
    } catch (error) {
      setPlannerDrafts([]);
      setSelectedDrafts({});
      setPlannerError(
        error instanceof Error
          ? error.message
          : "No se ha podido generar la propuesta.",
      );
    } finally {
      setPlannerLoading(false);
    }
  }

  const loadFocusRecommendation = useCallback(
    async (manualRefresh: boolean) => {
      const currentOpenTasks = openTasksRef.current;
      if (!plannerAvailable || currentOpenTasks.length === 0) {
        return;
      }

      const requestId = ++focusRequestIdRef.current;

      if (manualRefresh) {
        setFocusRefreshing(true);
      } else {
        setFocusLoading(true);
      }

      setFocusError(null);

      const payload: TaskRecommendationRequest = {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          notes: project.notes,
          tags: project.tags,
          clientName: project.clientName,
          taskPlanningSummary: savedSummary,
        },
        client: client
          ? {
              name: client.name,
              sector: client.sector,
              contact: client.contact,
              email: client.email,
              notes: client.notes,
            }
          : null,
        tasks: currentOpenTasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueDate: task.dueDate,
          status: task.status,
        })),
        apiKeyOverride: profileGeminiApiKey,
      };

      try {
        const response = await fetch(`/api/projects/${projectId}/tasks/ai-next`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = (await response.json()) as
          | TaskRecommendationResponse
          | PlannerErrorResponse;

        if (!response.ok || !("recommendedTaskId" in data)) {
          const errorData = data as PlannerErrorResponse;
          throw new Error(
            errorData.error ||
              errorData.disabledReason ||
              "No se ha podido recomendar la siguiente tarea.",
          );
        }

        if (focusRequestIdRef.current === requestId) {
          setFocusRecommendation(data);
          setFocusInfo("Foco sugerido por Gemini en función del tablero actual.");
        }
      } catch (error) {
        if (focusRequestIdRef.current === requestId) {
          setFocusRecommendation(null);
          setFocusError(
            error instanceof Error
              ? error.message
              : "No se ha podido recomendar la siguiente tarea.",
          );
        }
      } finally {
        if (focusRequestIdRef.current === requestId) {
          setFocusLoading(false);
          setFocusRefreshing(false);
        }
      }
    },
    [client, plannerAvailable, profileGeminiApiKey, project, projectId, savedSummary],
  );

  useEffect(() => {
    if (!plannerAvailable) {
      setFocusRecommendation(null);
      setFocusError(null);
      return;
    }

    if (openTasksSignature.length === 0) {
      setFocusRecommendation(null);
      setFocusError(null);
      setFocusInfo(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadFocusRecommendation(false);
    }, 450);

    return () => {
      // Invalida la petición en vuelo además de cancelar el debounce
      focusRequestIdRef.current += 1;
      window.clearTimeout(timeoutId);
    };
  }, [plannerAvailable, openTasksSignature, savedSummary, loadFocusRecommendation]);

  async function handlePromoteRecommendedTask() {
    if (!recommendedTask || recommendedTask.status === "in_progress") {
      return;
    }

    setFocusPromoting(true);
    setFocusError(null);

    try {
      await updateTask(
        projectId,
        recommendedTask.id,
        { status: "in_progress" },
        {
          projectName: project.name,
          taskTitle: recommendedTask.title,
          previousStatus: recommendedTask.status,
        },
      );
      setFocusInfo(`"${recommendedTask.title}" ha pasado a En progreso.`);
    } catch {
      setFocusError("No se ha podido pasar la tarea recomendada a En progreso.");
    } finally {
      setFocusPromoting(false);
    }
  }

  async function handleCreateDrafts(mode: "selected" | "all") {
    const indexes =
      mode === "all"
        ? plannerDrafts.map((_, index) => index)
        : selectedDraftIndexes;

    if (indexes.length === 0) {
      return;
    }

    setPlannerApplying(true);
    setPlannerError(null);
    setPlannerInfo(null);

    const currentMaxOrder = tasks.reduce(
      (max, task) => Math.max(max, task.order || 0),
      0,
    );
    const baseOrder = Math.max(currentMaxOrder + 1, Date.now());

    // Registra qué borradores se han creado para retirar solo esos del estado
    // aunque otro falle a mitad (evita duplicados al reintentar)
    const createdIndexes = new Set<number>();
    let creationFailed = false;

    for (const [offset, index] of indexes.entries()) {
      const draft = plannerDrafts[index];
      if (!draft) {
        continue;
      }

      try {
        await createTask(projectId, {
          title: draft.title,
          description: draft.description,
          priority: draft.priority,
          dueDate: draft.dueDate,
          status: "todo",
          order: baseOrder + offset,
        });
        createdIndexes.add(index);
      } catch {
        creationFailed = true;
        break;
      }
    }

    if (createdIndexes.size > 0) {
      const remainingDrafts = plannerDrafts.filter(
        (_, index) => !createdIndexes.has(index),
      );
      setPlannerDrafts(remainingDrafts);
      setSelectedDrafts(
        Object.fromEntries(remainingDrafts.map((_, index) => [index, true])),
      );
    }

    if (creationFailed) {
      setPlannerError(
        createdIndexes.size > 0
          ? `Solo se han creado ${createdIndexes.size} de ${indexes.length} tareas. Reintenta con las restantes.`
          : "No se han podido crear las tareas seleccionadas.",
      );
    } else {
      setPlannerInfo(
        createdIndexes.size === 1
          ? "Se ha creado 1 tarea nueva en el tablero."
          : `Se han creado ${createdIndexes.size} tareas nuevas en el tablero.`,
      );
    }

    setPlannerApplying(false);
  }

  const { start: gStart, total: gTotal } = useMemo(() => ganttTimeline(), []);

  const ganttWeeks = useMemo(() => {
    const weeks: { label: string; leftPct: number; isThisWeek: boolean }[] = [];
    for (let i = 0; i < GANTT_WEEKS; i++) {
      const weekStart = new Date(gStart.getTime() + i * WEEK_MS);
      const isThisWeek =
        weekStart.getTime() <= Date.now() &&
        Date.now() < weekStart.getTime() + WEEK_MS;
      weeks.push({
        label: weekStart.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
        }),
        leftPct: (i / GANTT_WEEKS) * 100,
        isThisWeek,
      });
    }
    return weeks;
  }, [gStart]);

  const todayPct = useMemo(
    () => ((Date.now() - gStart.getTime()) / gTotal) * 100,
    [gStart, gTotal],
  );

  const taskCount = tasks.length;

  return (
    <div className={styles.container}>
      <section className={styles.focusWidget}>
        <div className={styles.focusWidgetHeader}>
          <div>
            <p className={styles.focusKicker}>Siguiente paso</p>
            <h2 className={styles.focusTitle}>Qué tarea atacar ahora</h2>
          </div>
          <div className={styles.focusHeaderActions}>
            <span className={styles.aiModelBadge}>
              {hasProfileGeminiApiKey
                ? `${plannerStatus.model} · perfil`
                : plannerStatus.model}
            </span>
            <button
              type="button"
              onClick={() => void loadFocusRecommendation(true)}
              className={styles.btnAction}
              disabled={!plannerAvailable || focusRefreshing || openTasks.length === 0}
            >
              {focusRefreshing ? "Actualizando…" : "Recalcular"}
            </button>
          </div>
        </div>

        {!plannerAvailable && plannerDisabledReason && (
          <p className={styles.aiWarning}>{plannerDisabledReason}</p>
        )}

        {plannerAvailable && openTasks.length === 0 && (
          <p className={styles.empty}>
            No hay tareas abiertas todavía. Cuando existan tareas pendientes,
            Gemini te sugerirá automáticamente la siguiente.
          </p>
        )}

        {plannerAvailable && openTasks.length > 0 && focusLoading && !recommendedTask && (
          <p className={styles.focusLoading}>Gemini está revisando prioridades, fechas y estado para proponerte el siguiente paso…</p>
        )}

        {focusError && <p className={styles.aiError}>{focusError}</p>}

        {recommendedTask && focusRecommendation && (
          <div className={styles.focusCard}>
            <div className={styles.focusMain}>
              <div className={styles.focusMetaRow}>
                <span
                  className={styles.priorityPill}
                  data-priority={recommendedTask.priority}
                >
                  {PRIORITY_LABELS[recommendedTask.priority]}
                </span>
                <span
                  className={styles.statusPill}
                  data-status={recommendedTask.status}
                >
                  {STATUS_LABELS[recommendedTask.status]}
                </span>
                <span className={styles.focusUrgency}>
                  {focusRecommendation.urgencyLabel}
                </span>
                {recommendedTask.dueDate && (
                  <span
                    className={`${styles.dueDate} ${isOverdue(recommendedTask.dueDate) && recommendedTask.status !== "done" ? styles.dueDateOverdue : ""}`}
                  >
                    {formatDate(recommendedTask.dueDate)}
                  </span>
                )}
              </div>

              <div className={styles.focusBody}>
                <div className={styles.focusText}>
                  <h3 className={styles.focusTaskTitle}>{recommendedTask.title}</h3>
                  {recommendedTask.description && (
                    <p className={styles.focusTaskDescription}>
                      {recommendedTask.description}
                    </p>
                  )}
                  <p className={styles.focusReasoning}>
                    {focusRecommendation.reasoning}
                  </p>
                </div>

                <div className={styles.focusActions}>
                  <button
                    type="button"
                    onClick={() => openEdit(recommendedTask)}
                    className={styles.btnAction}
                  >
                    Ver tarea
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePromoteRecommendedTask()}
                    className={styles.focusPrimaryBtn}
                    disabled={
                      focusPromoting || recommendedTask.status === "in_progress"
                    }
                  >
                    <ArrowRight width={14} height={14} strokeWidth={1.8} />
                    {recommendedTask.status === "in_progress"
                      ? "Ya en progreso"
                      : focusPromoting
                        ? "Moviendo…"
                        : "Poner en progreso"}
                  </button>
                </div>
              </div>
            </div>
            {focusInfo && <p className={styles.aiInfo}>{focusInfo}</p>}
          </div>
        )}
      </section>

      <section className={styles.aiPlanner}>
        <div className={styles.aiPlannerHeader}>
          <div>
            <p className={styles.aiKicker}>Gemini</p>
            <h2 className={styles.aiTitle}>Planificar tareas con IA</h2>
          </div>
            <span className={styles.aiModelBadge}>{plannerStatus.model}</span>
            {hasProfileGeminiApiKey && (
              <span className={styles.aiModelBadge}>
                clave desde perfil
              </span>
            )}
          </div>

        <div className={styles.aiPlannerGrid}>
          <div className={styles.aiComposer}>
            <label htmlFor="plannerInput" className={styles.label}>
              Contexto pegado
            </label>
            <textarea
              id="plannerInput"
              value={plannerInput}
              onChange={(event) => setPlannerInput(event.target.value)}
              className={`${styles.input} ${styles.textarea} ${styles.aiTextarea}`}
              rows={7}
              placeholder="Pega aquí el correo del cliente, roadmap, requisitos, feedback o cualquier bloque de contexto que quieras convertir en tareas."
              disabled={!plannerAvailable || plannerLoading}
            />

            <div className={styles.aiComposerFooter}>
              <p className={styles.aiHint}>
                La IA solo propone tareas nuevas. Tú revisas el borrador antes de
                guardarlo.
              </p>
              <button
                type="button"
                onClick={() => void handleGeneratePlan()}
                className={styles.aiGenerateBtn}
                disabled={
                  !plannerAvailable ||
                  plannerLoading ||
                  !plannerInput.trim()
                }
              >
                <Sparkles width={14} height={14} strokeWidth={1.8} />
                {plannerLoading ? "Generando…" : "Generar propuesta"}
              </button>
            </div>

            {!plannerAvailable && plannerDisabledReason && (
              <p className={styles.aiWarning}>{plannerDisabledReason}</p>
            )}
            {plannerError && <p className={styles.aiError}>{plannerError}</p>}
            {plannerInfo && <p className={styles.aiInfo}>{plannerInfo}</p>}
          </div>

          <div className={styles.aiContextCard}>
            <span className={styles.aiContextLabel}>
              Contexto usado automáticamente
            </span>
            <div className={styles.aiContextList}>
              {projectContextLines.map((line) => (
                <p key={line} className={styles.aiContextLine}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>

        {(plannerDrafts.length > 0 || hasGeneratedPlan) && (
          <div className={styles.aiResults}>
            <div className={styles.aiResultsHeader}>
              <div>
                <span className={styles.aiResultsLabel}>Borrador IA</span>
                <p className={styles.aiResultsMeta}>
                  {plannerDrafts.length > 0
                    ? `${plannerDrafts.length} tareas propuestas · ${selectedDraftIndexes.length} seleccionadas`
                    : "No se han propuesto tareas nuevas con este contexto."}
                </p>
              </div>
              {plannerDrafts.length > 0 && (
                <div className={styles.aiResultsActions}>
                  <button
                    type="button"
                    onClick={selectAllDrafts}
                    className={styles.btnAction}
                  >
                    Seleccionar todo
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateDrafts("selected")}
                    className={styles.btnAction}
                    disabled={
                      plannerApplying || selectedDraftIndexes.length === 0
                    }
                  >
                    Crear seleccionadas
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateDrafts("all")}
                    className={styles.aiApplyBtn}
                    disabled={plannerApplying || plannerDrafts.length === 0}
                  >
                    {plannerApplying ? "Creando…" : "Crear todas"}
                  </button>
                </div>
              )}
            </div>

            {plannerDrafts.length > 0 && (
              <div className={styles.aiDraftList}>
                {plannerDrafts.map((draft, index) => (
                  <label key={`${draft.title}-${index}`} className={styles.aiDraftCard}>
                    <div className={styles.aiDraftCheckRow}>
                      <input
                        type="checkbox"
                        checked={!!selectedDrafts[index]}
                        onChange={() => toggleDraft(index)}
                        className={styles.aiCheckbox}
                      />
                      <div className={styles.aiDraftHeading}>
                        <span className={styles.aiDraftTitle}>{draft.title}</span>
                        <div className={styles.aiDraftMeta}>
                          <span
                            className={styles.priorityPill}
                            data-priority={draft.priority}
                          >
                            {PRIORITY_LABELS[draft.priority]}
                          </span>
                          <span className={styles.aiDraftDue}>
                            {formatDate(draft.dueDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className={styles.aiDraftDescription}>{draft.description}</p>
                    <p className={styles.aiDraftSource}>{draft.sourceNote}</p>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div className={styles.topBar}>
        <div className={styles.viewToggle}>
          {(["kanban", "list", "gantt"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`${styles.viewBtn} ${view === v ? styles.viewBtnActive : ""}`}
            >
              {v === "kanban" && "Kanban"}
              {v === "list" && "Lista"}
              {v === "gantt" && "Gantt"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => openNew()}
          className={styles.btnNew}
        >
          <Plus width={13} height={13} strokeWidth={2} />
          Nueva tarea
        </button>
      </div>

      {boardError && <p className={styles.aiError}>{boardError}</p>}

      {taskCount === 0 && (
        <p className={styles.empty}>
          No hay tareas todavía. Crea la primera con el botón de arriba o deja
          que Gemini te prepare un borrador.
        </p>
      )}

      {view === "kanban" && taskCount > 0 && (
        <div className={styles.board}>
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col);
            return (
              <div
                key={col}
                className={`${styles.column} ${dragOverCol === col && draggingId ? styles.columnOver : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(col);
                }}
                onDragLeave={(e) => {
                  // Ignora dragleave hacia hijos de la propia columna (parpadeo)
                  if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                  setDragOverCol((current) => (current === col ? null : current));
                }}
                onDrop={() => void handleDrop(col)}
              >
                <div className={styles.columnHeader}>
                  <span className={styles.columnTitle}>
                    {STATUS_LABELS[col]}
                  </span>
                  <span className={styles.columnCount}>{colTasks.length}</span>
                </div>

                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`${styles.card} ${draggingId === task.id ? styles.cardDragging : ""}`}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => openEdit(task)}
                  >
                    <span className={styles.cardTitle}>{task.title}</span>
                    <div className={styles.cardMeta}>
                      <span
                        className={styles.priorityDot}
                        data-priority={task.priority}
                        title={PRIORITY_LABELS[task.priority]}
                      />
                      {task.dueDate && (
                        <span
                          className={`${styles.dueDate} ${isOverdue(task.dueDate) && task.status !== "done" ? styles.dueDateOverdue : ""}`}
                        >
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                      {task.assignedTo && (
                        <span
                          className={styles.cardAssignee}
                          title={task.assignedTo.name}
                        >
                          {task.assignedTo.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => openNew(col)}
                  className={styles.columnAddBtn}
                >
                  + tarea
                </button>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && taskCount > 0 && (
        <div className={styles.list}>
          <div className={styles.listHeader}>
            <span>Tarea</span>
            <span>Prioridad</span>
            <span>Estado</span>
            <span>Vencimiento</span>
            <span />
          </div>
          {tasks.map((task) => (
            <div
              key={task.id}
              className={styles.listRow}
              onClick={() => openEdit(task)}
            >
              <span className={styles.listTitle}>{task.title}</span>
              <span
                className={styles.priorityPill}
                data-priority={task.priority}
              >
                {PRIORITY_LABELS[task.priority]}
              </span>
              <span className={styles.statusPill} data-status={task.status}>
                {STATUS_LABELS[task.status]}
              </span>
              <span
                className={`${styles.listDue} ${task.dueDate && isOverdue(task.dueDate) && task.status !== "done" ? styles.listDueOverdue : ""}`}
              >
                {task.dueDate ? formatDate(task.dueDate) : "—"}
              </span>
              <div
                className={styles.listActions}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => openEdit(task)}
                  className={styles.btnAction}
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "gantt" && taskCount > 0 && (
        <div className={styles.ganttWrapper}>
          <div className={styles.gantt}>
            <div className={styles.ganttHeaderRow}>
              <div className={styles.ganttLabelCol}>Tarea</div>
              <div className={styles.ganttTimeline}>
                {ganttWeeks.map((w, i) => (
                  <div
                    key={i}
                    className={`${styles.ganttWeek} ${w.isThisWeek ? styles.ganttWeekToday : ""}`}
                  >
                    {w.label}
                  </div>
                ))}
              </div>
            </div>

            {tasks.map((task) => {
              const createdMs = task.createdAt
                ? task.createdAt.seconds * 1000
                : Date.now();
              const taskStartMs = Math.max(createdMs, gStart.getTime());
              const taskEndMs = task.dueDate
                ? new Date(task.dueDate + "T23:59:59").getTime()
                : null;

              const leftPct = Math.min(
                100,
                Math.max(0, ((taskStartMs - gStart.getTime()) / gTotal) * 100),
              );
              const rightPct = taskEndMs
                ? Math.min(
                    100,
                    Math.max(
                      leftPct + 1,
                      ((taskEndMs - gStart.getTime()) / gTotal) * 100,
                    ),
                  )
                : leftPct + 2;
              const widthPct = rightPct - leftPct;

              return (
                <div key={task.id} className={styles.ganttRow}>
                  <div className={styles.ganttRowLabel}>
                    <span
                      className={styles.priorityDot}
                      data-priority={task.priority}
                    />
                    <span className={styles.ganttRowTitle} title={task.title}>
                      {task.title}
                    </span>
                  </div>
                  <div className={styles.ganttTrack}>
                    {ganttWeeks.map((w, i) => (
                      <div
                        key={i}
                        className={styles.ganttGridLine}
                        style={{ left: `${w.leftPct}%` }}
                      />
                    ))}
                    {todayPct >= 0 && todayPct <= 100 && (
                      <div
                        className={styles.ganttTodayLine}
                        style={{ left: `${todayPct}%` }}
                      />
                    )}
                    <div
                      className={styles.ganttBar}
                      data-status={task.status}
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 1)}%`,
                      }}
                      onClick={() => openEdit(task)}
                      title={`${task.title}${task.dueDate ? ` · vence ${formatDate(task.dueDate)}` : ""}`}
                    >
                      {widthPct > 5 && (
                        <span className={styles.ganttBarLabel}>
                          {task.title}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {drawerOpen && (
        <div
          className={styles.backdrop}
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}
      <aside
        className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""}`}
      >
        <div className={styles.drawerHeader}>
          <span className={styles.drawerLabel}>
            {editingTask ? "Editar tarea" : "Nueva tarea"}
          </span>
          <button
            type="button"
            onClick={closeDrawer}
            className={styles.drawerClose}
          >
            <X width={16} height={16} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="taskTitle" className={styles.label}>
              Título *
            </label>
            <input
              ref={titleRef}
              id="taskTitle"
              name="title"
              type="text"
              value={form.title}
              onChange={handleField}
              className={styles.input}
              required
              autoComplete="off"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="taskDesc" className={styles.label}>
              Descripción
            </label>
            <textarea
              id="taskDesc"
              name="description"
              value={form.description}
              onChange={handleField}
              className={`${styles.input} ${styles.textarea}`}
              rows={3}
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="taskStatus" className={styles.label}>
                Estado
              </label>
              <select
                id="taskStatus"
                name="status"
                value={form.status}
                onChange={handleField}
                className={styles.input}
              >
                {COLUMNS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="taskPriority" className={styles.label}>
                Prioridad
              </label>
              <select
                id="taskPriority"
                name="priority"
                value={form.priority}
                onChange={handleField}
                className={styles.input}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="taskDue" className={styles.label}>
              Fecha de vencimiento
            </label>
            <input
              id="taskDue"
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleField}
              className={styles.input}
            />
          </div>

          {users.length > 0 && (
            <div className={styles.field}>
              <label htmlFor="taskAssignee" className={styles.label}>Asignado a</label>
              <select
                id="taskAssignee"
                className={styles.input}
                value={form.assignedTo?.uid ?? ""}
                onChange={(e) => {
                  const uid = e.target.value;
                  const user = users.find((u) => u.uid === uid);
                  setForm((prev) => ({
                    ...prev,
                    assignedTo: user ? { uid: user.uid, name: user.displayName ?? user.email ?? uid } : null,
                  }));
                }}
              >
                <option value="">Sin asignar</option>
                {users.filter((u) => u.active).map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName ?? u.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.formActions}>
            <div>
              {editingTask && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className={styles.btnDelete}
                >
                  {confirmDelete ? "¿Eliminar?" : "Eliminar"}
                </button>
              )}
            </div>
            <div className={styles.formActionsRight}>
              <button
                type="button"
                onClick={closeDrawer}
                className={styles.btnCancel}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !form.title.trim()}
                className={styles.btnSave}
              >
                {saving
                  ? "Guardando…"
                  : editingTask
                    ? "Guardar"
                    : "Crear tarea"}
              </button>
            </div>
          </div>
        </form>

        {editingTask && (
          <TaskCommentThread projectId={projectId} taskId={editingTask.id} />
        )}
      </aside>
    </div>
  );
}
