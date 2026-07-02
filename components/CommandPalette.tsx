"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  Command,
  CornerDownLeft,
  Folder,
  Globe,
  LayoutGrid,
  Lightbulb,
  Link2,
  Play,
  Plus,
  Search,
  Shield,
  Square,
  Users,
  type LucideIcon,
} from "lucide-react";

import { subscribeToProjects, type Project } from "@/lib/projects";
import { subscribeToCommandPalette } from "@/lib/commandPalette";
import { normalize } from "@/lib/text";
import { useTimer } from "@/lib/timerContext";
import styles from "@/styles/intranet-palette.module.css";

type CommandAction = {
  id: string;
  group: "Acciones" | "Navegación" | "Proyectos";
  label: string;
  hint?: string;
  icon: LucideIcon;
  keywords?: string;
  onSelect: () => void;
};

export function CommandPalette() {
  const router = useRouter();
  const { activeTimer, start, stop } = useTimer();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Refs con los valores actuales para el listener de teclado (se registra una vez por apertura)
  const filteredRef = useRef<CommandAction[]>([]);
  const activeIndexRef = useRef(0);

  // Subscribe to projects so they show up in the palette
  useEffect(() => {
    const unsub = subscribeToProjects(setProjects);
    return unsub;
  }, []);

  // Listen for global open events (from Ctrl+K and from triggers)
  useEffect(() => {
    return subscribeToCommandPalette(() => setOpen(true));
  }, []);

  // Global keybinding: Ctrl+K / Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Focus input next tick
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);
  const go = useCallback(
    (href: string) => {
      router.push(href);
      close();
    },
    [router, close],
  );

  // ── Build action list ──────────────────────────────────────────────────
  const allActions: CommandAction[] = useMemo(() => {
    const items: CommandAction[] = [];

    // Acciones
    items.push(
      {
        id: "new-project",
        group: "Acciones",
        label: "Nuevo proyecto",
        hint: "Crear un proyecto desde cero",
        icon: Plus,
        keywords: "crear nuevo proyecto add",
        onSelect: () => go("/intranet/proyectos?nuevo=1"),
      },
      {
        id: "new-idea",
        group: "Acciones",
        label: "Nueva idea",
        hint: "Registrar idea para análisis IA",
        icon: Lightbulb,
        keywords: "crear nueva idea pipeline",
        onSelect: () => go("/intranet/ideas?nuevo=1"),
      },
      {
        id: "new-client",
        group: "Acciones",
        label: "Nuevo cliente",
        hint: "Añadir cliente al directorio",
        icon: Users,
        keywords: "crear nuevo cliente",
        onSelect: () => go("/intranet/clientes?nuevo=1"),
      },
      {
        id: "new-link",
        group: "Acciones",
        label: "Nuevo link",
        hint: "Guardar bookmark global",
        icon: Link2,
        keywords: "crear nuevo enlace bookmark guardar",
        onSelect: () => go("/intranet/links?nuevo=1"),
      },
      {
        id: "new-domain",
        group: "Acciones",
        label: "Nuevo dominio",
        hint: "Registrar dominio en seguimiento",
        icon: Globe,
        keywords: "crear nuevo dominio",
        onSelect: () => go("/intranet/dominios?nuevo=1"),
      },
    );
    if (activeTimer) {
      items.push({
        id: "stop-timer",
        group: "Acciones",
        label: "Parar timer",
        hint: activeTimer.projectName || "Sin asignar",
        icon: Square,
        keywords: "stop parar detener timer reloj cronometro",
        onSelect: () => {
          stop();
          close();
        },
      });
    } else {
      items.push({
        id: "start-timer",
        group: "Acciones",
        label: "Iniciar timer",
        hint: "Empieza ahora, asígnalo al parar",
        icon: Play,
        keywords: "start iniciar comenzar timer reloj cronometro",
        onSelect: () => {
          start();
          close();
        },
      });
    }

    // Navegación
    items.push(
      { id: "nav-dashboard", group: "Navegación", label: "Dashboard", icon: LayoutGrid, keywords: "inicio home", onSelect: () => go("/intranet") },
      { id: "nav-proyectos", group: "Navegación", label: "Proyectos", icon: Folder, onSelect: () => go("/intranet/proyectos") },
      { id: "nav-clientes",  group: "Navegación", label: "Clientes",  icon: Users, keywords: "directorio", onSelect: () => go("/intranet/clientes") },
      { id: "nav-tiempo",    group: "Navegación", label: "Tiempo",    icon: Clock, keywords: "horas registro", onSelect: () => go("/intranet/tiempo") },
      { id: "nav-ideas",     group: "Navegación", label: "Ideas",     icon: Lightbulb, keywords: "pipeline analisis ia", onSelect: () => go("/intranet/ideas") },
      { id: "nav-links",     group: "Navegación", label: "Links",     icon: Link2, keywords: "bookmarks accesos", onSelect: () => go("/intranet/links") },
      { id: "nav-dominios",  group: "Navegación", label: "Dominios",  icon: Globe, keywords: "vencimientos web", onSelect: () => go("/intranet/dominios") },
      { id: "nav-buscar",    group: "Navegación", label: "Buscar",    icon: Search, keywords: "buscar global search", onSelect: () => go("/intranet/buscar") },
      { id: "nav-equipo",    group: "Navegación", label: "Equipo",    icon: Shield, keywords: "admin usuarios apariencia", onSelect: () => go("/intranet/equipo") },
    );

    // Proyectos dinámicos (los 30 más recientes activos primero)
    const sortedProjects = [...projects].sort((a, b) => {
      if (a.status === "activo" && b.status !== "activo") return -1;
      if (a.status !== "activo" && b.status === "activo") return 1;
      return 0;
    });
    for (const p of sortedProjects.slice(0, 30)) {
      items.push({
        id: `proj-${p.id}`,
        group: "Proyectos",
        label: p.name,
        hint: p.clientName || undefined,
        icon: Folder,
        keywords: `${p.clientName ?? ""} ${(p.tags ?? []).join(" ")} ${p.status}`,
        onSelect: () => go(`/intranet/proyectos/${p.id}`),
      });
    }

    return items;
  }, [projects, activeTimer, go, start, stop, close]);

  // ── Filter by query ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return allActions;
    return allActions.filter((a) => {
      const haystack = normalize(`${a.label} ${a.hint ?? ""} ${a.keywords ?? ""}`);
      return haystack.includes(q);
    });
  }, [query, allActions]);

  const groupedFiltered = useMemo(() => {
    const groups: { label: string; items: CommandAction[] }[] = [];
    for (const item of filtered) {
      const last = groups[groups.length - 1];
      if (last?.label === item.group) last.items.push(item);
      else groups.push({ label: item.group, items: [item] });
    }
    return groups;
  }, [filtered]);

  // Clamp active index when filtered changes
  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, activeIndex]);

  // Mantener los refs sincronizados con el último render
  useEffect(() => {
    filteredRef.current = filtered;
  }, [filtered]);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Keyboard navigation inside palette (un solo listener por apertura; lee de refs)
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filteredRef.current.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const action = filteredRef.current[activeIndexRef.current];
        if (action) action.onSelect();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-active="true"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  if (!open) return null;

  // We'll compute a running index across groups so keyboard nav works
  let runningIndex = -1;

  return (
    <div
      className={styles.backdrop}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
    >
      <div
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.inputRow}>
          <Search width={16} height={16} strokeWidth={1.75} className={styles.inputIcon} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar acciones, proyectos, navegación…"
            className={styles.input}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className={styles.escHint}>esc</kbd>
        </div>

        <div ref={listRef} className={styles.results}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>Sin resultados para «{query}».</p>
          ) : (
            groupedFiltered.map((group) => (
              <div key={group.label} className={styles.group}>
                <p className={styles.groupLabel}>{group.label}</p>
                {group.items.map((action) => {
                  runningIndex += 1;
                  const isActive = runningIndex === activeIndex;
                  const idx = runningIndex;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
                      data-active={isActive}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => action.onSelect()}
                    >
                      <action.icon width={15} height={15} strokeWidth={1.75} className={styles.itemIcon} />
                      <span className={styles.itemLabel}>{action.label}</span>
                      {action.hint && <span className={styles.itemHint}>{action.hint}</span>}
                      {isActive && (
                        <CornerDownLeft width={12} height={12} strokeWidth={1.75} className={styles.itemEnter} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.footerHint}>
            <kbd className={styles.kbd}>↑</kbd>
            <kbd className={styles.kbd}>↓</kbd>
            navegar
          </span>
          <span className={styles.footerHint}>
            <kbd className={styles.kbd}>↵</kbd>
            seleccionar
          </span>
          <span className={styles.footerHint}>
            <kbd className={styles.kbd}><Command width={9} height={9} strokeWidth={2.5} /> K</kbd>
            abrir
          </span>
        </div>
      </div>
    </div>
  );
}
