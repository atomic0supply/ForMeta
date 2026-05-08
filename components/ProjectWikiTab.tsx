"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  ChevronDown,
  ChevronUp,
  FileText,
  Heading2,
  Italic,
  Link2,
  List,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  type WikiPage,
  createWikiPage,
  deleteWikiPage,
  subscribeToWikiPages,
  updateWikiPage,
} from "@/lib/wiki";
import { useCurrentUser } from "@/lib/useCurrentUser";
import styles from "@/styles/intranet-wiki.module.css";

const EMOJIS = ["📄", "📝", "📌", "🔧", "🎯", "🗂️", "💡", "🔗", "⚙️", "🚀", "📊", "🔐"];

/* ─── Markdown renderer (same robust impl as IdeasView) ─────────────────── */

function renderMarkdown(md: string): string {
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  let inTable = false;

  function closeList()  { if (inList)  { out.push("</ul>");  inList  = false; } }
  function closeTable() { if (inTable) { out.push("</tbody></table>"); inTable = false; } }

  for (const raw of lines) {
    const t = raw.trim();

    if (/^\|/.test(t)) {
      if (/^\|[-:| ]+\|$/.test(t)) continue;
      closeList();
      const cells = t.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      if (!inTable) {
        out.push("<table><thead><tr>");
        cells.forEach((c) => out.push(`<th>${inline(c)}</th>`));
        out.push("</tr></thead><tbody>");
        inTable = true;
        continue;
      }
      out.push("<tr>");
      cells.forEach((c) => out.push(`<td>${inline(c)}</td>`));
      out.push("</tr>");
      continue;
    }

    closeTable();

    if (/^## (.+)/.test(t))      { closeList(); out.push(`<h2>${inline(t.slice(3))}</h2>`); }
    else if (/^### (.+)/.test(t)){ closeList(); out.push(`<h3>${inline(t.slice(4))}</h3>`); }
    else if (/^- (.+)/.test(t))  { if (!inList) { out.push("<ul>"); inList = true; } out.push(`<li>${inline(t.slice(2))}</li>`); }
    else if (t === "")            { closeList(); }
    else                          { closeList(); out.push(`<p>${inline(t)}</p>`); }
  }

  closeList();
  closeTable();
  return out.join("\n");
}

/* ─── Toolbar helper ─────────────────────────────────────────────────────── */

function insertAt(
  el: HTMLTextAreaElement,
  before: string,
  after = "",
  defaultText = "texto",
): string {
  const start = el.selectionStart;
  const end   = el.selectionEnd;
  const sel   = el.value.slice(start, end) || defaultText;
  const next  = el.value.slice(0, start) + before + sel + after + el.value.slice(end);
  setTimeout(() => {
    el.focus();
    el.setSelectionRange(start + before.length, start + before.length + sel.length);
  }, 0);
  return next;
}

/* ─── Page editor ────────────────────────────────────────────────────────── */

type EditorProps = {
  page: WikiPage;
  projectId: string;
  authorName: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
};

function WikiEditor({ page, projectId, authorName, onClose, onDeleted }: EditorProps) {
  const [title,   setTitle]   = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [emoji,   setEmoji]   = useState(page.emoji);
  const [preview, setPreview] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [dirty,   setDirty]   = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  function markDirty() { setDirty(true); }

  function handleContent(val: string) {
    setContent(val);
    markDirty();
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void autoSave(val), 2000);
  }

  async function autoSave(val: string) {
    if (!dirty) return;
    setSaving(true);
    try {
      await updateWikiPage(projectId, page.id, { title, content: val, emoji }, authorName);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateWikiPage(projectId, page.id, { title, content, emoji }, authorName);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    await deleteWikiPage(projectId, page.id);
    onDeleted(page.id);
  }

  function toolbar(before: string, after = "", defaultText = "texto") {
    if (!textareaRef.current) return;
    const next = insertAt(textareaRef.current, before, after, defaultText);
    handleContent(next);
  }

  return (
    <div className={styles.editor}>
      <div className={styles.editorHeader}>
        <div className={styles.editorTitleRow}>
          <div className={styles.emojiWrapper}>
            <button
              type="button"
              className={styles.emojiBtn}
              onClick={() => setShowEmojiPicker((v) => !v)}
              title="Cambiar emoji"
            >
              {emoji}
            </button>
            {showEmojiPicker && (
              <div className={styles.emojiPicker}>
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`${styles.emojiOption} ${e === emoji ? styles.emojiOptionSelected : ""}`}
                    onClick={() => { setEmoji(e); setShowEmojiPicker(false); markDirty(); }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            className={styles.editorTitleInput}
            value={title}
            onChange={(e) => { setTitle(e.target.value); markDirty(); }}
            placeholder="Título de la página"
          />
        </div>

        <div className={styles.editorToolbar}>
          <div className={styles.toolbarGroup}>
            <button type="button" className={styles.toolbarBtn} title="Negrita" onClick={() => toolbar("**", "**", "negrita")}>
              <Bold width={13} height={13} />
            </button>
            <button type="button" className={styles.toolbarBtn} title="Cursiva" onClick={() => toolbar("*", "*", "cursiva")}>
              <Italic width={13} height={13} />
            </button>
            <button type="button" className={styles.toolbarBtn} title="Encabezado" onClick={() => toolbar("## ", "", "Título")}>
              <Heading2 width={13} height={13} />
            </button>
            <button type="button" className={styles.toolbarBtn} title="Lista" onClick={() => toolbar("- ", "", "elemento")}>
              <List width={13} height={13} />
            </button>
            <button type="button" className={styles.toolbarBtn} title="Enlace" onClick={() => toolbar("[", "](url)", "texto")}>
              <Link2 width={13} height={13} />
            </button>
          </div>

          <div className={styles.toolbarGroup}>
            <button
              type="button"
              className={`${styles.toolbarBtn} ${!preview ? styles.toolbarBtnActive : ""}`}
              onClick={() => setPreview(false)}
            >
              Editar
            </button>
            <button
              type="button"
              className={`${styles.toolbarBtn} ${preview ? styles.toolbarBtnActive : ""}`}
              onClick={() => setPreview(true)}
            >
              Vista previa
            </button>
          </div>

          <div className={styles.toolbarGroup}>
            {dirty && (
              <button type="button" className={styles.saveBtn} onClick={() => void handleSave()} disabled={saving}>
                {saving ? <span className={styles.spinner} /> : <Save width={13} height={13} />}
                {saving ? "Guardando…" : "Guardar"}
              </button>
            )}
            {!dirty && saving === false && (
              <span className={styles.savedIndicator}>Guardado</span>
            )}
            <button
              type="button"
              className={`${styles.deleteBtn} ${confirm ? styles.deleteBtnConfirm : ""}`}
              onClick={() => void handleDelete()}
              onBlur={() => setConfirm(false)}
              title="Eliminar página"
            >
              <Trash2 width={13} height={13} />
              {confirm ? "¿Eliminar?" : ""}
            </button>
            <button type="button" className={styles.closeEditorBtn} onClick={onClose} title="Cerrar">
              <X width={15} height={15} />
            </button>
          </div>
        </div>
      </div>

      <div className={styles.editorBody}>
        {preview ? (
          <div
            className={styles.previewContent}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            className={styles.editorTextarea}
            value={content}
            onChange={(e) => handleContent(e.target.value)}
            placeholder={`Escribe el contenido en Markdown…\n\n## Título de sección\n\nTexto normal, **negrita**, *cursiva*\n\n- Elemento de lista\n- Otro elemento\n\n| Columna 1 | Columna 2 |\n|---|---|\n| Dato | Dato |`}
            spellCheck
          />
        )}
      </div>

      {page.updatedBy && (
        <div className={styles.editorFooter}>
          Última edición por <strong>{page.updatedBy}</strong>
          {page.updatedAt && (
            <> · {new Date((page.updatedAt as unknown as { seconds: number }).seconds * 1000).toLocaleString("es-ES")}</>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main tab ───────────────────────────────────────────────────────────── */

export function ProjectWikiTab({ projectId }: { projectId: string }) {
  const user = useCurrentUser();
  const authorName = user?.displayName ?? user?.email ?? "Usuario";

  const [pages,      setPages]      = useState<WikiPage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating,   setCreating]   = useState(false);
  const [newTitle,   setNewTitle]   = useState("");
  const [newEmoji,   setNewEmoji]   = useState("📄");

  useEffect(() => {
    const unsub = subscribeToWikiPages(projectId, (data) => {
      setPages(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    });
    return unsub;
  }, [projectId]);

  const selected = pages.find((p) => p.id === selectedId) ?? null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const id = await createWikiPage(projectId, {
      title: newTitle.trim(),
      content: "",
      emoji: newEmoji,
      order: pages.length,
      updatedBy: authorName,
    });
    setNewTitle("");
    setNewEmoji("📄");
    setCreating(false);
    setSelectedId(id);
  }

  async function movePage(page: WikiPage, dir: -1 | 1) {
    const idx  = pages.findIndex((p) => p.id === page.id);
    const swap = pages[idx + dir];
    if (!swap) return;
    await Promise.all([
      updateWikiPage(projectId, page.id,  { order: swap.order  }, authorName),
      updateWikiPage(projectId, swap.id,  { order: page.order  }, authorName),
    ]);
  }

  return (
    <div className={styles.wikiLayout}>

      {/* Sidebar */}
      <div className={styles.wikiSidebar}>
        <div className={styles.wikiSidebarHeader}>
          <span className={styles.wikiSidebarTitle}>Páginas</span>
          <button
            type="button"
            className={styles.newPageBtn}
            onClick={() => setCreating(true)}
            title="Nueva página"
          >
            <Plus width={14} height={14} />
          </button>
        </div>

        {creating && (
          <form className={styles.newPageForm} onSubmit={(e) => void handleCreate(e)}>
            <div className={styles.newPageRow}>
              <select
                className={styles.emojiSelect}
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
              >
                {EMOJIS.map((em) => (
                  <option key={em} value={em}>{em}</option>
                ))}
              </select>
              <input
                className={styles.newPageInput}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Nombre de la página"
                autoFocus
                required
              />
            </div>
            <div className={styles.newPageActions}>
              <button type="submit" className={styles.newPageSave}>Crear</button>
              <button
                type="button"
                className={styles.newPageCancel}
                onClick={() => { setCreating(false); setNewTitle(""); }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <ul className={styles.pageList}>
          {pages.length === 0 && !creating && (
            <li className={styles.pageListEmpty}>
              Sin páginas. Crea la primera.
            </li>
          )}
          {pages.map((page, idx) => (
            <li
              key={page.id}
              className={`${styles.pageItem} ${page.id === selectedId ? styles.pageItemActive : ""}`}
              onClick={() => setSelectedId(page.id)}
            >
              <span className={styles.pageItemEmoji}>{page.emoji}</span>
              <span className={styles.pageItemTitle}>{page.title}</span>
              <div className={styles.pageItemOrder}>
                <button
                  type="button"
                  className={styles.orderBtn}
                  onClick={(e) => { e.stopPropagation(); void movePage(page, -1); }}
                  disabled={idx === 0}
                  title="Subir"
                >
                  <ChevronUp width={11} height={11} />
                </button>
                <button
                  type="button"
                  className={styles.orderBtn}
                  onClick={(e) => { e.stopPropagation(); void movePage(page, 1); }}
                  disabled={idx === pages.length - 1}
                  title="Bajar"
                >
                  <ChevronDown width={11} height={11} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Editor / preview area */}
      <div className={styles.wikiMain}>
        {selected ? (
          <WikiEditor
            key={selected.id}
            page={selected}
            projectId={projectId}
            authorName={authorName}
            onClose={() => setSelectedId(null)}
            onDeleted={(id) => {
              const remaining = pages.filter((p) => p.id !== id);
              setSelectedId(remaining[0]?.id ?? null);
            }}
          />
        ) : (
          <div className={styles.wikiEmpty}>
            <FileText width={48} height={48} strokeWidth={1} className={styles.wikiEmptyIcon} />
            <p className={styles.wikiEmptyTitle}>Wiki del proyecto</p>
            <p className={styles.wikiEmptyText}>
              Documenta decisiones técnicas, guías de instalación, notas de reuniones o cualquier información relevante del proyecto.
            </p>
            <button
              type="button"
              className={styles.wikiEmptyBtn}
              onClick={() => setCreating(true)}
            >
              <Plus width={14} height={14} />
              Nueva página
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
