"use client";

import { useState } from "react";

import { IconArrowRight, IconRefresh } from "@/components/icons";
import styles from "@/styles/landing.module.css";

/**
 * Mini formulario de contacto. Sin servidor: construye un mailto: con los
 * campos rellenos y lo abre con el cliente de email del usuario. Coherente
 * con la promesa de marca "sin formularios de 14 campos" — son 3 campos.
 */
export function ContactoForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const subject = `Conversación · ${name || "sin nombre"}`;
    const body = [
      `Nombre / empresa: ${name}`,
      `Email: ${email}`,
      "",
      "Qué no funciona:",
      message,
      "",
      "—",
      "Enviado desde formeta.es",
    ].join("\n");
    const mailto = `mailto:hola@formeta.es?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className={styles.formCard}>
        <div className={styles.formSuccess}>
          <div className={styles.formSuccessTag}>conversación · abierta</div>
          <p>
            Se ha abierto tu cliente de email con un borrador preparado. Si no se ha
            abierto, escríbenos a{" "}
            <a href="mailto:hola@formeta.es" className={styles.formInlineLink}>
              hola@formeta.es
            </a>
            .
          </p>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => setSubmitted(false)}
            data-cursor="reabrir"
          >
            <span>Empezar de nuevo</span>
            <span className={styles.btnArrow}>
              <IconRefresh size={16} />
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
      <div className={styles.formIntro}>
        <span className={styles.formTag}>formulario · 3 campos</span>
        <p>Tres campos. Una conversación de 30 min. Nada más.</p>
      </div>

      <div className={styles.formField}>
        <label htmlFor="cf-name">Cómo te llamas / empresa</label>
        <input
          id="cf-name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Antonio · Panadería Manacor"
        />
      </div>

      <div className={styles.formField}>
        <label htmlFor="cf-email">Dónde te respondemos</label>
        <input
          id="cf-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@empresa.es"
        />
      </div>

      <div className={styles.formField}>
        <label htmlFor="cf-message">Qué no funciona</label>
        <textarea
          id="cf-message"
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Una o dos frases. Lo que te quita tiempo y dónde estás bloqueado."
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={`${styles.btn} ${styles.btnTerra}`} data-cursor="enviar">
          <span>Empezar conversación</span>
          <span className={styles.btnArrow}>
            <IconArrowRight size={16} />
          </span>
        </button>
        <span className={styles.formMeta}>
          respondemos en &lt; 24h · sin formulario de seguimiento
        </span>
      </div>
    </form>
  );
}
