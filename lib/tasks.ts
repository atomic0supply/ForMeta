import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
  updateDoc,
} from "firebase/firestore";

import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { logActivity } from "@/lib/activityLog";

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string; // "YYYY-MM-DD" or ""
  order: number;
  assignedTo?: { uid: string; name: string } | null;
  githubIssueNumber?: number | null;
  sourceTicketId?: string | null;
  sourceTicketNumber?: string | null;
  createdAt: Timestamp | null;
};

export type TaskInput = Omit<Task, "id" | "createdAt"> & {
  assignedTo?: { uid: string; name: string } | null;
};

export function subscribeToTasks(
  projectId: string,
  callback: (tasks: Task[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(
    collection(db, "projects", projectId, "tasks"),
    orderBy("order", "asc"),
  );
  return onSnapshot(q, (snap) => {
    const tasks = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Task, "id">),
    }));
    callback(tasks);
  });
}

export async function createTask(
  projectId: string,
  data: TaskInput,
): Promise<string> {
  if (!db) throw new Error("Firebase no disponible");
  const ref = await addDoc(collection(db, "projects", projectId, "tasks"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTask(
  projectId: string,
  taskId: string,
  data: Partial<TaskInput>,
  meta?: { projectName?: string; taskTitle?: string; previousStatus?: string },
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await updateDoc(doc(db, "projects", projectId, "tasks", taskId), data);
  if (data.status && meta?.projectName && data.status !== meta.previousStatus) {
    const actor = auth?.currentUser;
    void logActivity({
      type: "task_moved",
      actorUid: actor?.uid ?? "",
      actorName: actor?.displayName ?? actor?.email ?? "Usuario",
      projectId,
      projectName: meta.projectName,
      payload: {
        taskTitle: meta.taskTitle,
        from: meta.previousStatus,
        to: data.status,
      },
    });
  }
}

export async function deleteTask(
  projectId: string,
  taskId: string,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await deleteDoc(doc(db, "projects", projectId, "tasks", taskId));
}
