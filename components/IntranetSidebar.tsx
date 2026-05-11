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
  Menu,
  Play,
  Search,
  Shield,
  Square,
  Users,
  X,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import { formatElapsed, useTimer } from "@/lib/timerContext";
import { BrandWordmark } from "@/components/BrandWordmark";
import { clearSessionCookie } from "@/lib/session";
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

export function IntranetSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeTimer, elapsed, start, stop } = useTimer();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  // Close drawer on navigation
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  async function handleSignOut() {
    if (auth) await signOut(auth);
    clearSessionCookie();
    router.replace("/login");
    router.refresh();
  }

  // navGroups defined at module level above

  /* ── Timer widget (shared between sidebar and drawer) ─────────────────── */
  function TimerWidget() {
    return (
      <div className={`${styles.timerSlot} ${activeTimer ? styles.timerActive : ""}`}>
        <div className={styles.timerHeader}>
          <span className={styles.timerLabel}>Timer</span>
          <Link href="/intranet/tiempo" className={styles.timerLink}>Ver tiempo</Link>
        </div>
        {activeTimer ? (
          <>
            <p className={styles.timerProject}>{activeTimer.projectName || "Sin asignar"}</p>
            <div className={styles.timerRow}>
              <span className={styles.timerElapsed}>{formatElapsed(elapsed)}</span>
              <button type="button" onClick={() => stop()} className={styles.timerStop} aria-label="Detener timer">
                <Square width={10} height={10} strokeWidth={0} fill="currentColor" />
                Stop
              </button>
            </div>
            {!activeTimer.projectId && (
              <p className={styles.timerHint}>Lo podrás asignar a un proyecto al detenerlo.</p>
            )}
          </>
        ) : (
          <>
            <p className={styles.timerIdle}>Empieza ahora y asigna el proyecto al parar.</p>
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

      {/* ── Mobile top bar ────────────────────────────────────────────────── */}
      <header className={styles.mobileTopBar}>
        <div className={styles.mobileTopBrand}>
          <BrandWordmark small />
        </div>
        <div className={styles.mobileTopRight}>
          {activeTimer && (
            <span className={styles.mobileTimerBadge}>
              <span className={styles.mobileTimerDot} />
              {formatElapsed(elapsed)}
            </span>
          )}
          <button
            type="button"
            className={styles.mobileMenuBtn}
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu width={22} height={22} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* ── Mobile drawer backdrop ────────────────────────────────────────── */}
      <div
        className={`${styles.mobileBackdrop} ${drawerOpen ? styles.mobileBackdropVisible : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      <aside className={`${styles.mobileDrawer} ${drawerOpen ? styles.mobileDrawerOpen : ""}`}>
        <div className={styles.mobileDrawerHeader}>
          <div>
            <BrandWordmark small />
            <span className={styles.suiteName}>Roqueta</span>
          </div>
          <button
            type="button"
            className={styles.mobileDrawerClose}
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
          >
            <X width={20} height={20} strokeWidth={1.5} />
          </button>
        </div>

        <nav className={styles.mobileDrawerNav}>
          {navGroups.map((group, gi) => (
            <div key={group.label} className={styles.navGroup}>
              <span className={styles.navGroupLabel}>{group.label}</span>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.mobileDrawerItem} ${isActive(item.href, item.exact) ? styles.mobileDrawerItemActive : ""}`}
                >
                  <item.icon width={18} height={18} strokeWidth={1.75} />
                  {item.label}
                </Link>
              ))}
              {gi < navGroups.length - 1 && <div className={styles.navDivider} />}
            </div>
          ))}
        </nav>

        <div className={styles.mobileDrawerFooter}>
          <TimerWidget />
          <Link href="/" className={styles.footerLink}>Web pública</Link>
          <button type="button" onClick={() => void handleSignOut()} className={styles.signOut}>
            Salir
          </button>
        </div>
      </aside>
    </>
  );
}
