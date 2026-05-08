"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Clock,
  Folder,
  LayoutGrid,
  Lightbulb,
  Link2,
  Play,
  Search,
  Shield,
  Square,
  Users,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import { formatElapsed, useTimer } from "@/lib/timerContext";
import { BrandWordmark } from "@/components/BrandWordmark";
import { clearSessionCookie } from "@/lib/session";
import styles from "@/styles/intranet-sidebar.module.css";

const navItems = [
  { href: "/intranet", label: "Dashboard", exact: true, icon: LayoutGrid },
  { href: "/intranet/clientes", label: "Clientes", exact: false, icon: Users },
  { href: "/intranet/proyectos", label: "Proyectos", exact: false, icon: Folder },
  { href: "/intranet/tiempo", label: "Tiempo", exact: false, icon: Clock },
  { href: "/intranet/links", label: "Links", exact: false, icon: Link2 },
  { href: "/intranet/ideas", label: "Ideas", exact: false, icon: Lightbulb },
  { href: "/intranet/buscar", label: "Buscar", exact: false, icon: Search },
];

export function IntranetSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeTimer, elapsed, start, stop } = useTimer();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  async function handleSignOut() {
    if (auth) await signOut(auth);
    clearSessionCookie();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <BrandWordmark small />
        <span className={styles.suiteName}>Roqueta</span>
      </div>

      <nav className={styles.nav} aria-label="Navegación intranet">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive(item.href, item.exact) ? styles.navActive : ""}`}
          >
            <item.icon width={16} height={16} strokeWidth={1.75} />
            {item.label}
          </Link>
        ))}
        <Link
          href="/intranet/equipo"
          className={`${styles.navItem} ${isActive("/intranet/equipo", false) ? styles.navActive : ""}`}
        >
          <Shield width={16} height={16} strokeWidth={1.75} />
          Equipo
        </Link>
      </nav>

      <div className={styles.footer}>
        <div className={`${styles.timerSlot} ${activeTimer ? styles.timerActive : ""}`}>
          <div className={styles.timerHeader}>
            <span className={styles.timerLabel}>Timer</span>
            <Link href="/intranet/tiempo" className={styles.timerLink}>
              Ver tiempo
            </Link>
          </div>

          {activeTimer ? (
            <>
              <p className={styles.timerProject}>
                {activeTimer.projectName || "Sin asignar"}
              </p>
              <div className={styles.timerRow}>
                <span className={styles.timerElapsed}>{formatElapsed(elapsed)}</span>
                <button
                  type="button"
                  onClick={() => stop()}
                  className={styles.timerStop}
                  aria-label="Detener timer"
                >
                  <Square width={10} height={10} strokeWidth={0} fill="currentColor" />
                  Stop
                </button>
              </div>
              {!activeTimer.projectId && (
                <p className={styles.timerHint}>
                  Lo podrás asignar a un proyecto al detenerlo.
                </p>
              )}
            </>
          ) : (
            <>
              <p className={styles.timerIdle}>Empieza ahora y asigna el proyecto al parar.</p>
              <button
                type="button"
                onClick={() => start()}
                className={styles.timerStart}
              >
                <Play width={12} height={12} strokeWidth={2} fill="currentColor" />
                Iniciar ahora
              </button>
            </>
          )}
        </div>

        <Link href="/" className={styles.footerLink}>Web pública</Link>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className={styles.signOut}
        >
          Salir
        </button>
      </div>
    </aside>
  );
}
