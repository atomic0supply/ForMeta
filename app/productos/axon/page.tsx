import type { Metadata } from "next";
import Link from "next/link";

import { DropOrnament } from "@/components/landing/DropOrnament";
import { FlowGraph } from "@/components/landing/FlowGraph";
import { ImagePlaceholder } from "@/components/landing/ImagePlaceholder";
import {
  ProductEffects,
  ProductFooter,
  ProductHud,
  ProductShell,
} from "@/components/landing/ProductLayoutShell";
import styles from "@/styles/productos.module.css";

export const metadata: Metadata = {
  title: "FMTA—AXON · El sistema nervioso de tu negocio · ForMeta",
  description:
    "Agentes con IA que aprenden tu dominio, gestionan excepciones, se coordinan entre ellos y dejan traza auditable. Tu operación funciona aunque tú no estés mirando.",
};

export default function AxonPage() {
  return (
    <ProductShell>
      <ProductHud code="AXON" />

      <main id="main" tabIndex={-1}>
        {/* HERO */}
        <section className={`${styles.section} ${styles.prodHero}`}>
          <div className={styles.prodHeroInner}>
            <div className={styles.prodEyebrow}>
              <span className={styles.ridge} />
              <span>Producto 01 · IApp · agentes autónomos</span>
            </div>
            <div className={styles.prodCode}>FMTA—AXON</div>
            <h1>
              El sistema nervioso
              <br />
              <em>de tu negocio.</em>
            </h1>
            <p className={styles.lead}>
              Agentes con IA que aprenden tu dominio, gestionan excepciones, se
              coordinan entre ellos y dejan traza auditable de cada decisión. Tu
              operación funciona aunque tú no estés mirando.
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
              <div className={styles.sp}><span>{"// arquitectura"}</span><b>multi-agente · LLM nativo</b></div>
              <div className={styles.sp}><span>{"// agentes base"}</span><b>ventas · ops · cobros · soporte</b></div>
              <div className={styles.sp}><span>{"// auditoría"}</span><b className={styles.accent}>100% trazable</b></div>
              <div className={styles.sp}><span>{"// despliegue"}</span><b className={styles.accent}>~ 8 semanas</b></div>
            </div>

            <div className={styles.galleryHero}>
              <ImagePlaceholder
                slot="HERO 01"
                kind="screenshot"
                caption="Panel de operación · agentes vivos, casos en curso y handoff entre dominios"
                ratio="16/9"
                size="2400×1350 px (1×) · @2× para retina"
                hint="Captura de la consola AXON con timeline de decisiones a la derecha, sidebar de agentes a la izquierda y heatmap de carga arriba. Tema light · acento terra."
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
                    __html: "Tu empresa <em>te necesita</em> para todo. Y eso no escala.",
                  }}
                />
              </div>
              <div className={styles.body}>
                <p>
                  El negocio funciona porque alguien — tú, un par de personas —
                  tienen el contexto entero en la cabeza. Saben qué cliente perdona
                  un retraso y cuál no, qué proveedor responde a las 9pm, qué
                  factura espera por qué motivo.{" "}
                  <strong>Ese conocimiento no está en ningún software.</strong>
                </p>
                <p>
                  Cuando esa gente se va de vacaciones, enferma, o simplemente
                  duerme, la operación se ralentiza. Los casos se acumulan, los
                  clientes esperan, las excepciones rebotan entre buzones. Crecer
                  significa contratar — y volver a transmitir, de boca a oreja, ese
                  mismo conocimiento.
                </p>
                <div className={styles.painList}>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>01 ·</span>
                    <span className={styles.pt}>
                      <b>Excepciones</b> que solo dos personas saben resolver.
                    </span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>02 ·</span>
                    <span className={styles.pt}>
                      <b>Coordinación</b> entre áreas vía mail, Slack y memoria
                      humana.
                    </span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>03 ·</span>
                    <span className={styles.pt}>
                      <b>Auditoría</b> rota cuando el caso se sale del flujo
                      &quot;feliz&quot;.
                    </span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>04 ·</span>
                    <span className={styles.pt}>
                      <b>Crecimiento</b> bloqueado por la transmisión oral de
                      contexto.
                    </span>
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
                __html: "Una red de <em>agentes especializados</em>. Que se hablan. Que aprenden.",
              }}
            />
            <div className={styles.solSteps}>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 01</div>
                <h3>Aprenden tu dominio</h3>
                <p>
                  Cada agente conoce una parte del trabajo: ventas, almacén,
                  cobros, atención. Se entrenan con tus documentos, tu CRM, tus
                  correos históricos — no con un manual genérico.
                </p>
                <div className={styles.stepMeta}>RAG · fine-tune ligero · context grounding</div>
              </div>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 02</div>
                <h3>Conversan, no ejecutan</h3>
                <p>
                  Cuando llega un caso nuevo, los agentes se hablan entre ellos.
                  Negocian la respuesta. Si hay ambigüedad, te preguntan. Si no,
                  actúan dentro de sus límites.
                </p>
                <div className={styles.stepMeta}>multi-agent · structured handoff · trazas</div>
              </div>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 03</div>
                <h3>Auditan cada paso</h3>
                <p>
                  Cada decisión queda con su contexto, sus opciones consideradas y
                  por qué eligió esa. Puedes auditar 6 meses después por qué pasó
                  lo que pasó.
                </p>
                <div className={styles.stepMeta}>log estructurado · explicabilidad · replay</div>
              </div>
            </div>

            <FlowGraph />

            <div className={`${styles.gallery} ${styles.gallery2}`}>
              <ImagePlaceholder
                slot="UI 01"
                kind="screenshot"
                caption="Vista de un caso con razonamiento expandido"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Detalle de un ticket en AXON: input del cliente, razonamiento del agente, opciones consideradas, decisión y siguientes acciones. Acordeón colapsable."
              />
              <ImagePlaceholder
                slot="UI 02"
                kind="screenshot"
                caption="Audit log · timeline forense de decisiones"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Línea de tiempo vertical con eventos por agente, filtros por fecha/dominio, badge de confianza y enlace al replay del caso."
              />
            </div>
          </div>
        </section>

        {/* DETALLE — agentes */}
        <section className={`${styles.section} ${styles.detail}`} id="agentes">
          <div className={styles.detailInner}>
            <div className={styles.sectionTag}>03 · agentes</div>
            <h2
              dangerouslySetInnerHTML={{
                __html: "Cada agente con su <em>especialidad</em>. Cada decisión con su porqué.",
              }}
            />

            <div className={styles.detailBlock}>
              <div>
                <div className={styles.detailKicker}>agente · ventas</div>
                <h3>
                  Cualifica leads, prepara propuestas y <em>cierra los fáciles</em>.
                </h3>
                <p>
                  Lee el correo entrante, busca en tu CRM si es cliente nuevo o
                  recurrente, prepara presupuesto con tus reglas de precio y
                  responde con tu tono. Lo que pasa de un umbral, te lo deja
                  preparado para que tú firmes.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Aprende</b> tu política de descuentos y márgenes mínimos.</li>
                  <li><b>Detecta</b> oportunidades de upsell por patrón histórico.</li>
                  <li><b>Escala</b> a humano cuando la confianza baja del 80%.</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="MOCKUP 03"
                kind="mockup"
                caption="Agente Ventas · conversación entrante → propuesta enviada"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Mockup con tres columnas: entrada (email cliente), razonamiento (busca en CRM, cruza precio, valida stock), salida (propuesta PDF). Estilo editorial, no UI realista."
              />
            </div>

            <div className={`${styles.detailBlock} ${styles.detailFlip}`}>
              <div>
                <div className={styles.detailKicker}>agente · operaciones</div>
                <h3>
                  Coordina <em>almacén, logística y cobros</em> sin pedir permiso.
                </h3>
                <p>
                  Cuando entra un pedido, valida stock, reserva, pide a proveedor
                  si falta, programa la entrega y abre la factura. Si algo se
                  rompe, identifica el cuello y propone alternativas.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Integra</b> con tu ERP existente — Holded, Odoo, SAP B1.</li>
                  <li><b>Negocia</b> con el agente de cobros para liberar entregas.</li>
                  <li><b>Reactiva</b> casos parados sin necesidad de checklist humano.</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="MOCKUP 04"
                kind="mockup"
                caption="Agente Ops · árbol de decisión sobre un pedido roto"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Diagrama radial con el caso en el centro, ramas hacia stock/cobros/logística y arcos de comunicación entre agentes. Pesos numéricos en cada rama."
              />
            </div>

            <div className={styles.detailBlock}>
              <div>
                <div className={styles.detailKicker}>agente · soporte</div>
                <h3>
                  Resuelve tickets en el idioma del cliente. <em>Aprende</em> de
                  cada cierre.
                </h3>
                <p>
                  Lee el mensaje, recupera el contexto del cliente, busca en la
                  base de conocimiento y responde. Si no sabe, escala con un
                  resumen perfecto. Cada caso cerrado se convierte en aprendizaje
                  para el siguiente.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Detecta</b> tono y urgencia, prioriza colas en tiempo real.</li>
                  <li><b>Mantiene</b> SLA por contrato sin que nadie mire el reloj.</li>
                  <li><b>Genera</b> FAQ vivo a partir de los casos repetidos.</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="MOCKUP 05"
                kind="mockup"
                caption="Agente Soporte · ticket → respuesta + entrada FAQ generada"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Bandeja de tickets con badges de prioridad, panel de respuesta a la derecha y, abajo, una entrada FAQ recién creada con su versionado."
              />
            </div>

            <div className={styles.pillRow}>
              <span className={styles.pill}>handoff <b>structured</b></span>
              <span className={styles.pill}>confianza <b>0-100</b></span>
              <span className={styles.pill}>replay <b>forensic</b></span>
              <span className={styles.pill}>guardrails <b>configurables</b></span>
              <span className={styles.pill}>idioma <b>ES · CA · EN</b></span>
              <span className={styles.pill}>modelo <b>Claude · GPT · local</b></span>
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
                  __html: "Lo que cambia <em>cuando el negocio piensa solo</em>.",
                }}
              />
              <div className={styles.meta}>
                <div>media 4 clientes · 9 meses</div>
                <div><b>· 2025 — 2026</b></div>
              </div>
            </div>
            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <div className={styles.mKey}>casos resueltos solos</div>
                <div className={styles.mBig}>
                  <em data-count data-value="82" data-decimals="0" data-duration="1200">0</em>
                  <sup>%</sup>
                </div>
                <div className={styles.mNote}>vs derivación a humano</div>
                <div className={styles.mTrend}>↑ autonomía operativa</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>tiempo por caso</div>
                <div className={styles.mBig}>
                  <em data-count data-value="3" data-decimals="0" data-duration="1400">0</em>
                  <sup>min/caso</sup>
                </div>
                <div className={styles.mNote}>antes: 32 min/caso</div>
                <div className={styles.mTrend}>↓ 90% · negociación interna</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>excepciones cubiertas</div>
                <div className={styles.mBig}>
                  <em data-count data-value="94" data-decimals="0" data-duration="1600">0</em>
                  <sup>%</sup>
                </div>
                <div className={styles.mNote}>casos atípicos resueltos</div>
                <div className={styles.mTrend}>↑ sin alargar el flujo</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>trazabilidad</div>
                <div className={styles.mBig}>
                  <em data-count data-value="100" data-decimals="0" data-duration="1800">0</em>
                  <sup>%</sup>
                </div>
                <div className={styles.mNote}>cada decisión auditable</div>
                <div className={styles.mTrend}>↑ replay completo</div>
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
                __html: "Tres negocios que <em>recuperaron las noches</em>.",
              }}
            />
            <div className={styles.casesList}>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 01</div>
                <div className={styles.cWho}>Gestoría · Palma</div>
                <div className={styles.cWhat}>
                  Tres agentes para entrada de mails, validación de facturas y
                  cobros. Excepciones derivadas al equipo solo cuando el sistema
                  no tiene certeza alta.
                </div>
                <div className={styles.cOut}><b>82%</b><br />sin tocar</div>
              </div>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 02</div>
                <div className={styles.cWho}>E-commerce · Manacor</div>
                <div className={styles.cWhat}>
                  Soporte multilingüe automatizado para 4 países. Tono y matiz
                  del cliente preservados. Auditoría por país lista para
                  reguladores.
                </div>
                <div className={styles.cOut}><b>3 min/caso</b><br />vs 32 antes</div>
              </div>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 03</div>
                <div className={styles.cWho}>Logística · Inca</div>
                <div className={styles.cWhat}>
                  Albaranes incoherentes con stock real. AXON valida, corrige y
                  deriva a proveedor sin pasar por humano cuando hay confianza
                  alta.
                </div>
                <div className={styles.cOut}><b>0 BPMN</b><br />en producción</div>
              </div>
            </div>

            <ImagePlaceholder
              slot="HERO 02"
              kind="photo"
              caption="Equipo cliente · primer despliegue en producción · 06:30 AM"
              ratio="21/9"
              size="2880×1234 px · @2×"
              hint="Foto ambiente del equipo de la gestoría observando la consola AXON el primer lunes en producción. B&W cálido, grano sutil, tono editorial."
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
                  __html: "¿Tu negocio <em>vive en tu cabeza</em>?",
                }}
              />
              <p className={styles.lead}>
                Una conversación de 30 minutos. Si la operación funciona porque
                tú estás disponible, probablemente FMTA—AXON encaje.
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
              <div className={styles.row}><span>producto</span><span>FMTA—AXON</span></div>
              <div className={styles.row}><span>despliegue</span><span>~ 8 semanas</span></div>
              <div className={styles.row}><span>agentes</span><span>por dominio</span></div>
              <div className={styles.row}><span>auditoría</span><span>completa · replay</span></div>
              <div className={styles.row}><span>modelo</span><span>Claude · GPT · local</span></div>
              <div className={styles.row}><span>desde</span><span>2025 — en producción</span></div>
            </div>
          </div>
        </section>
      </main>

      <ProductFooter code="AXON" clients="4 clientes" />
      <ProductEffects />
    </ProductShell>
  );
}
