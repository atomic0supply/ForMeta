"use client";

import { useEffect, useState } from "react";

import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  createUser,
  deleteUser,
  setUserActive,
  subscribeToAllUsers,
  updateUser,
  updateUserRole,
  type UserProfile,
} from "@/lib/adminUsers";
import {
  createRole,
  deleteRole,
  subscribeToRoles,
  updateRole,
  type Role,
} from "@/lib/roles";
import { MODULES, type ModuleKey } from "@/lib/modules";
import type { TicketSeverity } from "@/lib/ticketAi";
import {
  DEFAULT_TICKET_SETTINGS,
  saveTicketSettings,
  subscribeToTicketSettings,
  type TicketMailSettings,
  type TicketTemplateKey,
} from "@/lib/ticketSettings";
import {
  updateCurrentUserSettings,
  type UserRole,
} from "@/lib/users";
import { ServiceStatusTab } from "@/components/ServiceStatusTab";
import styles from "@/styles/intranet-team.module.css";
import tabStyles from "@/styles/intranet-servicios.module.css";
import shaderStyles from "@/styles/intranet-shader.module.css";

type TeamTab = "usuarios" | "roles" | "tickets" | "estado" | "preferencias";

const ADMIN_TABS: { key: TeamTab; label: string }[] = [
  { key: "usuarios", label: "Usuarios" },
  { key: "roles", label: "Roles" },
  { key: "tickets", label: "Tickets" },
  { key: "estado", label: "Estado" },
  { key: "preferencias", label: "Preferencias" },
];
const MEMBER_TABS: { key: TeamTab; label: string }[] = [
  { key: "preferencias", label: "Preferencias" },
];

// Modules that can be granted via dynamic roles (Equipo stays admin-only).
const ASSIGNABLE_MODULES = MODULES.filter((m) => m.key !== "equipo");

const EMPTY_ROLE_DRAFT: { name: string; description: string; modules: ModuleKey[] } = {
  name: "",
  description: "",
  modules: [],
};

function initials(profile: UserProfile): string {
  const name = profile.displayName ?? profile.email ?? "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const TICKET_SEVERITIES: TicketSeverity[] = ["low", "medium", "high", "critical"];
const TICKET_TEMPLATE_KEYS: TicketTemplateKey[] = [
  "acknowledgement",
  "requestMoreInfo",
  "receivedIncident",
  "workaround",
  "close",
  "reopen",
];

const TICKET_SEVERITY_LABELS: Record<TicketSeverity, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

const TICKET_TEMPLATE_LABELS: Record<TicketTemplateKey, string> = {
  acknowledgement: "Acuse recibido",
  requestMoreInfo: "Pedir más información",
  receivedIncident: "Incidencia recibida",
  workaround: "Solución temporal",
  close: "Cierre",
  reopen: "Reapertura",
};

export function UserManagementView() {
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";
  const visibleTabs = isAdmin ? ADMIN_TABS : MEMBER_TABS;
  const [tab, setTab] = useState<TeamTab>("preferencias");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [ticketSettings, setTicketSettings] =
    useState<TicketMailSettings>(DEFAULT_TICKET_SETTINGS);
  const [ticketSettingsDraft, setTicketSettingsDraft] =
    useState<TicketMailSettings>(DEFAULT_TICKET_SETTINGS);
  const [savingTicketSettings, setSavingTicketSettings] = useState(false);
  const [ticketSettingsMessage, setTicketSettingsMessage] = useState<string | null>(null);
  const [wallpaper, setWallpaper] = useState<"none" | "bruma" | "flujo">(
    () => (typeof window !== "undefined"
      ? (localStorage.getItem("roqueta-wallpaper") as "none" | "bruma" | "flujo") ?? "none"
      : "none"),
  );

  // ── Roles dinámicos ─────────────────────────────────────────────────────
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleDraft, setRoleDraft] = useState(EMPTY_ROLE_DRAFT);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  // ── Alta de usuarios ────────────────────────────────────────────────────
  const [newUser, setNewUser] = useState({
    email: "",
    displayName: "",
    password: "",
    role: "team" as UserRole,
    roleId: "" as string,
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserMessage, setCreateUserMessage] = useState<string | null>(null);

  useEffect(() => {
    // Land admins on Usuarios, members on Preferencias when role resolves.
    setTab(isAdmin ? "usuarios" : "preferencias");
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setRoles([]);
      return;
    }
    return subscribeToRoles(setRoles);
  }, [isAdmin]);

  function toggleRoleModule(key: ModuleKey) {
    setRoleDraft((prev) => ({
      ...prev,
      modules: prev.modules.includes(key)
        ? prev.modules.filter((m) => m !== key)
        : [...prev.modules, key],
    }));
  }

  function startEditRole(role: Role) {
    setEditingRoleId(role.id);
    setRoleDraft({ name: role.name, description: role.description, modules: role.modules });
    setRoleMessage(null);
  }

  function resetRoleDraft() {
    setEditingRoleId(null);
    setRoleDraft(EMPTY_ROLE_DRAFT);
  }

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleDraft.name.trim()) {
      setRoleMessage("El rol necesita un nombre.");
      return;
    }
    setSavingRole(true);
    setRoleMessage(null);
    try {
      if (editingRoleId) {
        await updateRole(editingRoleId, {
          name: roleDraft.name.trim(),
          description: roleDraft.description.trim(),
          modules: roleDraft.modules,
        });
        setRoleMessage("Rol actualizado.");
      } else {
        await createRole({
          name: roleDraft.name.trim(),
          description: roleDraft.description.trim(),
          modules: roleDraft.modules,
          isSystem: false,
        });
        setRoleMessage("Rol creado.");
      }
      resetRoleDraft();
    } catch (err) {
      setRoleMessage(err instanceof Error ? err.message : "No se pudo guardar el rol.");
    } finally {
      setSavingRole(false);
    }
  }

  async function handleDeleteRole(roleId: string) {
    if (!window.confirm("¿Eliminar este rol? Los usuarios que lo tengan quedarán sin módulos.")) {
      return;
    }
    try {
      await deleteRole(roleId);
      if (editingRoleId === roleId) resetRoleDraft();
    } catch (err) {
      setRoleMessage(err instanceof Error ? err.message : "No se pudo eliminar el rol.");
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreatingUser(true);
    setCreateUserMessage(null);
    try {
      await createUser({
        email: newUser.email.trim(),
        password: newUser.password,
        displayName: newUser.displayName.trim() || undefined,
        role: newUser.role,
        roleId: newUser.role === "team" ? newUser.roleId || null : null,
      });
      setCreateUserMessage(`Usuario ${newUser.email.trim()} creado.`);
      setNewUser({ email: "", displayName: "", password: "", role: "team", roleId: "" });
    } catch (err) {
      setCreateUserMessage(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleUserRoleId(uid: string, roleId: string) {
    await updateUser(uid, { roleId: roleId || null });
  }

  async function handleDeleteUser(uid: string, label: string) {
    if (!window.confirm(`¿Eliminar al usuario ${label}? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await deleteUser(uid);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "No se pudo eliminar el usuario.");
    }
  }

  function handleWallpaper(v: "none" | "bruma" | "flujo") {
    setWallpaper(v);
    if (typeof window !== "undefined") {
      localStorage.setItem("roqueta-wallpaper", v);
      window.dispatchEvent(new CustomEvent("wallpaper-change", { detail: v }));
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      setUsers([]);
      return;
    }

    const unsub = subscribeToAllUsers(setUsers);
    return unsub;
  }, [isAdmin]);

  useEffect(() => {
    setGeminiApiKey(currentUser?.geminiApiKey ?? "");
  }, [currentUser?.geminiApiKey]);

  useEffect(() => {
    if (!currentUser) {
      setTicketSettings(DEFAULT_TICKET_SETTINGS);
      setTicketSettingsDraft(DEFAULT_TICKET_SETTINGS);
      return;
    }

    return subscribeToTicketSettings((settings) => {
      setTicketSettings(settings);
      setTicketSettingsDraft(settings);
    });
  }, [currentUser]);

  async function handleRoleChange(uid: string, role: UserRole) {
    await updateUserRole(uid, role);
  }

  async function handleToggleActive(uid: string, current: boolean) {
    await setUserActive(uid, !current);
  }

  async function handleSaveApiKey(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      return;
    }

    setSavingKey(true);
    setSaveMessage(null);

    try {
      await updateCurrentUserSettings(currentUser.uid, {
        geminiApiKey: geminiApiKey.trim(),
      });
      setSaveMessage(
        geminiApiKey.trim()
          ? "Clave Gemini guardada en tu perfil."
          : "Clave Gemini eliminada de tu perfil.",
      );
    } catch {
      setSaveMessage("No se ha podido guardar la clave Gemini.");
    } finally {
      setSavingKey(false);
    }
  }

  async function handleSaveTicketSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    setSavingTicketSettings(true);
    setTicketSettingsMessage(null);

    try {
      await saveTicketSettings(ticketSettingsDraft);
      setTicketSettingsMessage("Configuración de tickets guardada.");
    } catch {
      setTicketSettingsMessage("No se ha podido guardar la configuración de tickets.");
    } finally {
      setSavingTicketSettings(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Administración</p>
          <h1 className={styles.title}>Equipo</h1>
        </div>
      </div>

      <div className={tabStyles.tabs}>
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`${tabStyles.tab} ${tab === t.key ? tabStyles.tabActive : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "preferencias" && (
      <section className={styles.settingsCard}>
        <div className={styles.settingsHeader}>
          <div>
            <p className={styles.sectionKicker}>Perfil IA</p>
            <h2 className={styles.sectionTitle}>Tu clave Gemini</h2>
          </div>
          <span className={styles.settingsStatus}>
            {currentUser?.geminiApiKey ? "Configurada" : "Sin configurar"}
          </span>
        </div>

        <p className={styles.settingsCopy}>
          Guarda aquí tu clave personal para que las funciones de IA sigan
          funcionando después de cada redeploy. La app usará esta clave para tus
          peticiones si no existe una clave global en el servidor.
        </p>

        <form onSubmit={(e) => void handleSaveApiKey(e)} className={styles.settingsForm}>
          <label htmlFor="geminiApiKey" className={styles.fieldLabel}>
            Gemini API Key
          </label>
          <input
            id="geminiApiKey"
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            className={styles.apiKeyInput}
            placeholder="AIza..."
            autoComplete="off"
            spellCheck={false}
          />
          <div className={styles.settingsActions}>
            <button
              type="button"
              onClick={() => setGeminiApiKey("")}
              className={styles.secondaryBtn}
              disabled={savingKey || geminiApiKey.length === 0}
            >
              Limpiar
            </button>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={savingKey || !currentUser}
            >
              {savingKey ? "Guardando…" : "Guardar clave"}
            </button>
          </div>
          {saveMessage && <p className={styles.saveMessage}>{saveMessage}</p>}
        </form>
      </section>
      )}

      {isAdmin && tab === "tickets" && (
      <section className={styles.settingsCard}>
        <div className={styles.settingsHeader}>
          <div>
            <p className={styles.sectionKicker}>Operativa</p>
            <h2 className={styles.sectionTitle}>Sistema de tickets</h2>
          </div>
          <span className={styles.settingsStatus}>
            {ticketSettings.supportEmail || "Sin email"}
          </span>
        </div>

        <p className={styles.settingsCopy}>
          Configura el buzón de soporte (Gmail Workspace), SLA y plantillas de respuesta.
          El worker accede al buzón mediante la cuenta de servicio (domain-wide delegation),
          no se guardan contraseñas aquí.
        </p>

        <form onSubmit={(e) => void handleSaveTicketSettings(e)} className={styles.settingsForm}>
          <fieldset className={styles.settingsFieldset} disabled={!currentUser || savingTicketSettings}>
            <div className={styles.ticketConfigGrid}>
              <label>
                Email soporte
                <input
                  value={ticketSettingsDraft.supportEmail}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({ ...prev, supportEmail: e.target.value }))
                  }
                />
              </label>
              <label>
                Remitente
                <input
                  value={ticketSettingsDraft.fromName}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({ ...prev, fromName: e.target.value }))
                  }
                />
              </label>
              <label>
                URL tickets
                <input
                  value={ticketSettingsDraft.publicBaseUrl}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({ ...prev, publicBaseUrl: e.target.value }))
                  }
                />
              </label>
              <label>
                Buzón Gmail (Workspace)
                <input
                  value={ticketSettingsDraft.gmailUser}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({ ...prev, gmailUser: e.target.value }))
                  }
                  placeholder="formeta@formeta.es"
                />
              </label>
              <label>
                Alias de soporte (crea tickets)
                <input
                  value={ticketSettingsDraft.supportAlias}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({ ...prev, supportAlias: e.target.value }))
                  }
                  placeholder="support@formeta.es"
                />
              </label>
              <label>
                Remitente notificaciones (alias)
                <input
                  value={ticketSettingsDraft.clientFromEmail}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({ ...prev, clientFromEmail: e.target.value }))
                  }
                  placeholder="info@formeta.es"
                />
              </label>
              <label>
                Nombre remitente notificaciones
                <input
                  value={ticketSettingsDraft.clientFromName}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({ ...prev, clientFromName: e.target.value }))
                  }
                  placeholder="Formeta"
                />
              </label>
              <label>
                Poll segundos
                <input
                  type="number"
                  value={ticketSettingsDraft.pollSeconds}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({ ...prev, pollSeconds: Number(e.target.value) }))
                  }
                />
              </label>
              <label>
                Adjuntos MB
                <input
                  type="number"
                  value={ticketSettingsDraft.maxAttachmentMb}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({
                      ...prev,
                      maxAttachmentMb: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Reapertura días
                <input
                  type="number"
                  value={ticketSettingsDraft.reopenWindowDays}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({
                      ...prev,
                      reopenWindowDays: Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>

            <div className={styles.ticketSettingsBlock}>
              <p className={styles.fieldLabel}>SLA por severidad</p>
              <div className={styles.ticketSlaGrid}>
                {TICKET_SEVERITIES.map((severity) => (
                  <div key={severity} className={styles.ticketSlaItem}>
                    <strong>{TICKET_SEVERITY_LABELS[severity]}</strong>
                    <label>
                      Primera respuesta
                      <input
                        type="number"
                        value={ticketSettingsDraft.sla[severity].firstResponseHours}
                        onChange={(e) =>
                          setTicketSettingsDraft((prev) => ({
                            ...prev,
                            sla: {
                              ...prev.sla,
                              [severity]: {
                                ...prev.sla[severity],
                                firstResponseHours: Number(e.target.value),
                              },
                            },
                          }))
                        }
                      />
                    </label>
                    <label>
                      Resolución
                      <input
                        type="number"
                        value={ticketSettingsDraft.sla[severity].resolutionHours}
                        onChange={(e) =>
                          setTicketSettingsDraft((prev) => ({
                            ...prev,
                            sla: {
                              ...prev.sla,
                              [severity]: {
                                ...prev.sla[severity],
                                resolutionHours: Number(e.target.value),
                              },
                            },
                          }))
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.ticketSettingsBlock}>
              <p className={styles.fieldLabel}>Plantillas</p>
              <div className={styles.ticketTemplateGrid}>
                {TICKET_TEMPLATE_KEYS.map((key) => (
                  <label key={key}>
                    {TICKET_TEMPLATE_LABELS[key]}
                    <textarea
                      rows={5}
                      value={ticketSettingsDraft.templates[key]}
                      onChange={(e) =>
                        setTicketSettingsDraft((prev) => ({
                          ...prev,
                          templates: {
                            ...prev.templates,
                            [key]: e.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          </fieldset>

          <div className={styles.settingsActions}>
            <button
              type="button"
              onClick={() => setTicketSettingsDraft(ticketSettings)}
              className={styles.secondaryBtn}
              disabled={!currentUser || savingTicketSettings}
            >
              Restaurar
            </button>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={!currentUser || savingTicketSettings}
            >
              {savingTicketSettings ? "Guardando…" : "Guardar ticketing"}
            </button>
          </div>
          {ticketSettingsMessage && (
            <p className={styles.saveMessage}>{ticketSettingsMessage}</p>
          )}
        </form>
      </section>
      )}

      {/* Apariencia — shader wallpaper selector */}
      {tab === "preferencias" && (
      <section className={styles.settingsCard}>
        <div className={styles.settingsHeader}>
          <div>
            <p className={styles.sectionKicker}>Personalización</p>
            <h2 className={styles.sectionTitle}>Apariencia</h2>
          </div>
        </div>
        <p className={styles.settingsCopy}>
          Elige el fondo animado del espacio de trabajo. El efecto es sutil y no afecta la legibilidad.
          La preferencia se guarda en este navegador.
        </p>
        <div className={shaderStyles.appearanceGrid}>
          {(["none", "bruma", "flujo"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              className={shaderStyles.appearanceOption}
              onClick={() => handleWallpaper(opt)}
              aria-pressed={wallpaper === opt}
            >
              <div className={`${shaderStyles.appearanceThumb} ${
                opt === "none"  ? shaderStyles.thumbNone  :
                opt === "bruma" ? shaderStyles.thumbBruma : shaderStyles.thumbFlujo
              } ${wallpaper === opt ? shaderStyles.appearanceThumbSelected : ""}`} />
              <span className={shaderStyles.appearanceLabel}>
                {opt === "none" ? "Ninguno" : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </span>
            </button>
          ))}
        </div>
      </section>
      )}

      {tab === "preferencias" && (
      <section className={styles.settingsCard}>
        <div className={styles.settingsHeader}>
          <div>
            <p className={styles.sectionKicker}>Recursos</p>
            <h2 className={styles.sectionTitle}>Sistema de diseño</h2>
          </div>
        </div>
        <p className={styles.settingsCopy}>
          Guía de marca, tipografía, colores, componentes y demás elementos del design system de FMETA.
        </p>
        <div className={styles.settingsActions}>
          <a
            href="/api/design/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.secondaryBtn}
          >
            Abrir sistema de diseño
          </a>
        </div>
      </section>
      )}

      {/* Roles dinámicos */}
      {isAdmin && tab === "roles" && (
        <section className={styles.settingsCard}>
          <div className={styles.settingsHeader}>
            <div>
              <p className={styles.sectionKicker}>Permisos</p>
              <h2 className={styles.sectionTitle}>Roles y acceso a módulos</h2>
            </div>
            <span className={styles.settingsStatus}>{roles.length} roles</span>
          </div>
          <p className={styles.settingsCopy}>
            Define roles con los módulos a los que dan acceso. Los administradores ven
            todos los módulos; el resto de usuarios solo los de su rol. El módulo Equipo
            es siempre exclusivo de administradores.
          </p>

          {roles.length > 0 && (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Rol</th>
                    <th className={styles.th}>Módulos</th>
                    <th className={styles.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => (
                    <tr key={r.id} className={styles.tr}>
                      <td className={styles.td}>
                        <span className={styles.userName}>{r.name}</span>
                        {r.description && <p className={styles.email}>{r.description}</p>}
                      </td>
                      <td className={styles.td}>
                        <span className={styles.email}>
                          {r.modules.length > 0
                            ? r.modules
                                .map((m) => MODULES.find((x) => x.key === m)?.label ?? m)
                                .join(", ")
                            : "Sin módulos"}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" className={styles.secondaryBtn} onClick={() => startEditRole(r)}>
                            Editar
                          </button>
                          <button type="button" className={styles.secondaryBtn} onClick={() => void handleDeleteRole(r.id)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form onSubmit={(e) => void handleSaveRole(e)} className={styles.settingsForm}>
            <p className={styles.fieldLabel}>{editingRoleId ? "Editar rol" : "Nuevo rol"}</p>
            <div className={styles.ticketConfigGrid}>
              <label>
                Nombre
                <input
                  value={roleDraft.name}
                  onChange={(e) => setRoleDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder="p. ej. Gestor"
                />
              </label>
              <label>
                Descripción
                <input
                  value={roleDraft.description}
                  onChange={(e) => setRoleDraft((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Opcional"
                />
              </label>
            </div>
            <div className={styles.ticketSettingsBlock}>
              <p className={styles.fieldLabel}>Módulos permitidos</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px" }}>
                {ASSIGNABLE_MODULES.map((m) => (
                  <label key={m.key} style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: "row" }}>
                    <input
                      type="checkbox"
                      checked={roleDraft.modules.includes(m.key)}
                      onChange={() => toggleRoleModule(m.key)}
                      style={{ width: "auto" }}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.settingsActions}>
              {editingRoleId && (
                <button type="button" className={styles.secondaryBtn} onClick={resetRoleDraft} disabled={savingRole}>
                  Cancelar
                </button>
              )}
              <button type="submit" className={styles.primaryBtn} disabled={savingRole}>
                {savingRole ? "Guardando…" : editingRoleId ? "Guardar rol" : "Crear rol"}
              </button>
            </div>
            {roleMessage && <p className={styles.saveMessage}>{roleMessage}</p>}
          </form>
        </section>
      )}

      {/* Alta de usuarios */}
      {isAdmin && tab === "usuarios" && (
        <section className={styles.settingsCard}>
          <div className={styles.settingsHeader}>
            <div>
              <p className={styles.sectionKicker}>Administración</p>
              <h2 className={styles.sectionTitle}>Crear usuario</h2>
            </div>
          </div>
          <p className={styles.settingsCopy}>
            Crea la cuenta en Firebase Authentication y su perfil. Comunica la contraseña
            al usuario para que la cambie en su primer acceso.
          </p>
          <form onSubmit={(e) => void handleCreateUser(e)} className={styles.settingsForm}>
            <fieldset className={styles.settingsFieldset} disabled={creatingUser}>
              <div className={styles.ticketConfigGrid}>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Nombre
                  <input
                    value={newUser.displayName}
                    onChange={(e) => setNewUser((p) => ({ ...p, displayName: e.target.value }))}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Contraseña
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={newUser.password}
                    onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                    autoComplete="off"
                    placeholder="mín. 6 caracteres"
                  />
                </label>
                <label>
                  Rol
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as UserRole }))}
                  >
                    <option value="team">Usuario (rol)</option>
                    <option value="admin">Administrador</option>
                  </select>
                </label>
                {newUser.role === "team" && (
                  <label>
                    Rol asignado
                    <select
                      value={newUser.roleId}
                      onChange={(e) => setNewUser((p) => ({ ...p, roleId: e.target.value }))}
                    >
                      <option value="">Sin rol (sin módulos)</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </fieldset>
            <div className={styles.settingsActions}>
              <button type="submit" className={styles.primaryBtn} disabled={creatingUser}>
                {creatingUser ? "Creando…" : "Crear usuario"}
              </button>
            </div>
            {createUserMessage && <p className={styles.saveMessage}>{createUserMessage}</p>}
          </form>
        </section>
      )}

      {isAdmin && tab === "usuarios" && users.length === 0 && (
        <p className={styles.empty}>No hay usuarios registrados.</p>
      )}

      {isAdmin && tab === "usuarios" && users.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Usuario</th>
                <th className={styles.th}>Email</th>
                <th className={styles.th}>Rol</th>
                <th className={styles.th}>Acceso</th>
                <th className={styles.th}>Estado</th>
                <th className={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className={`${styles.tr} ${!u.active ? styles.trInactive : ""}`}>
                  <td className={styles.td}>
                    <div className={styles.userCell}>
                      <span className={styles.avatar}>{initials(u)}</span>
                      <span className={styles.userName}>
                        {u.displayName ?? u.email ?? u.uid}
                      </span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.email}>{u.email}</span>
                  </td>
                  <td className={styles.td}>
                    <select
                      className={styles.roleSelect}
                      value={u.role}
                      onChange={(e) => void handleRoleChange(u.uid, e.target.value as UserRole)}
                    >
                      <option value="admin">Admin</option>
                      <option value="team">Usuario</option>
                    </select>
                  </td>
                  <td className={styles.td}>
                    {u.role === "admin" ? (
                      <span className={styles.email}>Todos los módulos</span>
                    ) : (
                      <select
                        className={styles.roleSelect}
                        value={u.roleId ?? ""}
                        onChange={(e) => void handleUserRoleId(u.uid, e.target.value)}
                      >
                        <option value="">Sin rol</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className={styles.td}>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${u.active ? styles.toggleActive : styles.toggleInactive}`}
                      onClick={() => void handleToggleActive(u.uid, u.active)}
                    >
                      {u.active ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className={styles.td}>
                    {u.uid !== currentUser?.uid && (
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => void handleDeleteUser(u.uid, u.displayName ?? u.email ?? u.uid)}
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && tab === "estado" && <ServiceStatusTab />}
    </main>
  );
}
