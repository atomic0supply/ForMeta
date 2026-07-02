"use client";

import { useEffect, useMemo, useState } from "react";

import { subscribeToRecentActivity, type ActivityEvent } from "@/lib/activityLog";
import styles from "@/styles/intranet-activity.module.css";

function dayKey(d: Date) { return d.toISOString().slice(0, 10); }

function dayLabel(ts: { seconds: number } | null): string {
  if (!ts) return "Antes";
  const d = new Date(ts.seconds * 1000);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today))     return "Hoy";
  if (dayKey(d) === dayKey(yesterday)) return "Ayer";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function relativeTime(ts: { seconds: number } | null): string {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

function cleanName(raw: string): string {
  if (!raw) return "—";
  if (raw.includes("@")) return raw.split("@")[0];
  return raw.split(" ")[0];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function eventText(event: ActivityEvent): string {
  switch (event.type) {
    case "task_moved":
      return `movió «${event.payload.taskTitle ?? "tarea"}» a ${event.payload.to ?? ""}`;
    case "task_created":
      return `creó la tarea «${event.payload.taskTitle ?? ""}»`;
    case "project_created":
      return `creó el proyecto ${event.projectName}`;
    case "project_updated":
      return `actualizó ${event.projectName}`;
    case "time_saved": {
      const min = Math.round((event.payload.durationSeconds ?? 0) / 60);
      return `registró ${min}m en ${event.projectName}`;
    }
    case "comment_added":
      return `comentó en «${event.payload.taskTitle ?? "tarea"}»`;
    default:
      return `realizó una acción en ${event.projectName}`;
  }
}

function actionBadge(event: ActivityEvent): string {
  switch (event.type) {
    case "task_created":
    case "project_created":
      return "＋";
    case "time_saved":
      return "◷";
    case "comment_added":
      return "◉";
    case "task_moved":
      return "→";
    default:
      return "·";
  }
}

const COMPACT_LIMIT = 6;
const FEED_LIMIT = 25;

export function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsub = subscribeToRecentActivity(setEvents, FEED_LIMIT);
    return unsub;
  }, []);

  const visibleEvents = useMemo(
    () => (expanded ? events : events.slice(0, COMPACT_LIMIT)),
    [events, expanded],
  );

  // Group visible events by day
  const grouped = useMemo(() => {
    const groups: { label: string; events: ActivityEvent[] }[] = [];
    for (const event of visibleEvents) {
      const label = dayLabel(event.createdAt);
      const last = groups[groups.length - 1];
      if (last?.label === label) {
        last.events.push(event);
      } else {
        groups.push({ label, events: [event] });
      }
    }
    return groups;
  }, [visibleEvents]);

  if (events.length === 0) return null;

  const hiddenCount = events.length - COMPACT_LIMIT;
  // Si llegamos al tope de la suscripción puede haber más eventos: indicarlo con "+"
  const hiddenLabel = events.length >= FEED_LIMIT ? `${hiddenCount}+` : `${hiddenCount}`;
  const canExpand = events.length > COMPACT_LIMIT;

  return (
    <section className={styles.feed}>
      <p className={styles.feedTitle}>Actividad reciente</p>
      <div className={styles.feedList}>
        {grouped.map((group) => (
          <div key={group.label} className={styles.feedDayGroup}>
            <div className={styles.feedDayLabel}>{group.label}</div>
            {group.events.map((event) => (
              <div key={event.id} className={styles.feedRow}>
                <span className={styles.feedAvatarWrap}>
                  <span className={styles.feedAvatar}>{initials(event.actorName)}</span>
                  <span className={styles.feedActionBadge}>{actionBadge(event)}</span>
                </span>
                <span className={styles.feedText}>
                  <strong>{cleanName(event.actorName)}</strong>{" "}
                  {eventText(event)}
                </span>
                <span className={styles.feedTime}>{relativeTime(event.createdAt)}</span>
              </div>
            ))}
          </div>
        ))}
        {canExpand && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={styles.feedToggle}
          >
            {expanded ? "Ver menos" : `Ver más · ${hiddenLabel} eventos`}
          </button>
        )}
      </div>
    </section>
  );
}
