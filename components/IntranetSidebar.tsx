"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  Clock,
  Folder,
  Globe,
  LayoutGrid,
  Lightbulb,
  Link2,
  MoreHorizontal,
  Pause,
  Play,
  Save,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import { formatElapsed, useTimer } from "@/lib/timerContext";
import { BrandWordmark } from "@/components/BrandWordmark";
import { clearSessionCookie } from "@/lib/session";
import { openCommandPalette } from "@/lib/commandPalette";
import styles from "@/styles/intranet-sidebar.module.css";

const navGroups = [
  {
    label: "Principal",
    items: [
      { href: "/intranet",           label: "Dashboard", exact: true,  icon: LayoutGrid },
      { href: "/intranet/proyectos", label: "Proyectos", exact: false, icon: Folder     },
      { href: "/intranet/clientes",  label: "Clientes",  exact: false, icon: Users      },
    ],
  },
  {
    label: "Operativa",
    items: [
      { href: "/intranet/tiempo",    label: "Tiempo",    exact: false, icon: Clock      },
      { href: "/intranet/ideas",     label: "Ideas",     exact: false, icon: Lightbulb  },
      { href: "/intranet/links",     label: "Links",     exact: false, icon: Link2      },
      { href: "/intranet/dominios",  label: "Dominios",  exact: false, icon: Globe      },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/intranet/equipo",    label: "Equipo",    exact: false, icon: Shield     },
      { href: "/intranet/buscar",    label: "Buscar",    exact: false, icon: Search     },
    ],
  },
];

// Bottom nav primary items (mobile)
const bottomPrimary = [
  { href: "/intranet",           label: "Inicio",    exact: true,  icon: LayoutGrid },
  { href: "/intranet/proyectos", label: "Proyectos", exact: false, icon: Folder     },
  { href: "/intranet/tiempo",    label: "Tiempo",    exact: false, icon: Clock      },
  { href: "/intranet/ideas",     label: "Ideas",     exact: false, icon: Lightbulb  },
];

// "Más" sheet items (the rest)
const moreItems = [
  { href: "/intranet/clientes",  label: "Clientes",  exact: false, icon: Users  },
  { href: "/intranet/links",     label: "Links",     exact: false, icon: Link2  },
  { href: "/intranet/dominios",  label: "Dominios",  exact: false, icon: Globe  },
  { href: "/intranet/buscar",    label: "Buscar",    exact: false, icon: Search },
  { href: "/intranet/equipo",    label: "Equipo",    exact: false, icon: Shield },
];

export function IntranetSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeTimer, elapsed, isPaused, start, pause, resume, stop } = useTimer();
  const [sheetOpen, setSheetOpen] = useState(false);

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  // Close sheet on navigation
  useEffect(() => { setSheetOpen(false); }, [pathname]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  async function handleSignOut() {
    if (auth) await signOut(auth);
    clearSessionCookie();
    router.replace("/login");
    router.refresh();
  }

  /* ── Timer widget (desktop sidebar only) ───────────────────────────────── */
  function TimerWidget() {
    const state = !activeTimer ? "idle" : isPaused ? "paused" : "running";

    return (
      <div className={`${styles.timerSlot} ${styles[`timer_${state}`]}`}>
        <div className={styles.timerHeader}>
          <span className={styles.timerLabel}>
            {state === "idle"    && "Timer"}
            {state === "running" && "En curso"}
            {state === "paused"  && "Pausado"}
          </span>
          <Link href="/intranet/tiempo" className={styles.timerLink}>Ver tiempo</Link>
        </div>

        {activeTimer ? (
          <>
            <p className={styles.timerProject}>{activeTimer.projectName || "Sin asignar"}</p>
            <p className={styles.timerElapsedBig}>{formatElapsed(elapsed)}</p>

            <div className={styles.timerControls}>
              {state === "running" ? (
                <button
                  type="button"
                  onClick={() => pause()}
                  className={styles.timerSecondary}
                  aria-label="Pausar timer"
                >
                  <Pause width={13} height={13} strokeWidth={2} fill="currentColor" />
                  Pausa
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => resume()}
                  className={styles.timerSecondary}
                  aria-label="Reanudar timer"
                >
                  <Play width={13} height={13} strokeWidth={2} fill="currentColor" />
                  Reanudar
                </button>
              )}
              <button
                type="button"
                onClick={() => stop()}
                className={styles.timerSave}
                aria-label="Guardar y detener"
              >
                <Save width={13} height={13} strokeWidth={2} />
                Guardar
              </button>
            </div>

            {!activeTimer.projectId && (
              <p className={styles.timerHint}>Lo podrás asignar a un proyecto al guardarlo.</p>
            )}
          </>
        ) : (
          <>
            <p className={styles.timerIdle}>Empieza ahora y asigna el proyecto al guardar.</p>
            <button type="button" onClick={() => start()} className={styles.timerStart}>
              <Play width={12} height={12} strokeWidth={2} fill="currentColor" />
              Iniciar ahora
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <BrandWordmark small />
          <span className={styles.suiteName}>Roqueta</span>
        </div>

        <nav className={styles.nav} aria-label="Navegación intranet">
          {navGroups.map((group, gi) => (
            <div key={group.label} className={styles.navGroup}>
              <span className={styles.navGroupLabel}>{group.label}</span>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive(item.href, item.exact) ? styles.navActive : ""}`}
                >
                  <item.icon width={16} height={16} strokeWidth={1.75} />
                  {item.label}
                </Link>
              ))}
              {gi < navGroups.length - 1 && <div className={styles.navDivider} />}
            </div>
          ))}
        </nav>

        <div className={styles.footer}>
          <TimerWidget />
          <Link href="/" className={styles.footerLink}>Web pública</Link>
          <button type="button" onClick={() => void handleSignOut()} className={styles.signOut}>
            Salir
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar (brand + timer badge) ──────────────────────────── */}
      <header className={styles.mobileTopBar}>
        <div className={styles.mobileTopBrand}>
          <BrandWordmark small />
          <span className={styles.mobileTopSuite}>Roqueta</span>
        </div>
        <div className={styles.mobileTopRight}>
          {activeTimer && (
            <button
              type="button"
              onClick={() => stop()}
              className={styles.mobileTimerBadge}
              aria-label="Detener timer"
            >
              <span className={styles.mobileTimerDot} />
              {formatElapsed(elapsed)}
            </button>
          )}
          <button
            type="button"
            onClick={() => openCommandPalette()}
            className={styles.mobileSearchBtn}
            aria-label="Abrir búsqueda"
          >
            <Search width={20} height={20} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav className={styles.bottomBar} aria-label="Navegación inferior">
        {bottomPrimary.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.bottomItem} ${active ? styles.bottomItemActive : ""}`}
            >
              <item.icon width={20} height={20} strokeWidth={active ? 2 : 1.6} />
              <span className={styles.bottomLabel}>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`${styles.bottomItem} ${sheetOpen ? styles.bottomItemActive : ""}`}
          aria-label="Más opciones"
        >
          <MoreHorizontal width={20} height={20} strokeWidth={1.75} />
          <span className={styles.bottomLabel}>Más</span>
        </button>
      </nav>

      {/* ── Mobile "Más" sheet ────────────────────────────────────────────── */}
      <div
        className={`${styles.sheetBackdrop} ${sheetOpen ? styles.sheetBackdropVisible : ""}`}
        onClick={() => setSheetOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`${styles.sheet} ${sheetOpen ? styles.sheetOpen : ""}`}
        aria-label="Menú adicional"
      >
        <div className={styles.sheetHandle} aria-hidden="true" />
        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>Más opciones</span>
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            className={styles.sheetClose}
            aria-label="Cerrar"
          >
            <X width={18} height={18} strokeWidth={1.75} />
          </button>
        </div>
        <nav className={styles.sheetNav}>
          {moreItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.sheetItem} ${isActive(item.href, item.exact) ? styles.sheetItemActive : ""}`}
            >
              <item.icon width={18} height={18} strokeWidth={1.75} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.sheetFooter}>
          <Link href="/" className={styles.footerLink}>Web pública</Link>
          <button type="button" onClick={() => void handleSignOut()} className={styles.signOut}>
            Salir
          </button>
        </div>
      </aside>
    </>
  );
}
