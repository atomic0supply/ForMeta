"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";

import {
  auth,
  ensureAnalytics,
  ensureAuthPersistence,
  firebaseEnabled,
} from "@/lib/firebase";
import { BrandWordmark } from "@/components/BrandWordmark";
import { establishSession } from "@/lib/session";
import { ensureUserProfile } from "@/lib/users";
import styles from "@/styles/auth.module.css";

type LoginPanelProps = {
  redirect?: string;
};

export function LoginPanel({ redirect = "/intranet" }: LoginPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const syncCurrentSession = useCallback(async () => {
    if (!auth?.currentUser) {
      return;
    }

    try {
      // Intercambia el ID token por la session cookie firmada (HttpOnly).
      const idToken = await auth.currentUser.getIdToken();
      await establishSession(idToken);
    } catch {
      setError("No se ha podido establecer la sesión. Inténtalo de nuevo.");
      setIsPending(false);
      return;
    }
    void ensureUserProfile({
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      displayName: auth.currentUser.displayName,
    }).catch(() => {
      // The intranet should not block access if Firestore rules are still pending.
    });
    await ensureAnalytics();

    // Force a document navigation so middleware reads the freshly written cookie.
    window.location.assign(redirect);
  }, [redirect]);

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsPending(true);

    if (!firebaseEnabled || !auth) {
      setError("Configura Firebase en .env.local para activar el acceso.");
      setIsPending(false);
      return;
    }

    const firebaseAuth = auth;

    try {
      await ensureAuthPersistence();
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      await syncCurrentSession();
    } catch {
      setError("No se ha podido iniciar sesion con esas credenciales.");
      setIsPending(false);
    }
  }

  useEffect(() => {
    void ensureAnalytics();

    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        return;
      }

      void syncCurrentSession();
    });

    return unsubscribe;
  }, [syncCurrentSession]);

  return (
    <section className={styles.card}>
      <div className={styles.heading}>
        <div className={styles.brandRow}>
          <BrandWordmark small />
        </div>
        <p className={styles.kicker}>Roqueta</p>
        <h1>Acceso privado a la intranet</h1>
        <p className={styles.copy}>
          Acceso exclusivo para usuarios autorizados por administracion. El
          registro publico esta deshabilitado y la entrada se realiza solo con
          usuario y contrasena.
        </p>
      </div>

      <form className={styles.form} onSubmit={handlePasswordSignIn}>
        <label className={styles.field}>
          <span>Usuario corporativo</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="equipo@fmeta.es"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Contraseña</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <div className={styles.actions}>
          <button type="submit" disabled={isPending}>
            {isPending ? "Accediendo..." : "Entrar"}
          </button>
        </div>
      </form>

      {(message || error) && (
        <p className={error ? styles.error : styles.message}>{error ?? message}</p>
      )}

      <div className={styles.metaRow}>
        <p>Alta de cuentas gestionada internamente por el equipo administrador.</p>
        <Link href="/">Volver a la web publica de ForMeta</Link>
      </div>
    </section>
  );
}
