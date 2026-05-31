import type { Metadata } from "next";
import Link from "next/link";

import { DropOrnament } from "@/components/landing/DropOrnament";
import { FlowGraph } from "@/components/landing/FlowGraph";
import {
  ProductEffects,
  ProductFooter,
  ProductHud,
  ProductShell,
} from "@/components/landing/ProductLayoutShell";
import styles from "@/styles/productos.module.css";

export const metadata: Metadata = {
  title: "FMTA—FLOW · Flow que entiende · ForMeta",
  description:
    "Orquestación de procesos que aprende de tu equipo y se reconfigura sola. Agentes especializados. Sin BPMN. Cada decisión trazable.",
};

export default function FlowPage() {
  return (
    <ProductShell>
      <ProductHud code="FLOW" />

      <main id="main" tabIndex={-1}>
      {/* HERO */}
      <section className={`${styles.section} ${styles.prodHero}`}>
        <div className={styles.prodHeroInner}>
          <div className={styles.prodEyebrow}>
            <span className={styles.ridge} />
            <span>Producto 03 · IApp · en producción</span>
          </div>
          <div className={styles.prodCode}>FMTA—FLOW</div>
          <h1>
            <em>Flow</em>
            <br />
            que entiende.
          </h1>
          <p className={styles.lead}>
            Orquestación de procesos que aprende de cómo trabaja tu equipo y se
            reconfigura sola. Sin formularios. Sin pasos rígidos. Sin BPMN.
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
            <div className={styles.sp}><span>{"// instalado en"}</span><b>3 empresas</b></div>
            <div className={styles.sp}><span>{"// agentes"}</span><b>especializados por dominio</b></div>
            <div className={styles.sp}><span>{"// auditoría"}</span><b className={styles.accent}>cada decisión trazable</b></div>
            <div className={styles.sp}><span>{"// rigidez"}</span><b className={styles.accent}>cero formularios</b></div>
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
                  __html: "Los procesos <em>nunca son los mismos</em>. El software, sí.",
                }}
              />
            </div>
            <div className={styles.body}>
              <p>
                La forma en que tu empresa resuelve cosas no está en un diagrama BPMN.
                Está en la cabeza de la gente que lleva años haciéndolo.{" "}
                <strong>Cada caso tiene una excepción</strong>. Cada cliente tiene su
                matiz. Cada mes algo cambia.
              </p>
              <p>
                Pero el software te obliga a empaquetar todo en flujos rígidos que
                envejecen el día que se firman. Cuando la realidad se desvía — y siempre
                se desvía — alguien tiene que hacer el trabajo por el sistema.
              </p>
              <div className={styles.painList}>
                <div className={styles.painItem}>
                  <span className={styles.pn}>01 ·</span>
                  <span className={styles.pt}><b>BPMN muerto</b> en producción desde el mes 2.</span>
                </div>
                <div className={styles.painItem}>
                  <span className={styles.pn}>02 ·</span>
                  <span className={styles.pt}><b>Excepciones</b> resueltas a mano, fuera del sistema.</span>
                </div>
                <div className={styles.painItem}>
                  <span className={styles.pn}>03 ·</span>
                  <span className={styles.pt}><b>Workarounds</b> en Excel que nadie documenta.</span>
                </div>
                <div className={styles.painItem}>
                  <span className={styles.pn}>04 ·</span>
                  <span className={styles.pt}>
                    <b>Trazabilidad</b> rota cuando el caso se sale del flujo &quot;feliz&quot;.
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
              __html: "Agentes que <em>saben de tu dominio</em>. Que se hablan entre ellos.",
            }}
          />
          <div className={styles.solSteps}>
            <div className={styles.solStep}>
              <div className={styles.stepTag}>paso 01</div>
              <h3>Aprenden el dominio</h3>
              <p>
                Cada agente conoce una parte del trabajo: ventas, almacén, contabilidad,
                atención. Se entrenan con tus documentos, tus correos, tu histórico — no
                con un manual genérico.
              </p>
              <div className={styles.stepMeta}>RAG · fine-tune ligero · context grounding</div>
            </div>
            <div className={styles.solStep}>
              <div className={styles.stepTag}>paso 02</div>
              <h3>Conversan, no ejecutan</h3>
              <p>
                Cuando llega un caso nuevo, los agentes se hablan entre ellos. Negocian
                la respuesta. Si hay ambigüedad, te preguntan. Si no, actúan.
              </p>
              <div className={styles.stepMeta}>multi-agent · structured handoff · trazas</div>
            </div>
            <div className={styles.solStep}>
              <div className={styles.stepTag}>paso 03</div>
              <h3>Auditan cada paso</h3>
              <p>
                Cada decisión queda con su contexto, sus opciones consideradas y por qué
                eligió esa. Puedes auditar 6 meses después por qué pasó lo que pasó.
              </p>
              <div className={styles.stepMeta}>log estructurado · explicabilidad · replay</div>
            </div>
          </div>

          <FlowGraph />
        </div>
      </section>

      {/* MÉTRICAS */}
      <section className={`${styles.section} ${styles.metrics}`} id="metricas">
        <div className={styles.metricsInner}>
          <div className={styles.sectionTag}>03 · métricas</div>
          <div className={styles.metricsHead}>
            <h2
              dangerouslySetInnerHTML={{
                __html: "Lo que cambia <em>cuando el proceso vive</em>.",
              }}
            />
            <div className={styles.meta}>
              <div>media 3 clientes · 10 meses</div>
              <div><b>· 2025 — 2026</b></div>
            </div>
          </div>
          <div className={styles.metricsGrid}>
            <div className={styles.metric}>
              <div className={styles.mKey}>casos resueltos solos</div>
              <div className={styles.mBig}>
                <em data-count data-value="78" data-decimals="0" data-duration="1200">0</em>
                <sup>%</sup>
              </div>
              <div className={styles.mNote}>vs derivación a humano</div>
              <div className={styles.mTrend}>↑ autonomía operativa</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.mKey}>tiempo por caso</div>
              <div className={styles.mBig}>
                <em data-count data-value="4" data-decimals="0" data-duration="1400">0</em>
                <sup>min/caso</sup>
              </div>
              <div className={styles.mNote}>antes: 32 min/caso</div>
              <div className={styles.mTrend}>↓ 87% · agentes negocian</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.mKey}>excepciones cubiertas</div>
              <div className={styles.mBig}>
                <em data-count data-value="92" data-decimals="0" data-duration="1600">0</em>
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
              <div className={styles.mTrend}>↑ replay forensic</div>
            </div>
          </div>
        </div>
      </section>

      {/* CASOS */}
      <section className={`${styles.section} ${styles.cases}`} id="casos">
        <div className={styles.casesInner}>
          <div className={styles.sectionTag}>04 · en producción</div>
          <h2
            dangerouslySetInnerHTML={{
              __html: "Tres equipos que <em>recuperaron el control</em>.",
            }}
          />
          <div className={styles.casesList}>
            <div className={styles.caseRow}>
              <div className={styles.cNum}>CASO 01</div>
              <div className={styles.cWho}>Gestoría · Palma</div>
              <div className={styles.cWhat}>
                Pedidos entrantes por mail, factura PDF y reglas internas. Los agentes
                extraen, deciden y emiten orden de compra. Excepciones a humano.
              </div>
              <div className={styles.cOut}><b>78%</b><br />sin tocar</div>
            </div>
            <div className={styles.caseRow}>
              <div className={styles.cNum}>CASO 02</div>
              <div className={styles.cWho}>Atención cliente · Manacor</div>
              <div className={styles.cWhat}>
                Mails de reclamación clasificados, respondidos y escalados según
                políticas internas. Tono y idioma del cliente preservados.
              </div>
              <div className={styles.cOut}><b>4 min/caso</b><br />vs 32 antes</div>
            </div>
            <div className={styles.caseRow}>
              <div className={styles.cNum}>CASO 03</div>
              <div className={styles.cWho}>Logística · Inca</div>
              <div className={styles.cWhat}>
                Albaranes incoherentes con stock real. Flow valida, corrige y deriva a
                proveedor sin pasar por humano cuando hay confianza alta.
              </div>
              <div className={styles.cOut}><b>0 BPMN</b><br />en producción</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={`${styles.section} ${styles.cta}`} id="cta">
        <div className={styles.ctaInner}>
          <div>
            <div className={styles.sectionTag}>05 · conversación</div>
            <h2
              dangerouslySetInnerHTML={{
                __html: "¿Tus procesos <em>viven en una persona</em>?",
              }}
            />
            <p className={styles.lead}>
              Una conversación de 30 minutos. Si el negocio funciona porque alguien
              tiene la cabeza llena, probablemente FMTA—FLOW encaje.
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
            <div className={styles.row}><span>producto</span><span>FMTA—FLOW</span></div>
            <div className={styles.row}><span>despliegue</span><span>~ 8 semanas</span></div>
            <div className={styles.row}><span>agentes</span><span>por dominio</span></div>
            <div className={styles.row}><span>auditoría</span><span>completa · replay</span></div>
            <div className={styles.row}><span>desde</span><span>2025 — en producción</span></div>
          </div>
        </div>
      </section>
      </main>

      <ProductFooter code="FLOW" clients="3 clientes" />
      <ProductEffects />
    </ProductShell>
  );
}
