"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActivityFeed } from "@/components/ActivityFeed";
import { TimeHeatmap } from "@/components/TimeHeatmap";
import {
  expiryLabel,
  expiryStatus,
  subscribeToExpiringDomains,
  type Domain,
} from "@/lib/domains";
import { listIdeas } from "@/lib/ideas";
import { subscribeToProjects, type Project } from "@/lib/projects";
import { subscribeToAllTimeEntries, type TimeEntry } from "@/lib/timeEntries";
import { formatDuration, formatElapsed, useTimer } from "@/lib/timerContext";
import { useCurrentUser } from "@/lib/useCurrentUser";
import styles from "@/styles/intranet-dashboard.module.css";

const DAY_MS = 86400000;

function dayKey(d: Date) { return d.toISOString().slice(0, 10); }

const modules = [
  { href: "/intranet/clientes",  label: "Directorio",    title: "Clientes"  },
  { href: "/intranet/tiempo",    label: "Registro",       title: "Tiempo"    },
  { href: "/intranet/links",     label: "Accesos",        title: "Links"     },
  { href: "/intranet/proyectos", label: "Trabajo activo", title: "Proyectos" },
  { href: "/intranet/ideas",     label: "Pipeline",       title: "Ideas"     },
  { href: "/intranet/buscar",    label: "Búsqueda",       title: "Buscar"    },
];

export function IntranetDashboard() {
  const { activeTimer, elapsed, stop } = useTimer();
  const user = useCurrentUser();
  const [projects, setProjects]         = useState<Project[]>([]);
  const [entries, setEntries]           = useState<TimeEntry[]>([]);
  const [ideasCount, setIdeasCount]     = useState<number | null>(null);
  const [expiringDomains, setExpiringDomains] = useState<Domain[]>([]);

  useEffect(() => {
    const unsubP = subscribeToProjects(setProjects);
    const unsubT = subscribeToAllTimeEntries(setEntries, 365);
    const unsubD = subscribeToExpiringDomains(setExpiringDomains, 60);
    return () => { unsubP(); unsubT(); unsubD(); };
  }, []);

  const loadIdeas = useCallback(async (uid: string) => {
    try {
      const ideas = await listIdeas(uid);
      setIdeasCount(ideas.filter((i) => i.status !== "archived").length);
    } catch {
      setIdeasCount(null);
    }
  }, []);

  useEffect(() => {
    if (user) void loadIdeas(user.uid);
  }, [user, loadIdeas]);

  // Stats
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "activo").length,
    [projects],
  );

  const activeProjectsList = useMemo(
    () => projects.filter((p) => p.status === "activo").slice(0, 10),
    [projects],
  );

  const weekSec = useMemo(() => {
    const cutoff = Date.now() - 7 * DAY_MS;
    return entries
      .filter((e) => e.startedAt.seconds * 1000 >= cutoff)
      .reduce((a, e) => a + e.durationSeconds, 0);
  }, [entries]);

  const todaySec = useMemo(() => {
    const key = dayKey(new Date());
    return entries
      .filter((e) => dayKey(new Date(e.startedAt.seconds * 1000)) === key)
      .reduce((a, e) => a + e.durationSeconds, 0);
  }, [entries]);

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <p className={styles.kicker}>Dashboard</p>
        <h1>Roqueta</h1>
      </div>

      {/* Timer banner — full width, solo si hay sesión activa */}
      {activeTimer && (
        <div className={styles.timerFull}>
          <span className={styles.timerDot} />
          <div className={styles.timerInfo}>
            <span className={styles.timerLabel}>En curso</span>
            <span className={styles.timerProject}>{activeTimer.projectName}</span>
          </div>
          <span className={styles.timerElapsed}>{formatElapsed(elapsed)}</span>
          <button type="button" onClick={() => stop()} className={styles.timerStop}>
            Stop
          </button>
        </div>
      )}

      {/* Stats pills */}
      <div className={styles.statsPills}>
        <div className={styles.statPill}>
          <span className={styles.statPillValue}>{activeProjects}</span>
          <span className={styles.statPillLabel}>proyectos activos</span>
        </div>
        <div className={styles.statPill}>
          <span className={styles.statPillValue}>{todaySec > 0 ? formatDuration(todaySec) : "—"}</span>
          <span className={styles.statPillLabel}>hoy</span>
        </div>
        <div className={styles.statPill}>
          <span className={styles.statPillValue}>{weekSec > 0 ? formatDuration(weekSec) : "—"}</span>
          <span className={styles.statPillLabel}>esta semana</span>
        </div>
        <div className={styles.statPill}>
          <span className={styles.statPillValue}>{ideasCount ?? "—"}</span>
          <span className={styles.statPillLabel}>ideas</span>
        </div>
      </div>

      {/* Body: activity (left) + side widgets (right) */}
      <div className={styles.body}>

        {/* Activity feed — columna izquierda */}
        <section className={styles.activityCol}>
          <ActivityFeed />
        </section>

        {/* Side column */}
        <aside className={styles.sideCol}>

          {/* Proyectos activos */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <p className={styles.widgetTitle}>Proyectos activos</p>
            </div>
            <div className={styles.projectList}>
              {activeProjectsList.length > 0 ? (
                activeProjectsList.map((p) => (
                  <Link
                    key={p.id}
                    href={`/intranet/proyectos/${p.id}`}
                    className={styles.projectListRow}
                  >
                    <span className={styles.projectListDot} />
                    <span className={styles.projectListName}>{p.name}</span>
                    {p.clientName && (
                      <span className={styles.projectListClient}>{p.clientName}</span>
                    )}
                  </Link>
                ))
              ) : (
                <p className={styles.projectListEmpty}>Sin proyectos activos.</p>
              )}
            </div>
          </div>

          {/* Widget dominios próximos a vencer */}
          {expiringDomains.length > 0 && (
            <div className={styles.widget}>
              <div className={styles.widgetHeader}>
                <p className={styles.widgetTitle}>Dominios · próximos 60 días</p>
              </div>
              <div className={styles.domainAlertList}>
                {expiringDomains.slice(0, 5).map((d) => {
                  const st = expiryStatus(d.expiryDate);
                  return (
                    <Link
                      key={d.id}
                      href="/intranet/dominios"
                      className={styles.domainAlertRow}
                    >
                      <span className={styles.domainAlertDot} data-status={st} />
                      <span className={styles.domainAlertName}>{d.name}</span>
                      <span className={styles.domainAlertExpiry} data-status={st}>
                        {expiryLabel(d.expiryDate)}
                      </span>
                    </Link>
                  );
                })}
                {expiringDomains.length > 5 && (
                  <Link href="/intranet/dominios" className={styles.domainAlertMore}>
                    +{expiringDomains.length - 5} más · Ver todos →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Acceso rápido 2×3 */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <p className={styles.widgetTitle}>Acceso rápido</p>
            </div>
            <div className={styles.accessGrid}>
              {modules.map((mod) => (
                <Link key={mod.href} href={mod.href} className={styles.accessCard}>
                  <span className={styles.accessCardLabel}>{mod.label}</span>
                  <span className={styles.accessCardTitle}>{mod.title}</span>
                </Link>
              ))}
            </div>
          </div>

        </aside>
      </div>

      {/* Heatmap — ancho completo al fondo */}
      <section className={styles.heatmapSection}>
        <p className={styles.heatmapTitle}>Actividad · último año</p>
        <TimeHeatmap entries={entries} />
      </section>
    </main>
  );
}
