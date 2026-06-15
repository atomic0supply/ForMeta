"use client";

import {
  AlertTriangle,
  Archive,
  Settings,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Tag,
  UserRound,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  subscribeToAllUsers,
  type UserProfile,
} from "@/lib/adminUsers";
import {
  subscribeToClients,
  type Client,
} from "@/lib/clients";
import {
  subscribeToProjects,
  type Project,
} from "@/lib/projects";
import {
  createTask,
  type TaskInput,
} from "@/lib/tasks";
import {
  DEFAULT_TICKET_SETTINGS,
  saveTicketSettings,
  subscribeToTicketSettings,
  type TicketMailSettings,
  type TicketTemplateKey,
} from "@/lib/ticketSettings";
import type { TicketAiSuggestion, TicketSeverity } from "@/lib/ticketAi";
import {
  addInternalTicketNote,
  buildTicketQueues,
  buildTicketSla,
  createManualTicket,
  createTicketReplyOutbox,
  findRecentTicketsByClient,
  formatTicketDate,
  isTicketClosed,
  isTicketUrgent,
  subscribeToTicketMessages,
  subscribeToTicketOutbox,
  subscribeToTickets,
  ticketDueState,
  ticketIntentLabel,
  ticketPriorityLabel,
  ticketSeverityLabel,
  ticketStatusLabel,
  updateTicket,
  type NewTicketInput,
  type Ticket,
  type TicketMessage,
  type TicketOutbox,
  type TicketPerson,
  type TicketPriority,
  type TicketStatus,
  type TicketTriageChecklist,
} from "@/lib/tickets";
import { useCurrentUser } from "@/lib/useCurrentUser";
import styles from "@/styles/intranet-tickets.module.css";

type QueueKey =
  | "nuevos"
  | "mios"
  | "urgentes"
  | "esperandoCliente"
  | "sinAsignar"
  | "vencenHoy"
  | "cerrados"
  | "all";

const QUEUES: Array<{ key: QueueKey; label: string; icon: typeof Inbox }> = [
  { key: "nuevos", label: "Nuevos", icon: Inbox },
  { key: "mios", label: "Míos", icon: UserRound },
  { key: "urgentes", label: "Urgentes", icon: AlertTriangle },
  { key: "esperandoCliente", label: "Esperando cliente", icon: Mail },
  { key: "sinAsignar", label: "Sin asignar", icon: MessageSquare },
  { key: "vencenHoy", label: "Vencen hoy", icon: Clock },
  { key: "cerrados", label: "Cerrados", icon: Archive },
  { key: "all", label: "Todos", icon: Search },
];

const STATUSES: TicketStatus[] = [
  "nuevo",
  "triage",
  "esperando_cliente",
  "planificado",
  "en_progreso",
  "esperando_release",
  "resuelto",
  "cerrado",
  "spam",
];

const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];
const SEVERITIES: TicketSeverity[] = ["low", "medium", "high", "critical"];
const TEMPLATE_KEYS: TicketTemplateKey[] = [
  "acknowledgement",
  "requestMoreInfo",
  "receivedIncident",
  "workaround",
  "close",
  "reopen",
];

const TEMPLATE_LABELS: Record<TicketTemplateKey, string> = {
  acknowledgement: "Acuse",
  requestMoreInfo: "Más información",
  receivedIncident: "Incidencia recibida",
  workaround: "Workaround",
  close: "Cierre",
  reopen: "Reapertura",
};

const emptyNewTicket: NewTicketInput = {
  subject: "",
  requester: { name: "", email: "" },
  clientId: "",
  clientName: "",
  projectId: "",
  projectName: "",
  text: "",
};

const emptyTriage: TicketTriageChecklist = {
  environment: "",
  affectedUrl: "",
  affectedUser: "",
  browserDevice: "",
  stepsToReproduce: "",
  expectedResult: "",
  actualResult: "",
};

function userToTicketPerson(user: UserProfile | null | undefined): TicketPerson | null {
  if (!user) return null;
  return {
    uid: user.uid,
    name: user.displayName || user.email,
    email: user.email,
  };
}

function currentUserPerson(user: ReturnType<typeof useCurrentUser>): TicketPerson {
  return {
    uid: user?.uid ?? "",
    name: user?.displayName || user?.email || "Equipo Formeta",
    email: user?.email ?? "",
  };
}

function messageTitle(message: TicketMessage): string {
  if (message.internal) return "Nota interna";
  if (message.direction === "outbound") return "Respuesta enviada";
  return message.from.name || message.from.email || "Cliente";
}

type BadgeTone = "blue" | "amber" | "green" | "gray" | "red" | "neutral";

const STATUS_TONE: Record<TicketStatus, BadgeTone> = {
  nuevo: "blue",
  triage: "neutral",
  esperando_cliente: "amber",
  planificado: "neutral",
  en_progreso: "blue",
  esperando_release: "amber",
  resuelto: "green",
  cerrado: "gray",
  spam: "red",
};

function priorityTone(priority: TicketPriority): BadgeTone {
  if (priority === "urgent") return "red";
  if (priority === "high") return "amber";
  return "neutral";
}

function slaInfo(due: "ok" | "risk" | "overdue"): { tone: BadgeTone; label: string } {
  if (due === "overdue") return { tone: "red", label: "SLA vencido" };
  if (due === "risk") return { tone: "amber", label: "SLA en riesgo" };
  return { tone: "green", label: "SLA OK" };
}

function messageKind(message: TicketMessage): "inbound" | "outbound" | "internal" {
  if (message.internal) return "internal";
  return message.direction === "outbound" ? "outbound" : "inbound";
}

const MSG_KIND_LABEL: Record<"inbound" | "outbound" | "internal", string> = {
  inbound: "Cliente",
  outbound: "Enviado",
  internal: "Interno",
};

function relativeTime(ts: { toMillis?: () => number } | null | undefined): string {
  const ms = ts?.toMillis?.() ?? 0;
  if (!ms) return "";
  const diff = Date.now() - ms;
  const m = Math.round(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

function makeTaskInput(
  draft: TicketAiSuggestion["proposedTasks"][number],
  ticket: Ticket,
  order: number,
): TaskInput {
  return {
    title: draft.title,
    description: `${draft.description}\n\nOrigen: ${draft.sourceNote}`,
    status: "todo",
    priority: draft.priority,
    dueDate: "",
    order,
    assignedTo: null,
    sourceTicketId: ticket.id,
    sourceTicketNumber: ticket.number,
  };
}

export function TicketsView() {
  const currentUser = useCurrentUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [outbox, setOutbox] = useState<TicketOutbox[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<TicketMailSettings>(DEFAULT_TICKET_SETTINGS);
  const [settingsDraft, setSettingsDraft] = useState<TicketMailSettings>(DEFAULT_TICKET_SETTINGS);
  const [queueKey, setQueueKey] = useState<QueueKey>("nuevos");
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [composerMode, setComposerMode] = useState<"cliente" | "interna">("cliente");
  const [triageDraft, setTriageDraft] = useState<TicketTriageChecklist>(emptyTriage);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [newTicket, setNewTicket] = useState<NewTicketInput>(emptyNewTicket);
  const [taskCreating, setTaskCreating] = useState<Record<number, boolean>>({});
  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => subscribeToTickets(setTickets), []);
  useEffect(() => subscribeToClients(setClients), []);
  useEffect(() => subscribeToProjects(setProjects), []);
  useEffect(() => subscribeToAllUsers(setUsers), []);
  useEffect(
    () =>
      subscribeToTicketSettings((nextSettings) => {
        setSettings(nextSettings);
        setSettingsDraft(nextSettings);
      }),
    [],
  );

  const queues = useMemo(
    () => buildTicketQueues(tickets, currentUser?.uid),
    [tickets, currentUser?.uid],
  );

  const selected = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  useEffect(() => {
    if (!selectedId && tickets[0]) {
      setSelectedId(tickets[0].id);
    }
  }, [selectedId, tickets]);

  useEffect(() => {
    if (!selected) return;
    setTriageDraft(selected.triage);
    setReply(selected.ai?.replyDraft ?? "");
  }, [selected]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setOutbox([]);
      return;
    }
    const unsubMessages = subscribeToTicketMessages(selectedId, setMessages);
    const unsubOutbox = subscribeToTicketOutbox(selectedId, setOutbox);
    return () => {
      unsubMessages();
      unsubOutbox();
    };
  }, [selectedId]);

  const queueTickets = queues[queueKey];
  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return queueTickets;
    return queueTickets.filter((ticket) =>
      [
        ticket.number,
        ticket.subject,
        ticket.clientName,
        ticket.requester.email,
        ticket.requester.name,
        ticket.summary,
        ticket.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [queueTickets, search]);

  const projectsForSelectedClient = useMemo(() => {
    if (!selected?.clientId) return projects;
    return projects.filter((project) => project.clientId === selected.clientId);
  }, [projects, selected?.clientId]);

  const stats = useMemo(() => {
    const open = tickets.filter((ticket) => !isTicketClosed(ticket)).length;
    const overdue = tickets.filter((ticket) => ticketDueState(ticket) === "overdue").length;
    const waiting = tickets.filter((ticket) => ticket.status === "esperando_cliente").length;
    const urgent = tickets.filter(isTicketUrgent).length;
    return { open, overdue, waiting, urgent };
  }, [tickets]);

  async function patchSelected(data: Parameters<typeof updateTicket>[1]) {
    if (!selected) return;
    await updateTicket(selected.id, data);
  }

  async function handleStatusChange(status: TicketStatus) {
    if (!selected) return;
    if (status === "en_progreso" && !selected.owner) {
      setAiError("Asigna un owner antes de pasar el ticket a En progreso.");
      return;
    }
    const extra =
      status === "resuelto"
        ? { "sla.resolvedAt": Timestamp.now() }
        : status === "cerrado"
          ? { closedAt: Timestamp.now() }
          : {};
    await patchSelected({ status, ...extra } as Parameters<typeof updateTicket>[1]);
  }

  async function handleClientChange(clientId: string) {
    const client = clients.find((item) => item.id === clientId);
    await patchSelected({
      clientId,
      clientName: client?.name ?? "",
      projectId: "",
      projectName: "",
    });
  }

  async function handleProjectChange(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    await patchSelected({
      projectId,
      projectName: project?.name ?? "",
    });
  }

  async function handleOwnerChange(uid: string) {
    const user = users.find((item) => item.uid === uid);
    await patchSelected({ owner: userToTicketPerson(user) });
  }

  async function handleSeverityChange(severity: TicketSeverity) {
    await patchSelected({
      severity,
      sla: buildTicketSla(severity, settings),
    });
  }

  async function saveAdminSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setSettingsSaving(true);
    setSettingsMessage("");
    try {
      await saveTicketSettings(settingsDraft);
      setSettingsMessage("Configuración guardada.");
    } catch {
      setSettingsMessage("No se ha podido guardar la configuración.");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function saveTriage() {
    await patchSelected({ triage: triageDraft });
  }

  async function runAi() {
    if (!selected) return;
    setAiLoading(true);
    setAiError("");
    try {
      const recent = await findRecentTicketsByClient(selected.clientId);
      const response = await fetch("/api/tickets/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket: {
            number: selected.number,
            subject: selected.subject,
            requesterEmail: selected.requester.email,
            clientName: selected.clientName,
            projectName: selected.projectName,
            status: selected.status,
            priority: selected.priority,
            severity: selected.severity,
            summary: selected.summary,
            tags: selected.tags,
          },
          messages: messages.map((message) => ({
            direction: message.direction,
            from: message.from.email || message.from.name,
            subject: message.subject,
            text: message.text,
            attachments: message.attachments.map((attachment) => ({
              filename: attachment.filename,
              contentType: attachment.contentType,
              textPreview: attachment.textPreview,
            })),
          })),
          recentTickets: recent
            .filter((ticket) => ticket.id !== selected.id)
            .map((ticket) => ({
              number: ticket.number,
              subject: ticket.subject,
              summary: ticket.summary,
              status: ticket.status,
            })),
          // Usa la clave Gemini personal del usuario si el servidor no tiene una global.
          apiKeyOverride: currentUser?.geminiApiKey || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAiError(
          data.error ??
            data.disabledReason ??
            "No se ha podido analizar el ticket. Configura una clave Gemini en Equipo › Preferencias.",
        );
        return;
      }
      const ai = data as TicketAiSuggestion;
      await updateTicket(selected.id, {
        ai,
        summary: ai.summary,
        intent: ai.intent,
        severity: ai.severity,
        duplicateOfTicketNumber: ai.duplicateTicketNumber,
      });
      setReply(ai.replyDraft);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleComposerSend() {
    if (!selected || !reply.trim() || !currentUser) return;
    setSaving(true);
    try {
      if (composerMode === "cliente") {
        await createTicketReplyOutbox(selected, reply, currentUserPerson(currentUser));
      } else {
        await addInternalTicketNote(selected.id, reply, currentUserPerson(currentUser));
      }
      setReply("");
    } finally {
      setSaving(false);
    }
  }

  async function createSuggestedTask(index: number) {
    if (!selected?.projectId || !selected.ai?.proposedTasks[index]) return;
    setTaskCreating((prev) => ({ ...prev, [index]: true }));
    try {
      const draft = selected.ai.proposedTasks[index];
      const taskId = await createTask(
        selected.projectId,
        makeTaskInput(draft, selected, Date.now() + index),
      );
      await updateTicket(selected.id, {
        taskLinks: [
          ...selected.taskLinks,
          {
            projectId: selected.projectId,
            projectName: selected.projectName,
            taskId,
            title: draft.title,
            status: "todo",
            priority: draft.priority,
            createdAt: Timestamp.now(),
          },
        ],
      });
    } finally {
      setTaskCreating((prev) => ({ ...prev, [index]: false }));
    }
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.requester.email.trim()) return;
    setSaving(true);
    try {
      const id = await createManualTicket(newTicket);
      setSelectedId(id);
      setCreatingTicket(false);
      setNewTicket(emptyNewTicket);
    } finally {
      setSaving(false);
    }
  }

  const dueState = selected ? ticketDueState(selected) : "ok";

  // Keep latest runAi for the keyboard shortcut without re-binding the listener.
  const runAiRef = useRef<() => void>(() => {});
  runAiRef.current = () => void runAi();

  // Keyboard shortcuts: j/k navega la lista, a = analizar IA.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const el = event.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (filteredTickets.length === 0) return;
      const idx = filteredTickets.findIndex((t) => t.id === selectedId);
      if (event.key === "j") {
        event.preventDefault();
        setSelectedId((filteredTickets[Math.min(filteredTickets.length - 1, idx + 1)] ?? filteredTickets[0]).id);
      } else if (event.key === "k") {
        event.preventDefault();
        setSelectedId((filteredTickets[Math.max(0, idx - 1)] ?? filteredTickets[0]).id);
      } else if (event.key === "a") {
        event.preventDefault();
        runAiRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filteredTickets, selectedId]);

  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div>
            <p className={styles.kicker}>Soporte</p>
            <h1 className={styles.title}>Tickets</h1>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setCreatingTicket(true)}
            aria-label="Crear ticket manual"
          >
            <Plus width={17} height={17} />
          </button>
          {isAdmin && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setAdminOpen(true)}
              aria-label="Configurar ticketing"
            >
              <Settings width={17} height={17} />
            </button>
          )}
        </div>

        <div className={styles.stats}>
          <div><strong>{stats.open}</strong><span>abiertos</span></div>
          <div><strong>{stats.overdue}</strong><span>vencidos</span></div>
          <div><strong>{stats.urgent}</strong><span>urgentes</span></div>
          <div><strong>{stats.waiting}</strong><span>esperando</span></div>
        </div>

        <div className={styles.searchBox}>
          <Search width={14} height={14} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ticket"
          />
        </div>

        <nav className={styles.queues} aria-label="Bandejas de tickets">
          {QUEUES.map((queue) => {
            const Icon = queue.icon;
            const count = queues[queue.key].length;
            return (
              <button
                key={queue.key}
                type="button"
                className={`${styles.queueButton} ${queueKey === queue.key ? styles.queueButtonActive : ""}`}
                onClick={() => setQueueKey(queue.key)}
              >
                <Icon width={15} height={15} />
                <span>{queue.label}</span>
                <strong>{count}</strong>
              </button>
            );
          })}
        </nav>

        <div className={styles.ticketList}>
          {filteredTickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              className={`${styles.ticketCard} ${selected?.id === ticket.id ? styles.ticketCardActive : ""}`}
              onClick={() => setSelectedId(ticket.id)}
              data-due={ticketDueState(ticket)}
            >
              <div className={styles.cardTop}>
                <span className={styles.ticketNumber}>{ticket.number}</span>
                <span className={styles.badge} data-tone={STATUS_TONE[ticket.status]}>
                  {ticketStatusLabel(ticket.status)}
                </span>
              </div>
              <span className={styles.ticketSubject}>{ticket.subject || "(sin asunto)"}</span>
              <div className={styles.cardLine}>
                <span className={styles.cardClient}>
                  {ticket.clientName || ticket.requester.name || ticket.requester.email || "Sin cliente"}
                </span>
                {(ticket.priority === "urgent" || ticket.priority === "high") && (
                  <>
                    <span className={styles.cardSep}>·</span>
                    <span className={styles.badge} data-tone={priorityTone(ticket.priority)}>
                      {ticketPriorityLabel(ticket.priority)}
                    </span>
                  </>
                )}
                <span className={styles.relTime}>{relativeTime(ticket.lastMessageAt ?? ticket.updatedAt)}</span>
              </div>
            </button>
          ))}
          {filteredTickets.length === 0 && (
            <p className={styles.empty}>No hay tickets en esta bandeja.</p>
          )}
        </div>
      </aside>

      <section className={styles.detail}>
        {!selected ? (
          <div className={styles.emptyState}>
            <Inbox width={36} height={36} />
            <p>No hay tickets todavía.</p>
          </div>
        ) : (
          <>
            <header className={styles.detailHeader}>
              <div style={{ minWidth: 0 }}>
                <div className={styles.badgeRow}>
                  <span className={styles.ticketNumber}>{selected.number}</span>
                  {(() => { const s = slaInfo(dueState); return (
                    <span className={styles.badge} data-tone={s.tone}>{s.label}</span>
                  ); })()}
                  <span className={styles.badge} data-tone={STATUS_TONE[selected.status]}>
                    {ticketStatusLabel(selected.status)}
                  </span>
                  <span className={styles.badge} data-tone={priorityTone(selected.priority)}>
                    {ticketPriorityLabel(selected.priority)}
                  </span>
                  {selected.confidential && (
                    <span className={styles.confidential}><Lock width={11} height={11} /> Confidencial</span>
                  )}
                </div>
                <h2>{selected.subject}</h2>
                <p>
                  {selected.requester.name || selected.requester.email}
                  {selected.clientName ? ` · ${selected.clientName}` : ""}
                  {selected.projectName ? ` · ${selected.projectName}` : ""}
                  {` · ${ticketIntentLabel(selected.intent)}`}
                </p>
              </div>
            </header>

            <div className={styles.quickActions}>
              {selected.status === "cerrado" || selected.status === "spam" ? (
                <button type="button" className={styles.primaryButton} onClick={() => void handleStatusChange("triage")}>
                  <Inbox width={13} height={13} /> Reabrir ticket
                </button>
              ) : (
                <>
                  <button type="button" className={styles.primaryButton} onClick={() => void handleStatusChange("resuelto")} disabled={selected.status === "resuelto"}>
                    <CheckCircle2 width={13} height={13} /> Resolver
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={() => void handleStatusChange("esperando_cliente")} disabled={selected.status === "esperando_cliente"}>
                    <Mail width={13} height={13} /> Esperando cliente
                  </button>
                  <button type="button" className={styles.tertiaryButton} onClick={() => void handleStatusChange("cerrado")}>
                    <Archive width={13} height={13} /> Cerrar
                  </button>
                  <button type="button" className={styles.dangerButton} onClick={() => void handleStatusChange("spam")}>
                    <AlertTriangle width={13} height={13} /> Spam
                  </button>
                </>
              )}
            </div>

            <div className={styles.summaryBand}>
              <div>
                <span>Resumen</span>
                <p>{selected.summary || selected.ai?.summary || "Sin resumen todavía."}</p>
              </div>
              <div>
                <span>Tipo</span>
                <p>{ticketIntentLabel(selected.intent)}</p>
              </div>
              <div>
                <span>Severidad</span>
                <p>{ticketSeverityLabel(selected.severity)}</p>
              </div>
            </div>

            <div className={styles.thread}>
              {messages.map((message) => {
                const kind = messageKind(message);
                return (
                  <article key={message.id} data-kind={kind} className={styles.message}>
                    <div className={styles.messageHeader}>
                      <span className={styles.messageHeaderLeft}>
                        <span className={styles.msgTag} data-kind={kind}>{MSG_KIND_LABEL[kind]}</span>
                        <strong>{messageTitle(message)}</strong>
                      </span>
                      <span>{formatTicketDate(message.createdAt)}</span>
                    </div>
                    {message.subject && <p className={styles.messageSubject}>{message.subject}</p>}
                    <p className={styles.messageBody}>{message.text || "Sin cuerpo de texto."}</p>
                    {message.attachments.length > 0 && (
                      <div className={styles.attachments}>
                        {message.attachments.map((attachment) => (
                          <a key={attachment.id} href={attachment.downloadUrl} target="_blank" rel="noreferrer">
                            <FileText width={13} height={13} />
                            {attachment.filename}
                          </a>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
              {messages.length === 0 && (
                <p className={styles.empty}>Este ticket aún no tiene mensajes cargados.</p>
              )}
            </div>

            {/* Composer fijo */}
            <div className={styles.composer}>
              <div className={styles.composerModes}>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${composerMode === "cliente" ? styles.modeBtnActive : ""}`}
                  data-mode="cliente"
                  onClick={() => setComposerMode("cliente")}
                >
                  Responder cliente
                </button>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${composerMode === "interna" ? styles.modeBtnActive : ""}`}
                  data-mode="interna"
                  onClick={() => setComposerMode("interna")}
                >
                  Nota interna
                </button>
              </div>
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={3}
                placeholder={composerMode === "cliente" ? "Escribe la respuesta al cliente…" : "Nota interna (no visible para el cliente)…"}
              />
              <div className={styles.composerBar}>
                {composerMode === "cliente" && (
                  <select
                    className={styles.composerSelect}
                    value=""
                    onChange={(event) => {
                      const key = event.target.value as TicketTemplateKey;
                      if (!key) return;
                      const source = settings.templates[key] ?? "";
                      setReply(
                        source.replace(/\{\{(\w+)\}\}/g, (_, k) => {
                          if (k === "name") return selected.requester.name || "";
                          if (k === "ticketNumber") return selected.number || "";
                          return `{{${k}}}`;
                        }),
                      );
                    }}
                  >
                    <option value="">Plantilla…</option>
                    {TEMPLATE_KEYS.map((key) => (
                      <option key={key} value={key}>{TEMPLATE_LABELS[key]}</option>
                    ))}
                  </select>
                )}
                {composerMode === "cliente" && selected.ai?.replyDraft && (
                  <button type="button" className={styles.tertiaryButton} onClick={() => setReply(selected.ai!.replyDraft)}>
                    <Sparkles width={13} height={13} /> IA redactar
                  </button>
                )}
                <span className={styles.spacer} />
                {outbox.length > 0 && (
                  <span className={styles.outboxList}>
                    {outbox.slice(0, 2).map((item) => (
                      <span key={item.id}>{item.status} · {formatTicketDate(item.createdAt)}</span>
                    ))}
                  </span>
                )}
                <button
                  type="button"
                  className={composerMode === "cliente" ? styles.primaryButton : styles.secondaryButton}
                  disabled={saving || !reply.trim()}
                  onClick={() => void handleComposerSend()}
                >
                  {composerMode === "cliente" ? <Send width={13} height={13} /> : <Tag width={13} height={13} />}
                  {composerMode === "cliente" ? "Enviar respuesta" : "Guardar nota"}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {selected && (
        <aside className={styles.ops}>
          {aiError && <p className={styles.error}>{aiError}</p>}

          <section className={styles.panel}>
            <h3>Gestión</h3>
            <label>
              Estado
              <select value={selected.status} onChange={(event) => void handleStatusChange(event.target.value as TicketStatus)}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{ticketStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label>
              Owner
              <select value={selected.owner?.uid ?? ""} onChange={(event) => void handleOwnerChange(event.target.value)}>
                <option value="">Sin asignar</option>
                {users.map((user) => (
                  <option key={user.uid} value={user.uid}>{user.displayName || user.email}</option>
                ))}
              </select>
            </label>
            <label>
              Cliente
              <select value={selected.clientId} onChange={(event) => void handleClientChange(event.target.value)}>
                <option value="">Sin cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
            <label>
              Proyecto
              <select value={selected.projectId} onChange={(event) => void handleProjectChange(event.target.value)}>
                <option value="">Elegir proyecto</option>
                {projectsForSelectedClient.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
            <div className={styles.inlineFields}>
              <label>
                Prioridad
                <select value={selected.priority} onChange={(event) => void patchSelected({ priority: event.target.value as TicketPriority })}>
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>{ticketPriorityLabel(priority)}</option>
                  ))}
                </select>
              </label>
              <label>
                Severidad
                <select value={selected.severity} onChange={(event) => void handleSeverityChange(event.target.value as TicketSeverity)}>
                  {SEVERITIES.map((severity) => (
                    <option key={severity} value={severity}>{ticketSeverityLabel(severity)}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void patchSelected({ confidential: !selected.confidential })}
            >
              <Lock width={13} height={13} />
              {selected.confidential ? "Quitar confidencial" : "Marcar confidencial"}
            </button>
          </section>

          <section className={styles.panel}>
            <h3>SLA</h3>
            <div className={styles.slaGrid}>
              <span>Primera respuesta</span>
              <strong>{selected.sla.firstRespondedAt ? formatTicketDate(selected.sla.firstRespondedAt) : formatTicketDate(selected.sla.firstResponseDueAt)}</strong>
              <span>Resolución</span>
              <strong>{selected.sla.resolvedAt ? formatTicketDate(selected.sla.resolvedAt) : formatTicketDate(selected.sla.resolutionDueAt)}</strong>
            </div>
          </section>

          <section className={styles.panel}>
            <h3>Checklist triage</h3>
            {Object.keys(emptyTriage).map((key) => (
              <label key={key}>
                {key}
                <input
                  value={triageDraft[key as keyof TicketTriageChecklist]}
                  onChange={(event) =>
                    setTriageDraft((prev) => ({
                      ...prev,
                      [key]: event.target.value,
                    }))
                  }
                  onBlur={() => void saveTriage()}
                />
              </label>
            ))}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>IA</h3>
              <button type="button" className={styles.secondaryButton} onClick={() => void runAi()} disabled={aiLoading}>
                <Sparkles width={13} height={13} />
                {aiLoading ? "Analizando…" : selected.ai ? "Re-analizar" : "Analizar"}
              </button>
            </div>
            {selected.ai ? (
              <>
                <p className={styles.aiReason}>{selected.ai.severityReason}</p>
                {selected.ai.missingInfo.length > 0 && (
                  <div className={styles.chips}>
                    {selected.ai.missingInfo.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                )}
                {selected.ai.duplicateTicketNumber && (
                  <p className={styles.warning}>Posible duplicado: {selected.ai.duplicateTicketNumber}</p>
                )}
                {selected.ai.proposedTasks.length > 0 && !selected.projectId && (
                  <p className={styles.warning}>
                    Asigna un proyecto a este ticket para poder crear las tareas sugeridas.
                  </p>
                )}
                <div className={styles.taskDrafts}>
                  {selected.ai.proposedTasks.map((task, index) => {
                    const alreadyCreated = selected.taskLinks.some(
                      (link) => link.title === task.title,
                    );
                    return (
                      <div key={`${task.title}-${index}`} className={styles.taskDraft}>
                        <strong>{task.title}</strong>
                        <p>{task.description}</p>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          disabled={!selected.projectId || taskCreating[index] || alreadyCreated}
                          onClick={() => void createSuggestedTask(index)}
                          title={!selected.projectId ? "Asigna un proyecto primero" : undefined}
                        >
                          <CheckCircle2 width={13} height={13} />
                          {alreadyCreated ? "Tarea creada" : taskCreating[index] ? "Creando…" : "Crear tarea"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className={styles.muted}>Analiza el ticket para generar resumen, respuesta y tareas.</p>
            )}
          </section>

        </aside>
      )}

      {creatingTicket && (
        <div className={styles.modalBackdrop}>
          <form className={styles.modal} onSubmit={(event) => void handleCreateTicket(event)}>
            <h2>Nuevo ticket manual</h2>
            <label>
              Asunto
              <input value={newTicket.subject} onChange={(event) => setNewTicket((prev) => ({ ...prev, subject: event.target.value }))} />
            </label>
            <label>
              Nombre
              <input value={newTicket.requester.name} onChange={(event) => setNewTicket((prev) => ({ ...prev, requester: { ...prev.requester, name: event.target.value } }))} />
            </label>
            <label>
              Email
              <input type="email" value={newTicket.requester.email} onChange={(event) => setNewTicket((prev) => ({ ...prev, requester: { ...prev.requester, email: event.target.value } }))} />
            </label>
            <label>
              Cliente
              <select
                value={newTicket.clientId}
                onChange={(event) => {
                  const client = clients.find((item) => item.id === event.target.value);
                  setNewTicket((prev) => ({
                    ...prev,
                    clientId: event.target.value,
                    clientName: client?.name ?? "",
                  }));
                }}
              >
                <option value="">Sin cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
            <label>
              Mensaje inicial
              <textarea value={newTicket.text} onChange={(event) => setNewTicket((prev) => ({ ...prev, text: event.target.value }))} rows={5} />
            </label>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setCreatingTicket(false)}>Cancelar</button>
              <button type="submit" className={styles.primaryButton} disabled={saving}>Crear ticket</button>
            </div>
          </form>
        </div>
      )}

      {adminOpen && (
        <div className={styles.modalBackdrop}>
          <form className={`${styles.modal} ${styles.adminModal}`} onSubmit={(event) => void saveAdminSettings(event)}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.kicker}>Admin</p>
                <h2>Ticketing</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setAdminOpen(false)} aria-label="Cerrar configuración">
                ×
              </button>
            </div>

            <div className={styles.adminGrid}>
              <label>
                Email soporte
                <input
                  value={settingsDraft.supportEmail}
                  onChange={(event) => setSettingsDraft((prev) => ({ ...prev, supportEmail: event.target.value }))}
                />
              </label>
              <label>
                Remitente
                <input
                  value={settingsDraft.fromName}
                  onChange={(event) => setSettingsDraft((prev) => ({ ...prev, fromName: event.target.value }))}
                />
              </label>
              <label>
                URL tickets
                <input
                  value={settingsDraft.publicBaseUrl}
                  onChange={(event) => setSettingsDraft((prev) => ({ ...prev, publicBaseUrl: event.target.value }))}
                />
              </label>
              <label>
                Buzón Gmail (Workspace)
                <input
                  value={settingsDraft.gmailUser}
                  onChange={(event) => setSettingsDraft((prev) => ({ ...prev, gmailUser: event.target.value }))}
                  placeholder="formeta@formeta.es"
                />
              </label>
              <label>
                Alias de soporte (crea tickets)
                <input
                  value={settingsDraft.supportAlias}
                  onChange={(event) => setSettingsDraft((prev) => ({ ...prev, supportAlias: event.target.value }))}
                  placeholder="support@formeta.es"
                />
              </label>
              <label>
                Poll segundos
                <input
                  type="number"
                  value={settingsDraft.pollSeconds}
                  onChange={(event) => setSettingsDraft((prev) => ({ ...prev, pollSeconds: Number(event.target.value) }))}
                />
              </label>
              <label>
                Adjuntos MB
                <input
                  type="number"
                  value={settingsDraft.maxAttachmentMb}
                  onChange={(event) => setSettingsDraft((prev) => ({ ...prev, maxAttachmentMb: Number(event.target.value) }))}
                />
              </label>
              <label>
                Reapertura días
                <input
                  type="number"
                  value={settingsDraft.reopenWindowDays}
                  onChange={(event) => setSettingsDraft((prev) => ({ ...prev, reopenWindowDays: Number(event.target.value) }))}
                />
              </label>
            </div>

            <div className={styles.adminSection}>
              <h3>SLA</h3>
              <div className={styles.slaSettingsGrid}>
                {SEVERITIES.map((severity) => (
                  <div key={severity} className={styles.slaSetting}>
                    <strong>{ticketSeverityLabel(severity)}</strong>
                    <label>
                      Primera respuesta
                      <input
                        type="number"
                        value={settingsDraft.sla[severity].firstResponseHours}
                        onChange={(event) =>
                          setSettingsDraft((prev) => ({
                            ...prev,
                            sla: {
                              ...prev.sla,
                              [severity]: {
                                ...prev.sla[severity],
                                firstResponseHours: Number(event.target.value),
                              },
                            },
                          }))
                        }
                      />
                    </label>
                    <label>
                      Resolución
                      <input
                        type="number"
                        value={settingsDraft.sla[severity].resolutionHours}
                        onChange={(event) =>
                          setSettingsDraft((prev) => ({
                            ...prev,
                            sla: {
                              ...prev.sla,
                              [severity]: {
                                ...prev.sla[severity],
                                resolutionHours: Number(event.target.value),
                              },
                            },
                          }))
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.adminSection}>
              <h3>Plantillas</h3>
              <div className={styles.templateGrid}>
                {TEMPLATE_KEYS.map((key) => (
                  <label key={key}>
                    {TEMPLATE_LABELS[key]}
                    <textarea
                      rows={5}
                      value={settingsDraft.templates[key]}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          templates: {
                            ...prev.templates,
                            [key]: event.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            {settingsMessage && <p className={styles.saveMessage}>{settingsMessage}</p>}
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setSettingsDraft(settings)}>
                Restaurar
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => setAdminOpen(false)}>
                Cerrar
              </button>
              <button type="submit" className={styles.primaryButton} disabled={settingsSaving}>
                {settingsSaving ? "Guardando" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
