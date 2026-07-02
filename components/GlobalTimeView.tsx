"use client";

import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { formatDuration } from "@/lib/timerContext";
import {
  deleteTimeEntry,
  exportTimeEntriesToCsv,
  subscribeToAllTimeEntries,
  type TimeEntry,
} from "@/lib/timeEntries";
import styles from "@/styles/intranet-time-global.module.css";

type Filter = "week" | "month" | "quarter";

const DAY_MS = 86400000;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabel(dateStr: string) {
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - DAY_MS));
  if (dateStr === today) return "Hoy";
  if (dateStr === yesterday) return "Ayer";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function timeFmt(ts: { seconds: number }) {
  return new Date(ts.seconds * 1000).toLocaleTimeString("es-ES", {
    hour: "2-digit", minute: "2-digit",
  });
}

const FILTER_DAYS: Record<Filter, number> = { week: 7, month: 30, quarter: 90 };
const FILTER_LABELS: Record<Filter, string> = { week: "7 días", month: "30 días", quarter: "90 días" };

export function GlobalTimeView() {
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("month");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAllTimeEntries(setAllEntries, 90);
    return unsub;
  }, []);

  // La confirmación de borrado caduca sola a los 3s si no se confirma
  useEffect(() => {
    if (!confirmDelete) return;
    const id = setTimeout(() => setConfirmDelete(null), 3000);
    return () => clearTimeout(id);
  }, [confirmDelete]);

  const entries = useMemo(() => {
    const cutoff = Date.now() - FILTER_DAYS[filter] * DAY_MS;
    return allEntries.filter((e) => e.startedAt.seconds * 1000 >= cutoff);
  }, [allEntries, filter]);

  // Stats
  const totalSec = useMemo(() => entries.reduce((a, e) => a + e.durationSeconds, 0), [entries]);

  const todaySec = useMemo(() => {
    const key = dayKey(new Date());
    return entries
      .filter((e) => dayKey(new Date(e.startedAt.seconds * 1000)) === key)
      .reduce((a, e) => a + e.durationSeconds, 0);
  }, [entries]);

  const weekSec = useMemo(() => {
    const cutoff = Date.now() - 7 * DAY_MS;
    return entries.filter((e) => e.startedAt.seconds * 1000 >= cutoff)
      .reduce((a, e) => a + e.durationSeconds, 0);
  }, [entries]);

  const sessionCount = entries.length;

  // By project
  const byProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      map.set(e.projectName, (map.get(e.projectName) ?? 0) + e.durationSeconds);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [entries]);

  const maxProjectSec = byProject[0]?.[1] ?? 1;

  // By member
  const byMember = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const name = e.userDisplayName ?? "Sin asignar";
      map.set(name, (map.get(name) ?? 0) + e.durationSeconds);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const maxMemberSec = byMember[0]?.[1] ?? 1;

  // Grouped by day
  const grouped = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const e of entries) {
      const key = dayKey(new Date(e.startedAt.seconds * 1000));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [entries]);

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Registro de trabajo</p>
          <h1 className={styles.title}>Tiempo</h1>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={() => exportTimeEntriesToCsv(entries)}
            className={styles.btnExport}
            disabled={entries.length === 0}
          >
            <Download width={13} height={13} strokeWidth={1.5} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className={styles.filterRow}>
        {(["week", "month", "quarter"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Hoy</span>
          <span className={styles.statValue}>{todaySec > 0 ? formatDuration(todaySec) : "—"}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Esta semana</span>
          <span className={styles.statValue}>{weekSec > 0 ? formatDuration(weekSec) : "—"}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Período ({FILTER_LABELS[filter]})</span>
          <span className={styles.statValue}>{totalSec > 0 ? formatDuration(totalSec) : "—"}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Sesiones</span>
          <span className={styles.statValue}>{sessionCount}</span>
          <span className={styles.statSub}>en {FILTER_LABELS[filter]}</span>
        </div>
      </div>

      {/* By project */}
      {byProject.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Por proyecto</p>
          <div className={styles.projectBars}>
            {byProject.map(([name, sec]) => (
              <div key={name} className={styles.projectBar}>
                <span className={styles.projectBarName} title={name}>{name}</span>
                <div className={styles.projectBarTrack}>
                  <div
                    className={styles.projectBarFill}
                    style={{ width: `${(sec / maxProjectSec) * 100}%` }}
                  />
                </div>
                <span className={styles.projectBarValue}>{formatDuration(sec)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By member */}
      {byMember.length > 1 && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Por miembro</p>
          <div className={styles.projectBars}>
            {byMember.map(([name, sec]) => (
              <div key={name} className={styles.projectBar}>
                <span className={styles.projectBarName} title={name}>{name}</span>
                <div className={styles.projectBarTrack}>
                  <div
                    className={styles.projectBarFill}
                    style={{ width: `${(sec / maxMemberSec) * 100}%` }}
                  />
                </div>
                <span className={styles.projectBarValue}>{formatDuration(sec)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {entries.length === 0 && (
        <p className={styles.empty}>No hay sesiones registradas en este período.</p>
      )}

      {entries.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Historial</p>
          {deleteError && (
            <p role="alert" style={{ color: "#b3261e", fontSize: "0.8rem", margin: "0 0 0.6rem" }}>
              {deleteError}
            </p>
          )}
          <div className={styles.historyBlock}>
            {Array.from(grouped.entries()).map(([key, dayEntries]) => (
              <div key={key} className={styles.dayGroup}>
                <span className={styles.dayLabel}>{dayLabel(key)}</span>
                <div className={styles.sessionList}>
                  {dayEntries.map((entry) => (
                    <div key={entry.id} className={styles.sessionRow}>
                      <div>
                        <span className={styles.sessionProject}>{entry.projectName}</span>
                        {entry.notes && (
                          <span className={styles.sessionNotes}>{entry.notes}</span>
                        )}
                      </div>
                      <span className={styles.sessionTime}>
                        {timeFmt(entry.startedAt)} → {timeFmt(entry.endedAt)}
                      </span>
                      <span className={styles.sessionDuration}>
                        {formatDuration(entry.durationSeconds)}
                      </span>
                      <button
                        type="button"
                        className={`${styles.btnDeleteEntry} ${confirmDelete === entry.id ? styles.btnDeleteEntryConfirm : ""}`}
                        onClick={() => {
                          if (confirmDelete === entry.id) {
                            setConfirmDelete(null);
                            deleteTimeEntry(entry.id).catch(() => {
                              setDeleteError("No se pudo eliminar la sesión. Inténtalo de nuevo.");
                            });
                          } else {
                            setDeleteError(null);
                            setConfirmDelete(entry.id);
                          }
                        }}
                      >
                        {confirmDelete === entry.id ? "¿Seguro?" : "×"}
                      </button>
                    </div>
                  ))}
                  <div className={styles.dayTotal}>
                    <span>Total del día</span>
                    <span>{formatDuration(dayEntries.reduce((a, e) => a + e.durationSeconds, 0))}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
