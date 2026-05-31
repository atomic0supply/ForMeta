import type { Metadata } from "next";
import Link from "next/link";

import { DropOrnament } from "@/components/landing/DropOrnament";
import {
  ProductEffects,
  ProductFooter,
  ProductHud,
  ProductShell,
} from "@/components/landing/ProductLayoutShell";
import { VozCard } from "@/components/landing/VozCard";
import styles from "@/styles/productos.module.css";

export const metadata: Metadata = {
  title: "FMTA—VOZ · Voz que opera · ForMeta",
  description:
    "Hablas con tu negocio en mallorquín, castellano o inglés. La operación se ejecuta sola — sin teclado, sin formularios. 4 clientes · 280 ms latencia.",
};

export default function VozPage() {
  return (
    <ProductShell>
      <ProductHud code="VOZ" />

      <main id="main" tabIndex={-1}>
      {/* HERO */}
      <section className={`${styles.section} ${styles.prodHero}`}>
        <div className={styles.prodHeroInner}>
          <div className={styles.prodEyebrow}>
            <span className={styles.ridge} />
            <span>Producto 02 · IApp · en producción</span>
          </div>
          <div className={styles.prodCode}>FMTA—VOZ</div>
          <h1>
            <em>Voz</em>
            <br />
            que opera.
          </h1>
          <p className={styles.lead}>
            Hablas con tu negocio en mallorquín, castellano o inglés. La operación se
            ejecuta sola — sin teclado, sin formularios, sin esperar.
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
            <div className={styles.sp}><span>{"// instalado en"}</span><b>4 empresas</b></div>
            <div className={styles.sp}><span>{"// idiomas"}</span><b>CA · ES · EN</b></div>
            <div className={styles.sp}><span>{"// latencia media"}</span><b className={styles.accent}>280 ms</b></div>
            <div className={styles.sp}><span>{"// modo"}</span><b className={styles.accent}>manos libres · offline-first</b></div>
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
                  __html: "Las manos están <em>en el trabajo</em>. No en la pantalla.",
                }}
              />
            </div>
            <div className={styles.body}>
              <p>
                El técnico está con las manos manchadas. El encargado está con la harina.
                El comercial está conduciendo. <strong>Nadie tiene tiempo de abrir una
                app</strong> y rellenar 14 campos para registrar lo que acaba de pasar.
              </p>
              <p>
                Así que no se registra. O se registra mal. O se registra al final del
                día, recordando a medias. Los datos se pierden — y con ellos, todo lo
                que la empresa podría aprender de sí misma.
              </p>
              <div className={styles.painList}>
                <div className={styles.painItem}>
                  <span className={styles.pn}>01 ·</span>
                  <span className={styles.pt}>
                    <b>Formularios</b> que nadie rellena fuera de la oficina.
                  </span>
                </div>
                <div className={styles.painItem}>
                  <span className={styles.pn}>02 ·</span>
                  <span className={styles.pt}>
                    <b>Datos a medias</b> apuntados en libretas, post-its y memorias frágiles.
                  </span>
                </div>
                <div className={styles.painItem}>
                  <span className={styles.pn}>03 ·</span>
                  <span className={styles.pt}>
                    <b>Apps móviles</b> diseñadas para oficina, usadas en zonas sin cobertura.
                  </span>
                </div>
                <div className={styles.painItem}>
                  <span className={styles.pn}>04 ·</span>
                  <span className={styles.pt}>
                    <b>Tono y matiz</b> del trabajo real perdidos en menús desplegables.
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
              __html: "Hablas. El sistema <em>te escucha bien</em>. Y actúa.",
            }}
          />
          <div className={styles.solSteps}>
            <div className={styles.solStep}>
              <div className={styles.stepTag}>paso 01</div>
              <h3>Captura por voz</h3>
              <p>
                Una pulsación, una frase. En mallorquín, castellano o inglés. La
                transcripción ocurre en el dispositivo, sin enviar audio a ningún
                servidor. Funciona sin cobertura.
              </p>
              <div className={styles.stepMeta}>offline-first · privacidad por diseño</div>
            </div>
            <div className={styles.solStep}>
              <div className={styles.stepTag}>paso 02</div>
              <h3>Entiende intención</h3>
              <p>
                No es dictado. El sistema interpreta lo que quieres que pase. &quot;Tres
                sacos de harina al proveedor el martes&quot; → orden de compra, proveedor
                habitual, fecha resuelta.
              </p>
              <div className={styles.stepMeta}>claude · gpt · whisper · context grounding</div>
            </div>
            <div className={styles.solStep}>
              <div className={styles.stepTag}>paso 03</div>
              <h3>Confirma con voz</h3>
              <p>
                Te lee lo que ha entendido. Confirmas con una palabra. Si tiene dudas,
                te pregunta. Como hablar con alguien que conoce tu negocio.
              </p>
              <div className={styles.stepMeta}>confirmación verbal · trazabilidad completa</div>
            </div>
          </div>

          <VozCard />
        </div>
      </section>

      {/* MÉTRICAS */}
      <section className={`${styles.section} ${styles.metrics}`} id="metricas">
        <div className={styles.metricsInner}>
          <div className={styles.sectionTag}>03 · métricas</div>
          <div className={styles.metricsHead}>
            <h2
              dangerouslySetInnerHTML={{
                __html: "Lo que pasa <em>cuando los datos llegan</em>.",
              }}
            />
            <div className={styles.meta}>
              <div>media 4 clientes · 9 meses</div>
              <div><b>· 2025 — 2026</b></div>
            </div>
          </div>
          <div className={styles.metricsGrid}>
            <div className={styles.metric}>
              <div className={styles.mKey}>latencia voz → acción</div>
              <div className={styles.mBig}>
                <em data-count data-value="280" data-decimals="0" data-duration="1200">0</em>
                <sup>ms</sup>
              </div>
              <div className={styles.mNote}>p95 · en dispositivo</div>
              <div className={styles.mTrend}>↓ tiempo real percibido</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.mKey}>registros recuperados</div>
              <div className={styles.mBig}>
                <em data-count data-value="3.4" data-decimals="1" data-duration="1400">0</em>
                <sup>× más datos</sup>
              </div>
              <div className={styles.mNote}>vs formularios escritos</div>
              <div className={styles.mTrend}>↑ visibilidad operativa</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.mKey}>precisión transcripción</div>
              <div className={styles.mBig}>
                <em data-count data-value="97" data-decimals="0" data-duration="1600">0</em>
                <sup>%</sup>
              </div>
              <div className={styles.mNote}>incl. mallorquí · jerga local</div>
              <div className={styles.mTrend}>↑ glosario propio del negocio</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.mKey}>tiempo registro</div>
              <div className={styles.mBig}>
                <em data-count data-value="6" data-decimals="0" data-duration="1800">0</em>
                <sup>seg/evento</sup>
              </div>
              <div className={styles.mNote}>antes: 90 seg formulario</div>
              <div className={styles.mTrend}>↓ 93% · friction free</div>
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
              __html: "Cuatro equipos que <em>recuperaron su voz</em>.",
            }}
          />
          <div className={styles.casesList}>
            <div className={styles.caseRow}>
              <div className={styles.cNum}>CASO 01</div>
              <div className={styles.cWho}>Taller mecánico · Inca</div>
              <div className={styles.cWhat}>
                Reportes de avería dictados con las manos en el motor. La conversación
                se convierte en orden de trabajo y orden de repuestos.
              </div>
              <div className={styles.cOut}><b>0 retrabajos</b><br />por error de parte</div>
            </div>
            <div className={styles.caseRow}>
              <div className={styles.cNum}>CASO 02</div>
              <div className={styles.cWho}>Servicio técnico · Palma</div>
              <div className={styles.cWhat}>
                Visitas a casa de cliente con baja cobertura. La app graba la
                intervención offline y sincroniza al salir. Fotos opcionales.
              </div>
              <div className={styles.cOut}><b>+38% partes</b><br />completados</div>
            </div>
            <div className={styles.caseRow}>
              <div className={styles.cNum}>CASO 03</div>
              <div className={styles.cWho}>Panadería · Manacor</div>
              <div className={styles.cWhat}>
                Pedidos a proveedores y registros de producción dictados a las 6 AM,
                en mallorquí. Sin parar la masa.
              </div>
              <div className={styles.cOut}><b>6 seg/evento</b><br />vs 90 antes</div>
            </div>
            <div className={styles.caseRow}>
              <div className={styles.cNum}>CASO 04</div>
              <div className={styles.cWho}>Bodega · Binissalem</div>
              <div className={styles.cWhat}>
                Notas de cata y observaciones de barricas dictadas en el almacén.
                Búsqueda por voz semántica en el histórico.
              </div>
              <div className={styles.cOut}><b>+90% notas</b><br />capturadas</div>
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
                __html: "¿Tu equipo tiene <em>las manos en el trabajo</em>?",
              }}
            />
            <p className={styles.lead}>
              Una conversación de 30 minutos. Si tu gente registra mal o no registra,
              probablemente FMTA—VOZ encaje.
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
            <div className={styles.row}><span>producto</span><span>FMTA—VOZ</span></div>
            <div className={styles.row}><span>despliegue</span><span>~ 4 semanas</span></div>
            <div className={styles.row}><span>idiomas</span><span>CA · ES · EN</span></div>
            <div className={styles.row}><span>modo</span><span>offline-first</span></div>
            <div className={styles.row}><span>desde</span><span>2025 — en producción</span></div>
          </div>
        </div>
      </section>
      </main>

      <ProductFooter code="VOZ" clients="4 clientes" />
      <ProductEffects />
    </ProductShell>
  );
}
