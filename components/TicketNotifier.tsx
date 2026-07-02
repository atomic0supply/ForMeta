"use client";

import { Bell, BellOff, Inbox, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { subscribeToTickets, type Ticket } from "@/lib/tickets";
import styles from "@/styles/intranet-notify.module.css";

type Toast = { id: string; title: string; subtitle: string };

const WATERMARK_KEY = "tickets-notify-watermark";
const MUTED_KEY = "tickets-notify-muted";

function tsMs(value: Ticket["lastInboundAt"]): number {
  return value?.toMillis?.() ?? 0;
}

// Short two-tone beep via Web Audio (no asset needed).
function playBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const blip = (freq: number, start: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.18);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + 0.2);
    };
    blip(740, 0);
    blip(988, 0.16);
    window.setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    /* ignore audio errors */
  }
}

export function TicketNotifier() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [unread, setUnread] = useState(0);
  const [muted, setMuted] = useState(false);
  // El watermark se inicializa de forma síncrona (lazy) desde localStorage: si se
  // leyera en un useEffect podría llegar DESPUÉS del primer snapshot y pisar el
  // baseline o rebajar el watermark guardado.
  const watermark = useRef(-1);
  if (watermark.current < 0) {
    watermark.current =
      typeof window === "undefined" ? 0 : Number(localStorage.getItem(WATERMARK_KEY) || 0);
  }
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMuted(localStorage.getItem(MUTED_KEY) === "1");
  }, []);

  const notify = useCallback((newTickets: Ticket[]) => {
    if (newTickets.length === 0) return;

    const newest = newTickets[0];
    // Primer mensaje entrante = ticket nuevo; los siguientes son respuestas.
    // Más fiable que comparar timestamps de creación con una ventana arbitraria.
    const isNew = newest.inboundMessageCount <= 1;
    const title =
      newTickets.length === 1
        ? isNew
          ? `Nuevo ticket · ${newest.number}`
          : `Nueva respuesta · ${newest.number}`
        : `${newTickets.length} tickets nuevos`;
    const subtitle = newTickets.length === 1 ? newest.subject : newTickets.map((t) => t.number).join(", ");

    const toast: Toast = { id: `${newest.id}-${tsMs(newest.lastInboundAt)}`, title, subtitle };
    setToasts((prev) => [toast, ...prev].slice(0, 4));
    setUnread((n) => n + newTickets.length);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 8000);

    if (localStorage.getItem(MUTED_KEY) !== "1") playBeep();

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification(title, { body: subtitle, tag: toast.id });
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    return subscribeToTickets((tickets) => {
      const maxInbound = tickets.reduce((max, t) => Math.max(max, tsMs(t.lastInboundAt)), 0);

      if (!initialized.current) {
        // First snapshot: set the baseline, never notify for pre-existing tickets.
        initialized.current = true;
        if (maxInbound > watermark.current) {
          watermark.current = maxInbound;
          localStorage.setItem(WATERMARK_KEY, String(maxInbound));
        }
        return;
      }

      const fresh = tickets
        .filter((t) => tsMs(t.lastInboundAt) > watermark.current)
        .sort((a, b) => tsMs(b.lastInboundAt) - tsMs(a.lastInboundAt));

      if (fresh.length > 0) {
        watermark.current = tsMs(fresh[0].lastInboundAt);
        localStorage.setItem(WATERMARK_KEY, String(watermark.current));
        notify(fresh);
      }
    });
  }, [notify]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStorage.setItem(MUTED_KEY, next ? "1" : "0");
    // First interaction is a good moment to request OS notification permission.
    if (!next && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }

  function openTickets() {
    setUnread(0);
    setToasts([]);
    router.push("/intranet/tickets");
  }

  return (
    <>
      <div className={styles.toastWrap} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={styles.toast} onClick={openTickets} role="button" tabIndex={0}>
            <span className={styles.toastIcon}><Inbox width={16} height={16} /></span>
            <div className={styles.toastBody}>
              <div className={styles.toastTitle}>{t.title}</div>
              <div className={styles.toastSubtitle}>{t.subtitle}</div>
            </div>
            <button
              type="button"
              className={styles.toastClose}
              onClick={(e) => { e.stopPropagation(); setToasts((prev) => prev.filter((x) => x.id !== t.id)); }}
              aria-label="Cerrar"
            >
              <X width={14} height={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={styles.bell}
        onClick={openTickets}
        onContextMenu={(e) => { e.preventDefault(); toggleMute(); }}
        title={muted ? "Notificaciones silenciadas (clic derecho para activar sonido)" : "Tickets (clic derecho para silenciar)"}
        aria-label="Notificaciones de tickets"
      >
        {muted ? <BellOff width={18} height={18} /> : <Bell width={18} height={18} />}
        {unread > 0 && <span className={styles.badge}>{unread > 9 ? "9+" : unread}</span>}
      </button>
    </>
  );
}
