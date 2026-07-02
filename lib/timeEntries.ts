import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  type Unsubscribe,
  where,
} from "firebase/firestore";

import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { logActivity } from "@/lib/activityLog";

export type TimeEntry = {
  id: string;
  projectId: string;
  projectName: string;
  startedAt: Timestamp;
  endedAt: Timestamp;
  durationSeconds: number;
  notes?: string;
  userId?: string;
  userDisplayName?: string;
};

export function subscribeToTimeEntries(
  projectId: string,
  callback: (entries: TimeEntry[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(
    collection(db, "timeEntries"),
    where("projectId", "==", projectId),
    orderBy("startedAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    const entries = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<TimeEntry, "id">),
    }));
    callback(entries);
  });
}

export function subscribeToAllTimeEntries(
  callback: (entries: TimeEntry[]) => void,
  limitDays = 90,
): Unsubscribe {
  if (!db) return () => {};
  const since = Timestamp.fromMillis(Date.now() - limitDays * 86400000);
  const q = query(
    collection(db, "timeEntries"),
    where("startedAt", ">=", since),
    orderBy("startedAt", "desc"),
    limit(2000),
  );
  return onSnapshot(q, (snap) => {
    const entries = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<TimeEntry, "id">),
    }));
    callback(entries);
  });
}

/**
 * Subscribe to all time entries for a given set of project IDs.
 * Useful for client-level aggregations (sum hours across all of a
 * client's projects). Firestore "in" supports up to 30 values, so the
 * ids are split into chunks and the snapshots are merged client-side.
 */
export function subscribeToTimeEntriesByProjectIds(
  projectIds: string[],
  callback: (entries: TimeEntry[]) => void,
): Unsubscribe {
  const database = db;
  if (!database || projectIds.length === 0) {
    callback([]);
    return () => {};
  }
  // Troceamos en lotes de ≤30 ids (límite de Firestore para "in")
  const chunks: string[][] = [];
  for (let i = 0; i < projectIds.length; i += 30) {
    chunks.push(projectIds.slice(i, i + 30));
  }
  const perChunk = new Map<number, TimeEntry[]>();
  const emit = () => {
    // Fusionar, deduplicar por id y ordenar por startedAt desc
    const byId = new Map<string, TimeEntry>();
    for (const entries of perChunk.values()) {
      for (const e of entries) byId.set(e.id, e);
    }
    const merged = Array.from(byId.values()).sort(
      (a, b) => b.startedAt.toMillis() - a.startedAt.toMillis(),
    );
    callback(merged);
  };
  const unsubs = chunks.map((chunk, idx) => {
    const q = query(
      collection(database, "timeEntries"),
      where("projectId", "in", chunk),
      orderBy("startedAt", "desc"),
    );
    return onSnapshot(q, (snap) => {
      perChunk.set(
        idx,
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TimeEntry, "id">) })),
      );
      emit();
    });
  });
  return () => {
    for (const unsub of unsubs) unsub();
  };
}

export async function deleteTimeEntry(entryId: string): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await deleteDoc(doc(db, "timeEntries", entryId));
}

export async function saveTimeEntry(
  projectId: string,
  projectName: string,
  startedAtMs: number,
  endedAtMs: number,
  notes?: string,
  userId?: string,
  userDisplayName?: string,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  const durationSeconds = Math.round((endedAtMs - startedAtMs) / 1000);
  if (durationSeconds < 5) return;
  await addDoc(collection(db, "timeEntries"), {
    projectId,
    projectName,
    startedAt: Timestamp.fromMillis(startedAtMs),
    endedAt: Timestamp.fromMillis(endedAtMs),
    durationSeconds,
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
    ...(userId ? { userId } : {}),
    ...(userDisplayName ? { userDisplayName } : {}),
  });
  const actor = auth?.currentUser;
  void logActivity({
    type: "time_saved",
    actorUid: actor?.uid ?? userId ?? "",
    actorName: actor?.displayName ?? userDisplayName ?? actor?.email ?? "Usuario",
    projectId,
    projectName,
    payload: { durationSeconds },
  });
}

export function exportTimeEntriesToCsv(entries: TimeEntry[]): void {
  const fmt = (ts: Timestamp) => new Date(ts.seconds * 1000);
  const rows: string[][] = [
    ["Proyecto", "Usuario", "Fecha", "Inicio", "Fin", "Duración (min)", "Notas"],
    ...entries.map((e) => [
      e.projectName,
      e.userDisplayName ?? "",
      fmt(e.startedAt).toLocaleDateString("es-ES"),
      fmt(e.startedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      fmt(e.endedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      Math.round(e.durationSeconds / 60).toString(),
      e.notes ?? "",
    ]),
  ];
  const csv = rows
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tiempo-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
