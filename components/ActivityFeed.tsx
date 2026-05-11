"use client";

import { useEffect, useState } from "react";

import { subscribeToRecentActivity, type ActivityEvent } from "@/lib/activityLog";
import styles from "@/styles/intranet-activity.module.css";

function relativeTime(ts: { seconds: number } | null): string {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
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

export function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    const unsub = subscribeToRecentActivity(setEvents, 30);
    return unsub;
  }, []);

  if (events.length === 0) return null;

  return (
    <section className={styles.feed}>
      <p className={styles.feedTitle}>Actividad reciente</p>
      <div className={styles.feedList}>
        {events.map((event) => (
          <div key={event.id} className={styles.feedRow}>
            <span className={styles.feedAvatarWrap}>
              <span className={styles.feedAvatar}>{initials(event.actorName)}</span>
              <span className={styles.feedActionBadge}>{actionBadge(event)}</span>
            </span>
            <span className={styles.feedText}>
              <strong>{event.actorName}</strong>{" "}
              {eventText(event)}
            </span>
            <span className={styles.feedTime}>{relativeTime(event.createdAt)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
