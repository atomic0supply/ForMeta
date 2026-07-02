"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import type { FormetaServicesStatus } from "@/lib/formetaServices";
import { subscribeToTicketSettings, type TicketMailSettings } from "@/lib/ticketSettings";
import styles from "@/styles/intranet-team.module.css";

type Health = "ok" | "warn" | "error" | "loading";

const DOT: Record<Health, string> = {
  ok: "#5a9e6f",
  warn: "#c98a2b",
  error: "#d05a5a",
  loading: "#9a9890",
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function StatusRow({ label, state, detail }: { label: string; state: Health; detail: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(44,44,40,0.06)" }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: DOT[state], flexShrink: 0 }} />
      <span style={{ fontWeight: 500, minWidth: 130 }}>{label}</span>
      <span style={{ fontSize: "0.82rem", color: "var(--color-muted-strong)" }}>{detail}</span>
    </div>
  );
}

export function ServiceStatusTab() {
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Firebase
  const [fbState, setFbState] = useState<Health>("loading");
  const [fbDetail, setFbDetail] = useState("Comprobando…");

  // Backend (Fiscal + RAG)
  const [backend, setBackend] = useState<FormetaServicesStatus | null>(null);
  const [backendState, setBackendState] = useState<Health>("loading");
  const [backendDetail, setBackendDetail] = useState("Comprobando…");

  // Correo (Gmail / ticketing)
  const [settings, setSettings] = useState<TicketMailSettings | null>(null);
  const [mailState, setMailState] = useState<Health>("loading");
  const [mailDetail, setMailDetail] = useState("Comprobando…");

  // Google Drive (archivos de proyectos)
  const [driveState, setDriveState] = useState<Health>("loading");
  const [driveDetail, setDriveDetail] = useState("Comprobando…");
  const [driveSub, setDriveSub] = useState("");

  // Evita setState tras el desmontaje y ejecuciones solapadas de runChecks.
  const mountedRef = useRef(true);
  const runningRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => subscribeToTicketSettings(setSettings), []);

  const runChecks = useCallback(async () => {
    if (runningRef.current) return; // ya hay una comprobación en curso
    runningRef.current = true;
    setRefreshing(true);
    const alive = () => mountedRef.current;

    try {
      // ── Firebase: lectura ligera de Firestore ──
      setFbState("loading");
      try {
        if (!db) throw new Error("SDK no inicializado");
        await getDoc(doc(db, "ticketSettings", "system"));
        if (!alive()) return;
        const who = auth?.currentUser?.email ?? "sesión activa";
        setFbState("ok");
        setFbDetail(`Conectado · ${who}`);
      } catch (err) {
        if (!alive()) return;
        setFbState("error");
        setFbDetail(err instanceof Error ? err.message : "Sin conexión");
      }

      // ── Backend Fiscal + RAG ──
      setBackendState("loading");
      try {
        const res = await fetch("/api/formeta-services/status", { cache: "no-store" });
        const data = (await res.json()) as FormetaServicesStatus;
        if (!alive()) return;
        setBackend(data);
        const oks = [data.fiscal.health.ok, data.fiscal.status.ok, data.rag.health.ok, data.rag.collections.ok];
        const okCount = oks.filter(Boolean).length;
        setBackendState(okCount === 4 ? "ok" : okCount === 0 ? "error" : "warn");
        setBackendDetail(`${okCount}/4 comprobaciones OK`);
      } catch {
        if (!alive()) return;
        setBackendState("error");
        setBackendDetail("No se pudo consultar el backend");
      }

      // ── Correo: errores recientes del worker de tickets ──
      setMailState("loading");
      try {
        if (!db) throw new Error("SDK no inicializado");
        const snap = await getDocs(
          query(collection(db, "ticketProcessingErrors"), orderBy("createdAt", "desc"), limit(5)),
        );
        if (!alive()) return;
        const recent = snap.size;
        if (recent === 0) {
          setMailState("ok");
          setMailDetail("Sin errores recientes en el worker");
        } else {
          const last = snap.docs[0].data();
          setMailState("warn");
          setMailDetail(`${recent} error(es) recientes · último: ${String(last.error ?? "").slice(0, 60)}`);
        }
      } catch {
        if (!alive()) return;
        setMailState("error");
        setMailDetail("No se pudo leer el estado del worker");
      }

      // ── Google Drive: conexión con la Unidad compartida + uso ──
      setDriveState("loading");
      try {
        const tok = await auth?.currentUser?.getIdToken();
        const res = await fetch("/api/drive/status", {
          headers: tok ? { Authorization: `Bearer ${tok}` } : {},
          cache: "no-store",
        });
        const data = await res.json();
        if (!alive()) return;
        if (!res.ok || data.error || !data.ok) {
          setDriveState("error");
          setDriveDetail(data.error || "No se pudo conectar con Drive");
          setDriveSub("");
        } else {
          setDriveState("ok");
          setDriveDetail(`Conectado · ${data.sharedDriveName || "Unidad compartida"}`);
          const used = formatBytes(data.filesUsedBytes || 0);
          const available =
            data.quota && data.quota.limit
              ? `disponible ${formatBytes(data.quota.limit - data.quota.usage)} de ${formatBytes(data.quota.limit)}`
              : `plan ${data.planLimitTb || 2} TB`;
          setDriveSub(`Usado por proyectos: ${used} · ${data.fileCount || 0} archivos · ${available}`);
        }
      } catch {
        if (!alive()) return;
        setDriveState("error");
        setDriveDetail("No se pudo consultar Drive");
        setDriveSub("");
      }

      if (!alive()) return;
      setCheckedAt(new Date().toLocaleString("es-ES"));
    } finally {
      runningRef.current = false;
      if (mountedRef.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => { void runChecks(); }, [runChecks]);

  return (
    <section className={styles.settingsCard}>
      <div className={styles.settingsHeader}>
        <div>
          <p className={styles.sectionKicker}>Diagnóstico</p>
          <h2 className={styles.sectionTitle}>Estado de servicios</h2>
        </div>
        <button type="button" className={styles.secondaryBtn} onClick={() => void runChecks()} disabled={refreshing}>
          {refreshing ? "Comprobando…" : "Recomprobar"}
        </button>
      </div>

      <p className={styles.settingsCopy}>
        Comprueba las conexiones con Firebase, el backend (Fiscal y RAG) y el correo de tickets.
        {checkedAt && ` Última comprobación: ${checkedAt}.`}
      </p>

      <StatusRow label="Firebase" state={fbState} detail={fbDetail} />
      <StatusRow label="Backend" state={backendState} detail={backendDetail} />
      {backend && (
        <div style={{ paddingLeft: 21, fontSize: "0.78rem", color: "var(--color-muted-strong)" }}>
          <div>Fiscal · salud {backend.fiscal.health.ok ? "OK" : "✗"} · estado {backend.fiscal.status.ok ? "OK" : "✗"}</div>
          <div>RAG · salud {backend.rag.health.ok ? "OK" : "✗"} · colecciones {backend.rag.collections.ok ? "OK" : "✗"}</div>
        </div>
      )}
      <StatusRow label="Correo (tickets)" state={mailState} detail={mailDetail} />
      {settings && (
        <div style={{ paddingLeft: 21, fontSize: "0.78rem", color: "var(--color-muted-strong)" }}>
          Proveedor: {settings.provider} · buzón: {settings.gmailUser || settings.supportEmail || "sin configurar"}
        </div>
      )}
      <StatusRow label="Google Drive" state={driveState} detail={driveDetail} />
      {driveSub && (
        <div style={{ paddingLeft: 21, fontSize: "0.78rem", color: "var(--color-muted-strong)" }}>
          {driveSub}
        </div>
      )}
    </section>
  );
}
