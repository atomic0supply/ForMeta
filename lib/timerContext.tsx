"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { auth } from "@/lib/firebase";
import { saveTimeEntry } from "@/lib/timeEntries";

const STORAGE_KEY = "roqueta_timer";

type ActiveTimer = {
  projectId: string;
  projectName: string;
  startedAt: number;
  pausedAt: number | null;
};

type TimerContextValue = {
  activeTimer: ActiveTimer | null;
  elapsed: number;
  isPaused: boolean;
  pendingStop: boolean;
  start: (projectId?: string, projectName?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  confirmStop: (notes: string, projectId: string, projectName: string) => Promise<void>;
  discardTimer: () => void;
  cancelStop: () => void;
};

const TimerContext = createContext<TimerContextValue>({
  activeTimer: null,
  elapsed: 0,
  isPaused: false,
  pendingStop: false,
  start: () => {},
  pause: () => {},
  resume: () => {},
  stop: () => {},
  confirmStop: async () => {},
  discardTimer: () => {},
  cancelStop: () => {},
});

export function useTimer() {
  return useContext(TimerContext);
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [pendingStop, setPendingStop] = useState(false);
  const pendingTimerRef = useRef<ActiveTimer | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ActiveTimer>;
        if (parsed.projectId !== undefined && parsed.startedAt) {
          setActiveTimer({
            projectId: parsed.projectId,
            projectName: parsed.projectName ?? "Sin asignar",
            startedAt: parsed.startedAt,
            pausedAt: parsed.pausedAt ?? null,
          });
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0);
      return;
    }
    // If paused, freeze elapsed to the pause moment
    if (activeTimer.pausedAt) {
      setElapsed(Math.floor((activeTimer.pausedAt - activeTimer.startedAt) / 1000));
      return;
    }
    setElapsed(Math.floor((Date.now() - activeTimer.startedAt) / 1000));
    // Intervalo local al efecto: cada ejecución limpia el suyo propio
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeTimer.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [activeTimer]);

  const start = useCallback((projectId = "", projectName = "Sin asignar") => {
    const timer: ActiveTimer = { projectId, projectName, startedAt: Date.now(), pausedAt: null };
    setActiveTimer(timer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
  }, []);

  const pause = useCallback(() => {
    setActiveTimer((cur) => {
      if (!cur || cur.pausedAt) return cur;
      const next = { ...cur, pausedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resume = useCallback(() => {
    setActiveTimer((cur) => {
      if (!cur || !cur.pausedAt) return cur;
      // Shift startedAt forward by the paused duration so elapsed continues from the freeze
      const pausedFor = Date.now() - cur.pausedAt;
      const next: ActiveTimer = {
        ...cur,
        startedAt: cur.startedAt + pausedFor,
        pausedAt: null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    if (!activeTimer) return;
    // If paused, resume the timestamps to a frozen state but still allow save (use pausedAt as effective endedAt)
    pendingTimerRef.current = { ...activeTimer };
    setPendingStop(true);
  }, [activeTimer]);

  const confirmStop = useCallback(async (notes: string, projectId: string, projectName: string) => {
    const snapshot = pendingTimerRef.current;
    if (!snapshot) return;
    // If the timer was paused, use the pausedAt as the effective end time so paused minutes are not counted
    const endedAt = snapshot.pausedAt ?? Date.now();
    const userId = auth?.currentUser?.uid;
    const userDisplayName = auth?.currentUser?.displayName ?? auth?.currentUser?.email ?? undefined;
    // Guardar primero: si falla, el timer se mantiene y el error llega al modal
    await saveTimeEntry(projectId, projectName, snapshot.startedAt, endedAt, notes, userId, userDisplayName);
    setPendingStop(false);
    pendingTimerRef.current = null;
    setActiveTimer(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const discardTimer = useCallback(() => {
    // Descarta la sesión sin guardar ninguna entrada
    pendingTimerRef.current = null;
    setPendingStop(false);
    setActiveTimer(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const cancelStop = useCallback(() => {
    pendingTimerRef.current = null;
    setPendingStop(false);
  }, []);

  const isPaused = activeTimer?.pausedAt != null;

  return (
    <TimerContext.Provider
      value={{ activeTimer, elapsed, isPaused, pendingStop, start, pause, resume, stop, confirmStop, discardTimer, cancelStop }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}
