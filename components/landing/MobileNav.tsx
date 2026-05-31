"use client";

import { useEffect, useState } from "react";

import styles from "@/styles/landing.module.css";

const ITEMS: Array<{ n: string; label: string; href: string; ext?: boolean }> = [
  { n: "02", label: "Manifiesto", href: "#manifiesto" },
  { n: "03", label: "IApp", href: "#iapp" },
  { n: "04", label: "Proceso", href: "#proceso" },
  { n: "05", label: "Stack", href: "#stack" },
  { n: "06", label: "Productos", href: "#productos" },
  { n: "07", label: "Contacto", href: "#contacto" },
  { n: "—", label: "Acceso intranet", href: "/login", ext: true },
];

/**
 * Menú móvil. Trigger visible <720px (hamburguesa minimal en HUD).
 * Overlay fullscreen offblack con items grandes en Canela italic +
 * numeración mono. Cierra con esc, click fuera, o al elegir item.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.mobileNavTrigger}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      {open ? (
        <div
          className={styles.mobileNavOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Navegación principal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className={styles.mobileNavInner}>
            <div className={styles.mobileNavHeader}>
              <span className={styles.mobileNavLabel}>{"// menú"}</span>
              <button
                type="button"
                className={styles.mobileNavClose}
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
              >
                <span>cerrar</span>
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <nav className={styles.mobileNavList} aria-label="Secciones">
              {ITEMS.map((it) => (
                <a
                  key={it.href}
                  href={it.href}
                  className={styles.mobileNavLink}
                  onClick={() => setOpen(false)}
                >
                  <span className={styles.mobileNavNum}>{it.n}</span>
                  <span className={styles.mobileNavLabelText}>
                    {it.label}
                    {it.ext ? " ↗" : ""}
                  </span>
                </a>
              ))}
            </nav>
            <div className={styles.mobileNavFoot}>
              <span>FMTA—LANDING</span>
              <span>v1.0 · 2026.05.27</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
