import type { Metadata } from "next";
import Link from "next/link";

import { DropOrnament } from "@/components/landing/DropOrnament";
import { ImagePlaceholder } from "@/components/landing/ImagePlaceholder";
import {
  ProductEffects,
  ProductFooter,
  ProductHud,
  ProductShell,
} from "@/components/landing/ProductLayoutShell";
import styles from "@/styles/productos.module.css";

export const metadata: Metadata = {
  title: "FMTA—FIELD · Inspecciones técnicas inteligentes · ForMeta",
  description:
    "Formularios configurables, análisis automático de imágenes con IA e informes PDF listos para enviar. Para empresas de servicios en campo — sin papel, sin retrasos, sin errores.",
};

export default function FieldPage() {
  return (
    <ProductShell accent="field">
      <ProductHud code="FIELD" />

      <main id="main" tabIndex={-1}>
        {/* HERO */}
        <section className={`${styles.section} ${styles.prodHero}`}>
          <div className={styles.prodHeroInner}>
            <div className={styles.prodEyebrow}>
              <span className={styles.ridge} />
              <span>Producto 05 · IApp · field service</span>
            </div>
            <div className={styles.prodCode}>FMTA—FIELD</div>
            <h1>
              Inspecciones
              <br />
              <em>que se escriben solas.</em>
            </h1>
            <p className={styles.lead}>
              Formularios configurables, análisis automático de imágenes con IA
              e informes PDF listos para enviar. Para cualquier empresa que hace
              servicios en campo y necesita documentar lo que encuentra — sin
              papel, sin retrasos, sin errores.
            </p>
            <div className={styles.actions}>
              <a href="#solucion" className={`${styles.btn} ${styles.btnAccent} magnetic`}>
                <span>Ver cómo funciona</span>
                <span className={styles.btnArrow}>↓</span>
              </a>
              <Link href="/#contacto" className={`${styles.btn} ${styles.btnGhost} magnetic`}>
                <span>Hablar con nosotros</span>
                <span className={styles.btnArrow}>→</span>
              </Link>
            </div>
            <div className={styles.heroSpec}>
              <div className={styles.sp}><span>{"// sectores"}</span><b>mantenimiento · ITV · obra · seguros · agro</b></div>
              <div className={styles.sp}><span>{"// captura"}</span><b>foto + voz + formulario</b></div>
              <div className={styles.sp}><span>{"// salida"}</span><b className={styles.accent}>PDF firmado en minutos</b></div>
              <div className={styles.sp}><span>{"// modo"}</span><b className={styles.accent}>offline-first</b></div>
            </div>

            <div className={styles.galleryHero}>
              <ImagePlaceholder
                slot="HERO 01"
                kind="screenshot"
                caption="App técnico en campo · captura + IA detecta defectos en imagen"
                ratio="16/9"
                size="2400×1350 px · @2×"
                hint="Captura de móvil/tablet: panel superior con foto recién tomada, IA destacando 3 puntos con bounding box terra. Panel inferior con campos del formulario auto-rellenados."
              />
            </div>
          </div>
          <DropOrnament className={styles.ornament} />
        </section>

        {/* PROBLEMA */}
        <section className={`${styles.section} ${styles.darkSlab}`} id="problema">
          <div className={styles.inner}>
            <div className={styles.sectionTag}>01 · problema</div>
            <div className={styles.grid2}>
              <div>
                <h2
                  dangerouslySetInnerHTML={{
                    __html: "El parte se redacta <em>tres horas después</em>. A medias.",
                  }}
                />
              </div>
              <div className={styles.body}>
                <p>
                  El técnico llega a la instalación, mira, hace fotos con el móvil
                  personal, anota a mano dos cosas y se va al siguiente cliente.
                  Por la noche, en casa o en la oficina, intenta reconstruir lo
                  que vio. <strong>Pasa el día redactando partes</strong> en lugar
                  de hacer técnica.
                </p>
                <p>
                  Las fotos quedan en su galería, sin etiquetar. Los datos llegan
                  al sistema una semana después, si llegan. El cliente recibe el
                  informe tarde, mal maquetado y sin contexto visual. Y si pasa
                  algo legal, la trazabilidad es papel mojado.
                </p>
                <div className={styles.painList}>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>01 ·</span>
                    <span className={styles.pt}><b>Partes</b> redactados horas o días después.</span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>02 ·</span>
                    <span className={styles.pt}><b>Fotos</b> sin etiquetar, en galerías personales.</span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>03 ·</span>
                    <span className={styles.pt}><b>Informes PDF</b> maquetados a mano cada vez.</span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>04 ·</span>
                    <span className={styles.pt}><b>Trazabilidad</b> rota cuando hace falta para reclamar.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SOLUCIÓN */}
        <section className={`${styles.section} ${styles.sol}`} id="solucion">
          <div className={styles.solInner}>
            <div className={styles.sectionTag}>02 · solución</div>
            <h2
              dangerouslySetInnerHTML={{
                __html: "Hace la foto. La IA <em>la entiende</em>. El PDF sale solo.",
              }}
            />
            <div className={styles.solSteps}>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 01</div>
                <h3>Formularios configurables</h3>
                <p>
                  Tú diseñas la inspección con bloques: foto obligatoria,
                  pregunta sí/no, escala, texto libre, dictado. Cada formulario
                  versionado, con condicionales y validaciones. Sin tocar código.
                </p>
                <div className={styles.stepMeta}>builder visual · versionado · reutilizable</div>
              </div>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 02</div>
                <h3>IA sobre imagen</h3>
                <p>
                  La IA detecta defectos, mide grietas, identifica componentes,
                  lee placas, etiqueta lo que importa. El técnico solo confirma o
                  corrige. La precisión mejora con cada inspección.
                </p>
                <div className={styles.stepMeta}>vision · detección · OCR · medición</div>
              </div>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 03</div>
                <h3>Informe PDF listo</h3>
                <p>
                  Al firmar la inspección, FIELD genera el PDF con la maqueta
                  de tu empresa, fotos seleccionadas, hallazgos resaltados y
                  recomendaciones. Listo para enviar al cliente — o a tu cliente
                  final si subcontratan.
                </p>
                <div className={styles.stepMeta}>maquetado auto · firma digital · multilingüe</div>
              </div>
            </div>

            <div className={`${styles.gallery} ${styles.gallery3}`}>
              <ImagePlaceholder
                slot="UI 01"
                kind="screenshot"
                caption="Builder · diseñar inspección con bloques arrastrables"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Editor visual de formularios: paleta de bloques a la izquierda, lienzo central con la inspección montada, panel de propiedades a la derecha."
              />
              <ImagePlaceholder
                slot="UI 02"
                kind="screenshot"
                caption="App campo · captura con detección IA en tiempo real"
                ratio="9/16"
                size="1080×1920 px · @2× (vertical · mobile)"
                hint="Pantalla móvil del técnico: viewfinder de cámara con overlays IA detectando elementos, controles abajo, botón siguiente paso."
              />
              <ImagePlaceholder
                slot="UI 03"
                kind="screenshot"
                caption="Informe PDF final · plantilla cliente · listo para envío"
                ratio="3/4"
                size="1200×1600 px · @2× (vertical · A4)"
                hint="PDF informe: portada con datos cliente/inspección, página interior con fotos anotadas y hallazgos, página final con recomendaciones y firma."
              />
            </div>
          </div>
        </section>

        {/* DETALLE — capacidades */}
        <section className={`${styles.section} ${styles.detail}`} id="capacidades">
          <div className={styles.detailInner}>
            <div className={styles.sectionTag}>03 · capacidades</div>
            <h2
              dangerouslySetInnerHTML={{
                __html: "Pensado para <em>el campo real</em>. Sin cobertura, sin tiempo, sin papel.",
              }}
            />

            <div className={styles.detailBlock}>
              <div>
                <div className={styles.detailKicker}>captura · campo</div>
                <h3>
                  Funciona <em>donde no llega el wifi</em>.
                </h3>
                <p>
                  La app móvil es offline-first. El técnico captura fotos,
                  rellena campos, dicta notas en mallorquín o castellano. Todo se
                  guarda local y se sincroniza cuando vuelve la conexión. La IA
                  empieza a trabajar al subir.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Offline-first</b> · cero pérdidas en zona sin cobertura</li>
                  <li><b>Voz</b> para notas con las manos ocupadas</li>
                  <li><b>Foto + anotación</b> directa sobre la imagen</li>
                  <li><b>Geolocalización + timestamp</b> firmados</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="UI 04"
                kind="screenshot"
                caption="App campo · vista detallada de captura + anotación sobre foto"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Captura tablet: foto del defecto con anotaciones a mano alzada, panel lateral con campos del formulario auto-rellenados por IA, badge offline."
              />
            </div>

            <div className={`${styles.detailBlock} ${styles.detailFlip}`}>
              <div>
                <div className={styles.detailKicker}>análisis · IA</div>
                <h3>
                  La IA <em>ya conoce tu dominio</em>.
                </h3>
                <p>
                  Modelo entrenado con tus inspecciones pasadas. Detecta lo que
                  importa en tu sector: grietas estructurales, óxido, suciedad
                  crítica, falta de etiqueta, plagas, daños de granizo, lo que
                  sea. Aprende con cada cierre del técnico.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Detección</b> de defectos con bounding boxes</li>
                  <li><b>Medición</b> de grietas con referencia escalar</li>
                  <li><b>OCR</b> de placas, etiquetas, contadores</li>
                  <li><b>Aprende</b> con cada confirmación del técnico</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="MOCKUP 05"
                kind="mockup"
                caption="Comparativa · antes IA / después IA · misma foto inspección"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Comparativa split: izquierda foto cruda, derecha foto con detección IA (3-4 hallazgos resaltados, severidad y descripción). Diferencia clara."
              />
            </div>

            <div className={styles.detailBlock}>
              <div>
                <div className={styles.detailKicker}>salida · informe</div>
                <h3>
                  Informe maquetado <em>en tu plantilla</em>. En minutos.
                </h3>
                <p>
                  Maquetamos contigo tu plantilla — papelería, branding,
                  estructura. A partir de ahí, cada inspección produce su PDF
                  bien presentado, multilingüe si lo necesitas, con firma digital
                  y trazabilidad notarial.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Plantillas</b> personalizadas por tipo de inspección</li>
                  <li><b>Firma digital</b> con validez legal eIDAS</li>
                  <li><b>Multilingüe</b> · informe en idioma del cliente</li>
                  <li><b>Envío auto</b> por email o subida a portal del cliente</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="MOCKUP 06"
                kind="mockup"
                caption="PDF final · 3 páginas · portada, hallazgos, recomendaciones"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Tres páginas de informe en abanico: portada con identidad cliente, página de hallazgos con foto+anotación+severidad, página recomendaciones+firma."
              />
            </div>

            <div className={styles.pillRow}>
              <span className={styles.pill}>plataformas <b>iOS · Android · tablet</b></span>
              <span className={styles.pill}>offline <b>sí · sync auto</b></span>
              <span className={styles.pill}>idiomas <b>ES · CA · EN · DE</b></span>
              <span className={styles.pill}>integración <b>ERP · CRM · ServiceNow</b></span>
              <span className={styles.pill}>firma <b>eIDAS</b></span>
              <span className={styles.pill}>auditoría <b>completa</b></span>
            </div>
          </div>
        </section>

        {/* MÉTRICAS */}
        <section className={`${styles.section} ${styles.metrics}`} id="metricas">
          <div className={styles.metricsInner}>
            <div className={styles.sectionTag}>04 · métricas</div>
            <div className={styles.metricsHead}>
              <h2
                dangerouslySetInnerHTML={{
                  __html: "Lo que cambia <em>cuando el informe sale antes</em>.",
                }}
              />
              <div className={styles.meta}>
                <div>media 3 equipos campo · 18.000 inspecciones</div>
                <div><b>· 2025 — 2026</b></div>
              </div>
            </div>
            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <div className={styles.mKey}>tiempo por inspección</div>
                <div className={styles.mBig}>
                  <em data-count data-value="42" data-decimals="0" data-duration="1200">0</em>
                  <sup>% -</sup>
                </div>
                <div className={styles.mNote}>captura → PDF enviado</div>
                <div className={styles.mTrend}>↓ todo en sitio</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>defectos detectados IA</div>
                <div className={styles.mBig}>
                  <em data-count data-value="3.2" data-decimals="1" data-duration="1400">0</em>
                  <sup>× más</sup>
                </div>
                <div className={styles.mNote}>vs ojo humano apurado</div>
                <div className={styles.mTrend}>↑ menos retornos</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>informes en el día</div>
                <div className={styles.mBig}>
                  <em data-count data-value="94" data-decimals="0" data-duration="1600">0</em>
                  <sup>%</sup>
                </div>
                <div className={styles.mNote}>enviados misma jornada</div>
                <div className={styles.mTrend}>↑ vs 38% antes</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>papel eliminado</div>
                <div className={styles.mBig}>
                  <em data-count data-value="100" data-decimals="0" data-duration="1800">0</em>
                  <sup>%</sup>
                </div>
                <div className={styles.mNote}>cero papel en campo</div>
                <div className={styles.mTrend}>↓ archivo físico cerrado</div>
              </div>
            </div>
          </div>
        </section>

        {/* CASOS */}
        <section className={`${styles.section} ${styles.cases}`} id="casos">
          <div className={styles.casesInner}>
            <div className={styles.sectionTag}>05 · en producción</div>
            <h2
              dangerouslySetInnerHTML={{
                __html: "Equipos de campo que <em>no vuelven a la oficina</em> a redactar.",
              }}
            />
            <div className={styles.casesList}>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 01</div>
                <div className={styles.cWho}>Mantenimiento técnico · Mallorca</div>
                <div className={styles.cWhat}>
                  18 técnicos. Inspecciones de instalaciones eléctricas y
                  climatización. IA detecta sobrecalentamientos en
                  termografía y lee placas. Informe en cliente antes de salir.
                </div>
                <div className={styles.cOut}><b>−42% tiempo</b><br />por inspección</div>
              </div>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 02</div>
                <div className={styles.cWho}>Peritaciones de seguro · Madrid</div>
                <div className={styles.cWhat}>
                  Daños por granizo en vehículos y agro. IA cuenta y categoriza
                  abolladuras, mide caída por hectárea. Informe pericial con
                  validez para el seguro.
                </div>
                <div className={styles.cOut}><b>3.2× más</b><br />hallazgos detectados</div>
              </div>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 03</div>
                <div className={styles.cWho}>Inspección obra · Valencia</div>
                <div className={styles.cWhat}>
                  Visitas semanales en obra. Detección de incumplimientos
                  visuales (EPI, andamiaje, residuos) con foto + checklist
                  guiado. Informe a dirección facultativa el mismo día.
                </div>
                <div className={styles.cOut}><b>94% informes</b><br />enviados en el día</div>
              </div>
            </div>

            <ImagePlaceholder
              slot="HERO 02"
              kind="photo"
              caption="Técnico en campo · tablet con FIELD · inspeccion real"
              ratio="21/9"
              size="2880×1234 px · @2×"
              hint="Foto documental del técnico haciendo una inspección con tablet, sobre instalación o equipo. Plano americano, ambiente real, marca discreta."
              className={styles.galleryWide}
            />
          </div>
        </section>

        {/* CTA */}
        <section className={`${styles.section} ${styles.cta}`} id="cta">
          <div className={styles.ctaInner}>
            <div>
              <div className={styles.sectionTag}>06 · conversación</div>
              <h2
                dangerouslySetInnerHTML={{
                  __html: "¿Tus técnicos pasan <em>medio día redactando</em>?",
                }}
              />
              <p className={styles.lead}>
                Una conversación de 30 minutos. Si el equipo de campo termina
                trabajo y empieza otro turno escribiendo, probablemente
                FMTA—FIELD encaje.
              </p>
              <div className={styles.ctaActions}>
                <Link href="/#contacto" className={`${styles.btn} ${styles.btnAccent}`}>
                  <span>Hablar 30 min</span>
                  <span className={styles.btnArrow}>→</span>
                </Link>
                <Link href="/#productos" className={`${styles.btn} ${styles.btnGhost}`}>
                  <span>Ver otros productos</span>
                  <span className={styles.btnArrow}>↗</span>
                </Link>
              </div>
            </div>
            <div className={styles.ctaCard}>
              <div className={styles.row}><span>producto</span><span>FMTA—FIELD</span></div>
              <div className={styles.row}><span>despliegue</span><span>~ 6 semanas</span></div>
              <div className={styles.row}><span>plataformas</span><span>iOS · Android · tablet</span></div>
              <div className={styles.row}><span>modo</span><span>offline-first</span></div>
              <div className={styles.row}><span>firma</span><span>eIDAS · auditoría</span></div>
              <div className={styles.row}><span>desde</span><span>2025 — en producción</span></div>
            </div>
          </div>
        </section>
      </main>

      <ProductFooter code="FIELD" clients="3 equipos · 18.000 inspecciones" />
      <ProductEffects />
    </ProductShell>
  );
}
