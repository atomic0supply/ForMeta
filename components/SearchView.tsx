"use client";

import { collectionGroup, onSnapshot, query } from "firebase/firestore";
import { Folder, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { db } from "@/lib/firebase";
import { subscribeToClients, type Client } from "@/lib/clients";
import { subscribeToProjects, type Project } from "@/lib/projects";
import type { Task } from "@/lib/tasks";
import styles from "@/styles/intranet-search.module.css";

type TaskWithProject = Task & { projectId: string };

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function matches(text: string, q: string) {
  return normalize(text).includes(normalize(q));
}

export function SearchView() {
  const [query2, setQuery2] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const unsubC = subscribeToClients(setClients);
    const unsubP = subscribeToProjects(setProjects);
    return () => { unsubC(); unsubP(); };
  }, []);

  // Tasks via collection group
  useEffect(() => {
    if (!db) return;
    const q = query(collectionGroup(db, "tasks"));
    const unsub = onSnapshot(q, (snap) => {
      const result: TaskWithProject[] = snap.docs.map((d) => ({
        id: d.id,
        projectId: d.ref.parent.parent?.id ?? "",
        ...(d.data() as Omit<Task, "id">),
      }));
      setTasks(result);
    });
    return unsub;
  }, []);

  const q = query2.trim();

  const filteredProjects = useMemo(() => {
    if (!q) return [];
    return projects.filter(
      (p) =>
        matches(p.name, q) ||
        matches(p.clientName ?? "", q) ||
        matches(p.description ?? "", q) ||
        p.tags?.some((t) => matches(t, q)),
    ).slice(0, 8);
  }, [projects, q]);

  const filteredClients = useMemo(() => {
    if (!q) return [];
    return clients.filter(
      (c) =>
        matches(c.name, q) ||
        matches(c.contact ?? "", q) ||
        matches(c.email ?? "", q) ||
        matches(c.sector ?? "", q),
    ).slice(0, 6);
  }, [clients, q]);

  const filteredTasks = useMemo(() => {
    if (!q) return [];
    return tasks.filter(
      (t) =>
        matches(t.title, q) ||
        matches(t.description ?? "", q),
    ).slice(0, 8);
  }, [tasks, q]);

  const hasResults = filteredProjects.length > 0 || filteredClients.length > 0 || filteredTasks.length > 0;
  const searched = q.length > 0;

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <p className={styles.kicker}>Búsqueda global</p>
        <h1 className={styles.title}>Buscar</h1>
      </div>

      <div className={styles.searchBox}>
        <Search
          width={18}
          height={18}
          strokeWidth={1.5}
          className={styles.searchIcon}
        />
        <input
          ref={inputRef}
          type="text"
          value={query2}
          onChange={(e) => setQuery2(e.target.value)}
          placeholder="Proyectos, clientes, tareas…"
          className={styles.searchInput}
          autoComplete="off"
        />
        {query2 && (
          <button
            type="button"
            onClick={() => setQuery2("")}
            className={styles.clearBtn}
          >
            <X width={16} height={16} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {!searched && (
        <p className={styles.idle}>Empieza a escribir para buscar en proyectos, clientes y tareas.</p>
      )}

      {searched && !hasResults && (
        <p className={styles.noResults}>Sin resultados para «{q}».</p>
      )}

      {searched && hasResults && (
        <div className={styles.results}>
          {/* Projects */}
          {filteredProjects.length > 0 && (
            <div className={styles.resultGroup}>
              <p className={styles.groupTitle}>
                Proyectos
                <span className={styles.groupCount}>{filteredProjects.length}</span>
              </p>
              {filteredProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/intranet/proyectos/${p.id}`}
                  className={styles.resultItem}
                >
                  <div className={styles.resultIcon}>
                    <Folder width={16} height={16} strokeWidth={1.5} />
                  </div>
                  <div className={styles.resultBody}>
                    <span className={styles.resultTitle}>{p.name}</span>
                    <span className={styles.resultMeta}>
                      {[p.clientName, p.status].filter(Boolean).join(" · ")}
                      {p.tags?.length > 0 ? ` · ${p.tags.join(", ")}` : ""}
                    </span>
                  </div>
                  <span className={`${styles.resultBadge} ${styles.badgeProject}`}>Proyecto</span>
                </Link>
              ))}
            </div>
          )}

          {/* Clients */}
          {filteredClients.length > 0 && (
            <div className={styles.resultGroup}>
              <p className={styles.groupTitle}>
                Clientes
                <span className={styles.groupCount}>{filteredClients.length}</span>
              </p>
              {filteredClients.map((c) => (
                <Link
                  key={c.id}
                  href={`/intranet/clientes/${c.id}`}
                  className={styles.resultItem}
                >
                  <div className={styles.resultIcon} style={{ background: "rgba(122,154,170,0.12)", color: "var(--sea)" }}>
                    <Users width={16} height={16} strokeWidth={1.5} />
                  </div>
                  <div className={styles.resultBody}>
                    <span className={styles.resultTitle}>{c.name}</span>
                    <span className={styles.resultMeta}>
                      {[c.sector, c.contact, c.email].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <span className={`${styles.resultBadge} ${styles.badgeClient}`}>Cliente</span>
                </Link>
              ))}
            </div>
          )}

          {/* Tasks */}
          {filteredTasks.length > 0 && (
            <div className={styles.resultGroup}>
              <p className={styles.groupTitle}>
                Tareas
                <span className={styles.groupCount}>{filteredTasks.length}</span>
              </p>
              {filteredTasks.map((t) => {
                const project = projects.find((p) => p.id === t.projectId);
                return (
                  <Link
                    key={t.id}
                    href={`/intranet/proyectos/${t.projectId}?tab=tareas`}
                    className={styles.resultItem}
                  >
                    <div className={styles.resultIcon} style={{ background: "rgba(143,168,146,0.12)", color: "#5a8a5e" }}>
                      <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>✓</span>
                    </div>
                    <div className={styles.resultBody}>
                      <span className={styles.resultTitle}>{t.title}</span>
                      <span className={styles.resultMeta}>
                        {project?.name ?? t.projectId}
                        {t.dueDate ? ` · vence ${t.dueDate}` : ""}
                      </span>
                    </div>
                    <span className={`${styles.resultBadge} ${styles.badgeTask}`}>Tarea</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
