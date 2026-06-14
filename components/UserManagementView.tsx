"use client";

import { useEffect, useState } from "react";

import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  setUserActive,
  subscribeToAllUsers,
  updateUserRole,
  type UserProfile,
} from "@/lib/adminUsers";
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
import styles from "@/styles/intranet-team.module.css";
import shaderStyles from "@/styles/intranet-shader.module.css";

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
          Configura el buzón de soporte, Proton Bridge, SLA y plantillas de respuesta.
          La contraseña real del Bridge no se guarda aquí: usa el secret indicado en el worker.
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
                Usuario Bridge
                <input
                  value={ticketSettingsDraft.bridgeUsername}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({ ...prev, bridgeUsername: e.target.value }))
                  }
                />
              </label>
              <label>
                IMAP host
                <input
                  value={ticketSettingsDraft.imapHost}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({ ...prev, imapHost: e.target.value }))
                  }
                />
              </label>
              <label>
                IMAP port
                <input
                  type="number"
                  value={ticketSettingsDraft.imapPort}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({ ...prev, imapPort: Number(e.target.value) }))
                  }
                />
              </label>
              <label>
                SMTP host
                <input
                  value={ticketSettingsDraft.smtpHost}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({ ...prev, smtpHost: e.target.value }))
                  }
                />
              </label>
              <label>
                SMTP port
                <input
                  type="number"
                  value={ticketSettingsDraft.smtpPort}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({ ...prev, smtpPort: Number(e.target.value) }))
                  }
                />
              </label>
              <label>
                Secret contraseña
                <input
                  value={ticketSettingsDraft.bridgePasswordSecretName}
                  onChange={(e) =>
                    setTicketSettingsDraft((prev) => ({
                      ...prev,
                      bridgePasswordSecretName: e.target.value,
                    }))
                  }
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


      {/* Apariencia — shader wallpaper selector */}
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

      {isAdmin && users.length === 0 && (
        <p className={styles.empty}>No hay usuarios registrados.</p>
      )}

      {isAdmin && users.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Usuario</th>
                <th className={styles.th}>Email</th>
                <th className={styles.th}>Rol</th>
                <th className={styles.th}>Estado</th>
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
                      <option value="team">Team</option>
                    </select>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
