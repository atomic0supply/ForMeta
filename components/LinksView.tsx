"use client";

import { ExternalLink, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  createLink,
  deleteLink,
  subscribeToLinks,
  type Link,
  type LinkInput,
  updateLink,
} from "@/lib/links";
import styles from "@/styles/intranet-links-page.module.css";

const emptyForm: LinkInput = {
  title: "",
  url: "",
  category: "",
  description: "",
};

export function LinksView() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Link | null>(null);
  const [form, setForm] = useState<LinkInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeToLinks((data) => {
      setLinks(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (drawerOpen) setTimeout(() => titleRef.current?.focus(), 120);
  }, [drawerOpen]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, Link[]>();
    for (const link of links) {
      const cat = link.category?.trim() || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(link);
    }
    return map;
  }, [links]);

  // All categories for datalist autocomplete
  const categories = useMemo(() => Array.from(grouped.keys()), [grouped]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setConfirmDelete(false);
    setFormError("");
    setDrawerOpen(true);
  }

  function openEdit(link: Link, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditing(link);
    setForm({ title: link.title, url: link.url, category: link.category ?? "", description: link.description ?? "" });
    setConfirmDelete(false);
    setFormError("");
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditing(null);
    setConfirmDelete(false);
    setFormError("");
  }

  function handleField(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) return;

    // Normaliza la URL: añade https:// si falta el esquema y rechaza esquemas
    // que no sean http(s) (p. ej. javascript:).
    const rawUrl = form.url.trim();
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawUrl);
    const url = hasScheme ? rawUrl : `https://${rawUrl}`;
    if (!/^https?:\/\//i.test(url)) {
      setFormError("La URL debe empezar por http:// o https://");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const data: LinkInput = { ...form, url };
      if (editing) {
        await updateLink(editing.id, data);
      } else {
        await createLink(data);
      }
      closeDrawer();
    } catch (err) {
      // El fallo debe verse: sin catch el error quedaba silenciado.
      console.error("LinksView.handleSubmit:", err);
      setFormError("No se pudo guardar el link. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing || saving) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    setFormError("");
    try {
      await deleteLink(editing.id);
      closeDrawer();
    } catch (err) {
      console.error("LinksView.handleDelete:", err);
      setFormError("No se pudo eliminar el link. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className={styles.page}><p className={styles.empty}>Cargando…</p></main>;

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Accesos rápidos</p>
          <h1 className={styles.title}>Links</h1>
        </div>
        <button type="button" onClick={openNew} className={styles.btnNew}>
          <Plus width={14} height={14} strokeWidth={2} />
          Nuevo link
        </button>
      </div>

      {links.length === 0 && (
        <p className={styles.empty}>
          Aún no hay links. Añade herramientas, dashboards y recursos que usas cada día — Figma, Vercel, Google Analytics, Notion…
        </p>
      )}

      {links.length > 0 && (
        <div className={styles.categories}>
          {Array.from(grouped.entries()).map(([cat, catLinks]) => (
            <section key={cat} className={styles.categorySection}>
              <h2 className={styles.categoryTitle}>{cat}</h2>
              <div className={styles.linksGrid}>
                {catLinks.map((link) => (
                  <div key={link.id} style={{ position: "relative" }}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkCard}
                    >
                      <ExternalLink
                        width={14}
                        height={14}
                        strokeWidth={1.5}
                        style={{ flexShrink: 0, color: "var(--terracotta)" }}
                      />
                      <div className={styles.linkCardInner}>
                        <span className={styles.linkTitle}>{link.title}</span>
                        {link.description && (
                          <span className={styles.linkDesc}>{link.description}</span>
                        )}
                      </div>
                      <div className={styles.linkActions} onClick={(e) => e.preventDefault()}>
                        <button
                          type="button"
                          onClick={(e) => openEdit(link, e)}
                          className={styles.btnAction}
                        >
                          Editar
                        </button>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <div className={styles.backdrop} onClick={closeDrawer} aria-hidden="true" />
      )}
      <aside className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""}`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerLabel}>{editing ? "Editar link" : "Nuevo link"}</span>
          <button type="button" onClick={closeDrawer} className={styles.drawerClose}>
            <X width={16} height={16} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="lTitle" className={styles.label}>Nombre *</label>
            <input
              ref={titleRef}
              id="lTitle"
              name="title"
              type="text"
              value={form.title}
              onChange={handleField}
              className={styles.input}
              required
              autoComplete="off"
              placeholder="Google Analytics"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="lUrl" className={styles.label}>URL *</label>
            <input
              id="lUrl"
              name="url"
              type="text"
              value={form.url}
              onChange={handleField}
              className={styles.input}
              required
              autoComplete="off"
              placeholder="https://analytics.google.com"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="lCat" className={styles.label}>Categoría</label>
            <input
              id="lCat"
              name="category"
              type="text"
              value={form.category}
              onChange={handleField}
              className={styles.input}
              autoComplete="off"
              list="cat-list"
              placeholder="Analytics, Diseño, Dev Tools…"
            />
            <datalist id="cat-list">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div className={styles.field}>
            <label htmlFor="lDesc" className={styles.label}>Descripción</label>
            <input
              id="lDesc"
              name="description"
              type="text"
              value={form.description}
              onChange={handleField}
              className={styles.input}
              autoComplete="off"
              placeholder="Métricas de tráfico del site…"
            />
          </div>

          {formError && (
            <p style={{ color: "var(--danger)", fontSize: "0.8rem", margin: 0 }}>{formError}</p>
          )}

          <div className={styles.formActions}>
            <div>
              {editing && (
                <button type="button" onClick={() => void handleDelete()} className={styles.btnDelete} disabled={saving}>
                  {confirmDelete ? "¿Eliminar?" : "Eliminar"}
                </button>
              )}
            </div>
            <div className={styles.formActionsRight}>
              <button type="button" onClick={closeDrawer} className={styles.btnCancel}>Cancelar</button>
              <button type="submit" disabled={saving || !form.title.trim() || !form.url.trim()} className={styles.btnSave}>
                {saving ? "Guardando…" : editing ? "Guardar" : "Añadir link"}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </main>
  );
}
