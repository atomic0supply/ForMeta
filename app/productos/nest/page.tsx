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
  title: "FMTA—NEST · Gestor ↔ Propietario sin fricción · ForMeta",
  description:
    "Plataforma que conecta al gestor con sus propietarios. CMS ligero, portal privado por propietario, liquidaciones automáticas y contratos digitales.",
};

export default function NestPage() {
  return (
    <ProductShell>
      <ProductHud code="NEST" />

      <main id="main" tabIndex={-1}>
        {/* HERO */}
        <section className={`${styles.section} ${styles.prodHero}`}>
          <div className={styles.prodHeroInner}>
            <div className={styles.prodEyebrow}>
              <span className={styles.ridge} />
              <span>Producto 04 · IApp · gestores + propietarios</span>
            </div>
            <div className={styles.prodCode}>FMTA—NEST</div>
            <h1>
              Gestor y propietario,
              <br />
              <em>al fin alineados.</em>
            </h1>
            <p className={styles.lead}>
              La plataforma que conecta al gestor con sus propietarios. CMS
              ligero, portal privado por propietario, liquidaciones automáticas y
              contratos digitales. Para alquiler vacacional e inmobiliarias que
              quieren transparencia sin fricción.
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
              <div className={styles.sp}><span>{"// para"}</span><b>gestores · inmobiliarias · property managers</b></div>
              <div className={styles.sp}><span>{"// propietarios"}</span><b>portal privado · cero llamadas</b></div>
              <div className={styles.sp}><span>{"// liquidaciones"}</span><b className={styles.accent}>automáticas con PDF</b></div>
              <div className={styles.sp}><span>{"// despliegue"}</span><b className={styles.accent}>~ 5 semanas</b></div>
            </div>

            <div className={styles.galleryHero}>
              <ImagePlaceholder
                slot="HERO 01"
                kind="screenshot"
                caption="Dashboard gestor + portal propietario (split view editorial)"
                ratio="16/9"
                size="2400×1350 px · @2×"
                hint="Captura split: izquierda dashboard del gestor (cartera, reservas, liquidaciones pendientes); derecha portal del propietario (mi inmueble, mis liquidaciones, mis documentos)."
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
                    __html: "El propietario <em>te llama</em>. Otra vez. Para lo mismo.",
                  }}
                />
              </div>
              <div className={styles.body}>
                <p>
                  El gestor de alquileres trabaja con dos colectivos a la vez:
                  inquilinos/huéspedes y propietarios. Los SaaS del mercado se
                  enfocan en el primero (Booking, channel manager) y dejan al
                  propietario <strong>fuera del sistema</strong>: sin acceso,
                  sin visibilidad, sin documento que valga.
                </p>
                <p>
                  Resultado: el propietario llama, escribe WhatsApp, pide
                  liquidación por mail, duda del cálculo, pide el contrato
                  firmado, pregunta por la próxima reserva. El gestor le contesta
                  manualmente — todos los meses, por cada inmueble. No escala.
                </p>
                <div className={styles.painList}>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>01 ·</span>
                    <span className={styles.pt}><b>Llamadas + WhatsApp</b> de propietarios para lo de siempre.</span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>02 ·</span>
                    <span className={styles.pt}><b>Liquidaciones</b> hechas a mano en Excel cada fin de mes.</span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>03 ·</span>
                    <span className={styles.pt}><b>Contratos</b> en carpetas que nadie encuentra a tiempo.</span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>04 ·</span>
                    <span className={styles.pt}><b>Sin web</b> propia · todo el tráfico para portales que cobran.</span>
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
                __html: "Un portal por propietario. Una <em>liquidación con un click</em>.",
              }}
            />
            <div className={styles.solSteps}>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 01</div>
                <h3>CMS ligero · web propia</h3>
                <p>
                  El gestor publica sus inmuebles en una web propia, indexable,
                  rápida y con la identidad de su agencia. Sin depender de
                  portales que cobran comisión.
                </p>
                <div className={styles.stepMeta}>SEO · multi-idioma · captura de leads</div>
              </div>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 02</div>
                <h3>Portal privado del propietario</h3>
                <p>
                  Cada propietario tiene su acceso. Ve su(s) inmueble(s),
                  calendario de ocupación, ingresos previstos, liquidaciones
                  pasadas, contratos firmados y mensajes. Sin tener que llamar.
                </p>
                <div className={styles.stepMeta}>visibilidad real · sin fricción</div>
              </div>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 03</div>
                <h3>Liquidaciones automáticas</h3>
                <p>
                  Al cerrar el mes (o el periodo que pactes), NEST calcula
                  ingresos, gastos, comisión y neto. Genera el PDF, lo firma y lo
                  publica en el portal del propietario. Una sola fuente de verdad.
                </p>
                <div className={styles.stepMeta}>PDF firmado · audit log · contabilidad</div>
              </div>
            </div>

            <div className={`${styles.gallery} ${styles.gallery2}`}>
              <ImagePlaceholder
                slot="UI 01"
                kind="screenshot"
                caption="Portal propietario · vista móvil · mi inmueble + próxima liquidación"
                ratio="3/4"
                size="1200×1600 px · @2× (vertical · mobile)"
                hint="Mockup móvil del portal del propietario: foto del inmueble arriba, próxima liquidación con desglose, mensajes pendientes con el gestor. Editorial."
              />
              <ImagePlaceholder
                slot="UI 02"
                kind="screenshot"
                caption="Liquidación PDF · ejemplo real · cabecera + desglose + firma"
                ratio="3/4"
                size="1200×1600 px · @2× (vertical · A4)"
                hint="PDF liquidación: cabecera con marca del gestor, tabla desglose (reservas, ingresos, gastos, comisión, neto), firma digital al pie."
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
                __html: "Diseñado para <em>las dos partes</em>. Sin tirones.",
              }}
            />

            <div className={styles.detailBlock}>
              <div>
                <div className={styles.detailKicker}>gestor · dashboard</div>
                <h3>
                  Toda tu cartera <em>en una sola pantalla</em>.
                </h3>
                <p>
                  Cartera por estado (activo, en mantenimiento, libre, vendido),
                  ocupación mes a mes, calendario consolidado, reservas
                  entrantes desde Booking/Airbnb, liquidaciones por cerrar y
                  mensajes pendientes con propietarios.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Sincronización</b> Booking · Airbnb · Vrbo · custom</li>
                  <li><b>Tareas</b> de check-in, mantenimiento y limpieza</li>
                  <li><b>Mensajería</b> unificada por inmueble y propietario</li>
                  <li><b>Reportes</b> mensuales y trimestrales en un click</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="UI 03"
                kind="screenshot"
                caption="Dashboard gestor · KPIs cartera + tablero del día"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Dashboard del gestor: arriba 4 KPIs (ocupación, ingresos, liquidaciones, mensajes), centro calendario consolidado, lateral con tareas del día."
              />
            </div>

            <div className={`${styles.detailBlock} ${styles.detailFlip}`}>
              <div>
                <div className={styles.detailKicker}>propietario · portal</div>
                <h3>
                  Cero llamadas. <em>Toda la información</em> en su bolsillo.
                </h3>
                <p>
                  El propietario entra con un código mágico, ve su inmueble en
                  tiempo real, calendario de reservas, ingresos previstos,
                  histórico de liquidaciones, contratos firmados y un canal
                  directo con su gestor. Sin app — funciona en navegador.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Acceso</b> sin contraseña · magic link por email</li>
                  <li><b>Multi-inmueble</b> · multi-propietario (co-propiedad)</li>
                  <li><b>Notificaciones</b> opcionales por email y WhatsApp</li>
                  <li><b>Idiomas</b> ES · CA · EN · DE</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="UI 04"
                kind="screenshot"
                caption="Portal propietario · vista escritorio · histórico liquidaciones"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Vista escritorio del portal: lateral con inmuebles, centro con histórico de liquidaciones (cards con monto, fecha y descarga PDF), arriba próxima reserva."
              />
            </div>

            <div className={styles.detailBlock}>
              <div>
                <div className={styles.detailKicker}>contratos · liquidaciones</div>
                <h3>
                  Firma digital. <em>Trazabilidad notarial</em>.
                </h3>
                <p>
                  Contratos generados a partir de plantillas tuyas, con datos
                  rellenados automáticamente. Firma digital legal (eIDAS). Cada
                  documento tiene su hash, su sello de tiempo y su trazabilidad
                  completa. Las liquidaciones siguen el mismo flujo.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Plantillas</b> de contrato y liquidación personalizables</li>
                  <li><b>Firma eIDAS</b> · validez legal en UE</li>
                  <li><b>Hash + timestamp</b> en cada documento</li>
                  <li><b>Audit log</b> con quién, cuándo y desde dónde</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="UI 05"
                kind="screenshot"
                caption="Generación contrato + firma digital · pantalla del propietario"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Pantalla del propietario firmando un contrato: PDF embebido a la izquierda, panel de firma a la derecha con identidad, código SMS y botón firmar."
              />
            </div>

            <div className={styles.pillRow}>
              <span className={styles.pill}>firma <b>eIDAS</b></span>
              <span className={styles.pill}>integraciones <b>Booking · Airbnb · Vrbo</b></span>
              <span className={styles.pill}>contabilidad <b>A3 · Holded · Sage</b></span>
              <span className={styles.pill}>idiomas <b>ES · CA · EN · DE</b></span>
              <span className={styles.pill}>auth <b>magic link · MFA</b></span>
              <span className={styles.pill}>hosting <b>EU · GDPR</b></span>
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
                  __html: "Lo que cambia <em>cuando el propietario tiene su portal</em>.",
                }}
              />
              <div className={styles.meta}>
                <div>media 3 gestores · 1.200 inmuebles · 11 meses</div>
                <div><b>· 2025 — 2026</b></div>
              </div>
            </div>
            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <div className={styles.mKey}>llamadas propietario</div>
                <div className={styles.mBig}>
                  <em data-count data-value="74" data-decimals="0" data-duration="1200">0</em>
                  <sup>% -</sup>
                </div>
                <div className={styles.mNote}>vs trimestre anterior</div>
                <div className={styles.mTrend}>↓ autoservicio funciona</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>cierre mensual</div>
                <div className={styles.mBig}>
                  <em data-count data-value="20" data-decimals="0" data-duration="1400">0</em>
                  <sup>min</sup>
                </div>
                <div className={styles.mNote}>antes: 2 días</div>
                <div className={styles.mTrend}>↓ liquidaciones auto</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>NPS propietarios</div>
                <div className={styles.mBig}>
                  <em data-count data-value="71" data-decimals="0" data-duration="1600">0</em>
                  <sup>· +27 pts</sup>
                </div>
                <div className={styles.mNote}>encuesta semestral</div>
                <div className={styles.mTrend}>↑ transparencia sentida</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>renovación cartera</div>
                <div className={styles.mBig}>
                  <em data-count data-value="93" data-decimals="0" data-duration="1800">0</em>
                  <sup>%</sup>
                </div>
                <div className={styles.mNote}>propietarios que renuevan</div>
                <div className={styles.mTrend}>↑ vs 78% pre-NEST</div>
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
                __html: "Gestoras que <em>ya no contestan la misma llamada</em>.",
              }}
            />
            <div className={styles.casesList}>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 01</div>
                <div className={styles.cWho}>Alquiler vacacional · Pollença</div>
                <div className={styles.cWhat}>
                  340 inmuebles. Sustituyeron Excel + Drive + WhatsApp por
                  portal propietario. Liquidación mensual en 20 min por toda la
                  cartera.
                </div>
                <div className={styles.cOut}><b>−74%</b><br />llamadas propietario</div>
              </div>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 02</div>
                <div className={styles.cWho}>Inmobiliaria · Palma</div>
                <div className={styles.cWhat}>
                  Cartera mixta (alquiler larga + venta). Web propia con SEO
                  local, contratos digitales con firma eIDAS y portal para
                  vendedores con tráfico real.
                </div>
                <div className={styles.cOut}><b>+38% leads</b><br />desde web propia</div>
              </div>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 03</div>
                <div className={styles.cWho}>Property manager · Ibiza</div>
                <div className={styles.cWhat}>
                  Cartera premium con copropietarios internacionales. Portal
                  multilingüe, firma eIDAS y liquidaciones automatizadas
                  trimestralmente.
                </div>
                <div className={styles.cOut}><b>93% renovación</b><br />de mandatos</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={`${styles.section} ${styles.cta}`} id="cta">
          <div className={styles.ctaInner}>
            <div>
              <div className={styles.sectionTag}>06 · conversación</div>
              <h2
                dangerouslySetInnerHTML={{
                  __html: "¿Contestas <em>tres veces lo mismo</em> a cada propietario?",
                }}
              />
              <p className={styles.lead}>
                Una conversación de 30 minutos. Si tus propietarios necesitan
                llamarte para saber cómo va su inmueble, probablemente
                FMTA—NEST encaje.
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
              <div className={styles.row}><span>producto</span><span>FMTA—NEST</span></div>
              <div className={styles.row}><span>despliegue</span><span>~ 5 semanas</span></div>
              <div className={styles.row}><span>cartera</span><span>50–2.000 inmuebles</span></div>
              <div className={styles.row}><span>firma</span><span>eIDAS · validez UE</span></div>
              <div className={styles.row}><span>hosting</span><span>EU · GDPR</span></div>
              <div className={styles.row}><span>desde</span><span>2025 — en producción</span></div>
            </div>
          </div>
        </section>
      </main>

      <ProductFooter code="NEST" clients="3 gestoras · 1.200 inmuebles" />
      <ProductEffects />
    </ProductShell>
  );
}
