"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Command, Lightbulb, Plus, Search } from "lucide-react";

import { ActivityFeed } from "@/components/ActivityFeed";
import { TimeHeatmap } from "@/components/TimeHeatmap";
import { openCommandPalette } from "@/lib/commandPalette";
import {
  expiryLabel,
  expiryStatus,
  subscribeToExpiringDomains,
  type Domain,
} from "@/lib/domains";
import { listIdeas, type Idea } from "@/lib/ideas";
import { subscribeToProjects, type Project } from "@/lib/projects";
import { subscribeToAllTimeEntries, type TimeEntry } from "@/lib/timeEntries";
import { formatDuration, formatElapsed, useTimer } from "@/lib/timerContext";
import { useCurrentUser } from "@/lib/useCurrentUser";
import styles from "@/styles/intranet-dashboard.module.css";

const DAY_MS = 86400000;

function dayKey(d: Date) { return d.toISOString().slice(0, 10); }

export function IntranetDashboard() {
  const { activeTimer, elapsed, stop } = useTimer();
  const user = useCurrentUser();
  const [projects, setProjects]               = useState<Project[]>([]);
  const [entries, setEntries]                 = useState<TimeEntry[]>([]);
  const [ideas, setIdeas]                     = useState<Idea[]>([]);
  const [expiringDomains, setExpiringDomains] = useState<Domain[]>([]);

  useEffect(() => {
    const unsubP = subscribeToProjects(setProjects);
    const unsubT = subscribeToAllTimeEntries(setEntries, 365);
    const unsubD = subscribeToExpiringDomains(setExpiringDomains, 60);
    return () => { unsubP(); unsubT(); unsubD(); };
  }, []);

  const loadIdeas = useCallback(async (uid: string) => {
    try {
      const all = await listIdeas(uid);
      setIdeas(all);
    } catch {
      setIdeas([]);
    }
  }, []);

  useEffect(() => {
    if (user) void loadIdeas(user.uid);
  }, [user, loadIdeas]);

  // Greeting
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 13) return "Buenos días";
    if (h < 20) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  const firstName = user?.displayName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "";

  // Stats — ideas
  const ideasCount = useMemo(
    () => ideas.filter((i) => i.status !== "archived").length,
    [ideas],
  );
  const ideasUnclassified = useMemo(
    () => ideas.filter((i) => i.status === "draft").length,
    [ideas],
  );

  // Stats — projects
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "activo").length,
    [projects],
  );

  const activeProjectsList = useMemo(
    () => projects.filter((p) => p.status === "activo").slice(0, 6),
    [projects],
  );

  const totalActiveProjects = useMemo(
    () => projects.filter((p) => p.status === "activo").length,
    [projects],
  );

  // Stats — time
  const weekSec = useMemo(() => {
    const cutoff = Date.now() - 7 * DAY_MS;
    return entries
      .filter((e) => e.startedAt.seconds * 1000 >= cutoff)
      .reduce((a, e) => a + e.durationSeconds, 0);
  }, [entries]);

  const prevWeekSec = useMemo(() => {
    const end   = Date.now() - 7 * DAY_MS;
    const start = end - 7 * DAY_MS;
    return entries
      .filter((e) => {
        const ms = e.startedAt.seconds * 1000;
        return ms >= start && ms < end;
      })
      .reduce((a, e) => a + e.durationSeconds, 0);
  }, [entries]);

  const weekDeltaPct = prevWeekSec > 0
    ? Math.round(((weekSec - prevWeekSec) / prevWeekSec) * 100)
    : null;

  const todaySec = useMemo(() => {
    const key = dayKey(new Date());
    return entries
      .filter((e) => dayKey(new Date(e.startedAt.seconds * 1000)) === key)
      .reduce((a, e) => a + e.durationSeconds, 0);
  }, [entries]);

  const todayGoalPct = Math.round((todaySec / (8 * 3600)) * 100);

  const platformKey = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl";
    return /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘" : "Ctrl";
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <p className={styles.kicker}>Dashboard</p>
        <h1 className={styles.brandHeading}>
          <span className={styles.brandRoqueta}>Roqueta</span>
          <span className={styles.brandDot} aria-hidden="true" />
        </h1>
      </div>

      {/* Action zone — greeting + summary + quick actions */}
      <div className={styles.actionZone}>
        <p className={styles.actionGreeting}>
          {greeting}{firstName ? `, ${firstName}` : ""}.
        </p>
        <p className={styles.actionSummary}>
          Tienes {activeProjects} proyecto{activeProjects !== 1 ? "s" : ""} activo{activeProjects !== 1 ? "s" : ""}
          {ideasUnclassified > 0 ? `, ${ideasUnclassified} idea${ideasUnclassified !== 1 ? "s" : ""} sin revisar` : ""}
          {activeTimer ? " y un timer activo" : ""}.
        </p>
        <div className={styles.actionBtns}>
          <Link href="/intranet/proyectos?nuevo=1" className={styles.actionBtn}>
            <Plus width={11} height={11} strokeWidth={2.5} /> Nuevo proyecto
          </Link>
          <Link href="/intranet/tiempo" className={styles.actionBtn}>
            <Clock width={11} height={11} strokeWidth={2} /> Tiempo
          </Link>
          <Link href="/intranet/ideas?nuevo=1" className={styles.actionBtn}>
            <Lightbulb width={11} height={11} strokeWidth={2} /> Nueva idea
          </Link>
          <Link href="/intranet/buscar" className={styles.actionBtn}>
            <Search width={11} height={11} strokeWidth={2} /> Buscar
          </Link>
        </div>
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
          {todaySec > 0 && (
            <span className={styles.statPillDelta}>{todayGoalPct}% del objetivo (8h)</span>
          )}
        </div>
        <div className={styles.statPill}>
          <span className={styles.statPillValue}>{weekSec > 0 ? formatDuration(weekSec) : "—"}</span>
          <span className={styles.statPillLabel}>esta semana</span>
          {weekDeltaPct !== null && (
            <span className={`${styles.statPillDelta} ${weekDeltaPct >= 0 ? styles.statPillDeltaPos : styles.statPillDeltaNeg}`}>
              {weekDeltaPct >= 0 ? "+" : ""}{weekDeltaPct}% vs semana anterior
            </span>
          )}
        </div>
        <div className={styles.statPill}>
          <span className={styles.statPillValue}>{ideasCount > 0 ? ideasCount : "—"}</span>
          <span className={styles.statPillLabel}>ideas</span>
          {ideasUnclassified > 0 && (
            <span className={styles.statPillDelta}>{ideasUnclassified} sin revisar</span>
          )}
        </div>
      </div>

      {/* Heatmap — debajo del bloque de stats, antes del resto */}
      <section className={styles.heatmapSection}>
        <p className={styles.heatmapTitle}>Actividad · último año</p>
        <TimeHeatmap entries={entries} />
      </section>

      {/* Body: activity (left) + side widgets (right) */}
      <div className={styles.body}>

        {/* Activity feed — columna izquierda */}
        <section className={styles.activityCol}>
          <ActivityFeed />
        </section>

        {/* Side column */}
        <aside className={styles.sideCol}>

          {/* Section label aligned with activity feed title */}
          <p className={styles.sideColLabel}>Atajos</p>

          {/* Command palette trigger */}
          <button
            type="button"
            onClick={() => openCommandPalette()}
            className={styles.paletteTrigger}
            aria-label="Abrir paleta de comandos"
          >
            <Search width={14} height={14} strokeWidth={1.75} />
            <span className={styles.paletteTriggerText}>Buscar acciones, proyectos…</span>
            <span className={styles.paletteTriggerShortcut}>
              <Command width={10} height={10} strokeWidth={2} /> K
              <span className={styles.paletteTriggerShortcutAlt}>{platformKey}+K</span>
            </span>
          </button>

          {/* Proyectos activos */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <p className={styles.widgetTitle}>Proyectos activos</p>
              <span className={styles.widgetCount}>{totalActiveProjects}</span>
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
            {totalActiveProjects > activeProjectsList.length && (
              <Link href="/intranet/proyectos" className={styles.widgetMore}>
                Ver los {totalActiveProjects} proyectos →
              </Link>
            )}
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

        </aside>
      </div>
    </main>
  );
}
