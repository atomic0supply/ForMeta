"use client";

import { useEffect, useRef, useState } from "react";

import { auth } from "@/lib/firebase";
import { addComment, subscribeToComments, type TaskComment } from "@/lib/taskComments";
import styles from "@/styles/intranet-comments.module.css";

type Props = {
  projectId: string;
  taskId: string;
};

function relativeTime(ts: { seconds: number } | null): string {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function TaskCommentThread({ projectId, taskId }: Props) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToComments(projectId, taskId, (c) => {
      setComments(c);
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    });
    return unsub;
  }, [projectId, taskId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !auth?.currentUser || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const user = auth.currentUser;
      const displayName = user.displayName ?? user.email ?? "Usuario";
      await addComment(projectId, taskId, trimmed, user.uid, displayName);
      // Solo se limpia el input cuando el envío se ha confirmado
      setText("");
    } catch {
      setSendError("No se ha podido enviar el comentario. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.thread}>
      <span className={styles.threadLabel}>
        Comentarios{comments.length > 0 ? ` (${comments.length})` : ""}
      </span>

      <div ref={listRef} className={styles.commentList}>
        {comments.length === 0 && (
          <p className={styles.empty}>Sin comentarios todavía.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className={styles.comment}>
            <span className={styles.commentAvatar}>{initials(c.authorDisplayName)}</span>
            <div className={styles.commentBody}>
              <div className={styles.commentMeta}>
                <span className={styles.commentAuthor}>{c.authorDisplayName}</span>
                <span className={styles.commentTime}>{relativeTime(c.createdAt)}</span>
              </div>
              <p className={styles.commentText}>{c.text}</p>
            </div>
          </div>
        ))}
      </div>

      {sendError && (
        <p role="alert" style={{ color: "#b3261e", fontSize: 12, margin: 0 }}>
          {sendError}
        </p>
      )}

      <form onSubmit={(e) => void handleSend(e)} className={styles.inputRow}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend(e as unknown as React.FormEvent);
            }
          }}
          className={styles.commentInput}
          placeholder="Escribe un comentario… (Enter para enviar)"
          rows={2}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className={styles.btnSend}
        >
          {sending ? "…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}
