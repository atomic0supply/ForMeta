import type { Metadata } from "next";
import Link from "next/link";

import { IconArrowUpRight, IconCheck } from "@/components/icons";
import { AmbientBackdrop } from "@/components/landing/AmbientBackdrop";
import { ContactoForm } from "@/components/landing/ContactoForm";
import { CustomCursor } from "@/components/landing/CustomCursor";
import { FluidBackdrop } from "@/components/landing/FluidBackdrop";
import { Footer } from "@/components/landing/Footer";
import { HudChrome } from "@/components/landing/HudChrome";
import { MallorcaMap } from "@/components/landing/MallorcaMap";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { SkipLink } from "@/components/landing/SkipLink";
import styles from "@/styles/landing.module.css";

export const metadata: Metadata = {
  title: "Contacto · ForMeta",
  description:
    "30 minutos. Una conversación. Si encaja, encaja. Si no, también es información útil. Estudio en Mallorca · respondemos en menos de 24h.",
};

export default function ContactoPage() {
  return (
    <div className={styles.root}>
      <SkipLink />
      <FluidBackdrop />
      <AmbientBackdrop />
      <ScrollProgress />
      <HudChrome />

      <main id="main" tabIndex={-1} className={styles.contactoPage}>
        {/* HERO */}
        <section className={styles.contactoPageHero}>
          <div className={styles.contactoEyebrow}>
            <span className={styles.contactoEyebrowLine} />
            <span>{"// conversación · 08"}</span>
          </div>
          <h1
            className={styles.contactoH1}
            dangerouslySetInnerHTML={{
              __html: "Hablemos de lo que <em>no funciona</em>.",
            }}
          />
          <p className={styles.contactoPageLead}>
            Sin formularios de 14 campos. Una conversación de 30 minutos. Si encaja,
            encaja. Si no, también es información útil.
          </p>
          <div className={styles.contactoPageMeta}>
            <span><b>·</b> Respondemos en &lt; 24h</span>
            <span><b>·</b> Visita al estudio · café incluido</span>
            <span><b>·</b> Cliente nº 11 · plaza disponible Q3 2026</span>
          </div>
        </section>

        {/* GRID: form + sidebar */}
        <section className={styles.contactoPageGrid}>
          {/* Columna izquierda: form + garantías */}
          <div className={styles.contactoFormCol}>
            <ContactoForm />

            <div className={styles.contactoGarantia}>
              <div className={styles.contactoGarantiaTag}>{"// garantía"}</div>
              <h2 className={styles.contactoGarantiaTitle}>
                Sin <em>compromiso</em>. Sin script comercial.
              </h2>
              <ul className={styles.contactoGarantiaList}>
                <li>
                  <span className={styles.gCheck}><IconCheck size={14} /></span>
                  <span><b>30 minutos</b> · sin obligación de seguir</span>
                </li>
                <li>
                  <span className={styles.gCheck}><IconCheck size={14} /></span>
                  <span>Te decimos <b>si encaja</b> antes de empezar nada</span>
                </li>
                <li>
                  <span className={styles.gCheck}><IconCheck size={14} /></span>
                  <span>Si no encaja, te <b>recomendamos a quien sí</b></span>
                </li>
                <li>
                  <span className={styles.gCheck}><IconCheck size={14} /></span>
                  <span>Conversación en <b>español, mallorquí o inglés</b></span>
                </li>
                <li>
                  <span className={styles.gCheck}><IconCheck size={14} /></span>
                  <span>Por <b>email, llamada o presencial</b> — tú eliges</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Columna derecha: tarjeta de contacto + mapa Mallorca + cómo llegar */}
          <aside className={styles.contactoSidebar}>
            <div className={styles.contactoSidebarCard}>
              <div className={styles.csTag}>{"// canales directos"}</div>
              <div className={styles.csRow}>
                <span>email</span>
                <a
                  href="mailto:hola@formeta.es"
                  className={styles.csLink}
                  data-cursor="escribir"
                >
                  hola@formeta.es
                </a>
              </div>
              <div className={styles.csRow}>
                <span>signal</span>
                <span>+34 6 · solicitar</span>
              </div>
              <div className={styles.csRow}>
                <span>github</span>
                <a
                  href="https://github.com/atomic0supply"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.csLink}
                  data-cursor="abrir"
                >
                  @atomic0supply
                  <IconArrowUpRight size={11} />
                </a>
              </div>
              <div className={styles.csRow}>
                <span>v</span>
                <span>1.0 · 2026.05.29</span>
              </div>
            </div>

            {/* Mapa Mallorca con efecto halftone marca */}
            <div className={styles.contactoMapCard}>
              <div className={styles.cmHeader}>
                <span className={styles.cmTag}>{"// estudio"}</span>
                <span className={styles.cmHeaderRight}>Mallorca</span>
              </div>
              <MallorcaMap />
              <div className={styles.cmFooter}>
                <div className={styles.cmFooterRow}>
                  <span className={styles.cmFooterKey}>{"// aeropuerto"}</span>
                  <span>PMI · 12 km del estudio</span>
                </div>
                <div className={styles.cmFooterRow}>
                  <span className={styles.cmFooterKey}>{"// horario"}</span>
                  <span>L-J · 09:30 — 18:00</span>
                </div>
                <div className={styles.cmFooterRow}>
                  <span className={styles.cmFooterKey}>{"// visita"}</span>
                  <span>previa cita · café incluido</span>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* Cierre: CTA secundario */}
        <section className={styles.contactoOutro}>
          <div className={styles.contactoOutroLine} />
          <div className={styles.contactoOutroText}>
            <p>
              ¿Aún no estás listo para hablar?
            </p>
            <div className={styles.contactoOutroActions}>
              <Link
                href="/#productos"
                className={`${styles.btn} ${styles.btnOutline}`}
                data-cursor="explorar"
              >
                <span>Ver los productos</span>
                <span className={styles.btnArrow}>→</span>
              </Link>
              <Link
                href="/#manifiesto"
                className={`${styles.btn} ${styles.btnGhost}`}
                data-cursor="leer"
              >
                <span>Leer el manifiesto</span>
                <span className={styles.btnArrow}>↓</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <CustomCursor />
    </div>
  );
}
