import type { Metadata } from "next";
import Link from "next/link";

import { DropOrnament } from "@/components/landing/DropOrnament";
import {
  ProductEffects,
  ProductFooter,
  ProductHud,
  ProductShell,
} from "@/components/landing/ProductLayoutShell";
import { StockChart } from "@/components/landing/StockChart";
import styles from "@/styles/productos.module.css";

export const metadata: Metadata = {
  title: "FMTA—STOCK · Stock que se anticipa · ForMeta",
  description:
    "El sistema entiende patrones de consumo y actúa antes de que llegue el umbral. 3 clientes activos · 40 → 3 min/día.",
};

export default function StockPage() {
  return (
    <ProductShell>
      <ProductHud code="STOCK" />

      <main id="main" tabIndex={-1}>
      {/* HERO */}
      <section className={`${styles.section} ${styles.prodHero}`}>
        <div className={styles.prodHeroInner}>
          <div className={styles.prodEyebrow}>
            <span className={styles.ridge} />
            <span>Producto 01 · IApp · en producción</span>
          </div>
          <div className={styles.prodCode}>FMTA—STOCK</div>
          <h1>
            <em>Stock</em>
            <br />
            que se anticipa.
          </h1>
          <p className={styles.lead}>
            Tu inventario deja de avisar y empieza a actuar. El sistema aprende los
            patrones de tu negocio y se adelanta a la rotura.
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
            <div className={styles.sp}><span>{"// integraciones"}</span><b>Holded · Odoo · custom ERP</b></div>
            <div className={styles.sp}><span>{"// despliegue"}</span><b className={styles.accent}>~ 6 semanas</b></div>
            <div className={styles.sp}><span>{"// reducción"}</span><b className={styles.accent}>40 → 3 min/día</b></div>
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
                  __html: "Tu stock <em>te llama</em> tarde, o no te llama.",
                }}
              />
            </div>
            <div className={styles.body}>
              <p>
                El sistema clásico te avisa <strong>cuando la cifra cruza un umbral</strong>.
                Pero el umbral lo pusiste tú a ojo, hace tres años, en un Excel que ya
                nadie abre. Y el proveedor tarda lo que tarda.
              </p>
              <p>
                Mientras tanto, el responsable de almacén está cuadrando cifras a las 8
                de la noche, el comercial promete fechas que no se cumplen, y el cliente
                lo escucha en el tono de voz.
              </p>
              <div className={styles.painList}>
                <div className={styles.painItem}>
                  <span className={styles.pn}>01 ·</span>
                  <span className={styles.pt}>
                    <b>40 min/día</b> revisando hojas, pasando pedidos manualmente,
                    cruzando entre sistemas.
                  </span>
                </div>
                <div className={styles.painItem}>
                  <span className={styles.pn}>02 ·</span>
                  <span className={styles.pt}>
                    <b>2-3 roturas/mes</b> por SKUs que nadie tenía en el radar.
                  </span>
                </div>
                <div className={styles.painItem}>
                  <span className={styles.pn}>03 ·</span>
                  <span className={styles.pt}>
                    <b>Sobrestock</b> en lo que se cree que rota — y polvo en lo que no.
                  </span>
                </div>
                <div className={styles.painItem}>
                  <span className={styles.pn}>04 ·</span>
                  <span className={styles.pt}>
                    <b>Decisiones</b> basadas en intuición, no en patrón.
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
              __html: "El sistema <em>entiende</em>. El sistema <em>actúa</em>.",
            }}
          />
          <div className={styles.solSteps}>
            <div className={styles.solStep}>
              <div className={styles.stepTag}>paso 01</div>
              <h3>Escucha tu historia</h3>
              <p>
                Conectamos a tu ERP, tu TPV, tus albaranes — donde estén. El sistema lee
                18-24 meses de movimiento real para entender cómo respira tu negocio.
              </p>
              <div className={styles.stepMeta}>~ 2 semanas · una sola integración por canal</div>
            </div>
            <div className={styles.solStep}>
              <div className={styles.stepTag}>paso 02</div>
              <h3>Aprende patrones</h3>
              <p>
                No reglas. Patrones. Estacionalidad, días de la semana, eventos locales,
                picos promocionales. Para cada SKU, una historia propia.
              </p>
              <div className={styles.stepMeta}>modelo por familia + por SKU · re-entrena cada noche</div>
            </div>
            <div className={styles.solStep}>
              <div className={styles.stepTag}>paso 03</div>
              <h3>Decide y ejecuta</h3>
              <p>
                Crea el pedido al proveedor antes de que llegue el umbral. Te lo deja en
                revisión, o lo manda solo si tú quieres. Tú decides el grado de autonomía.
              </p>
              <div className={styles.stepMeta}>aprobación manual · semi-auto · full-auto</div>
            </div>
          </div>

          <StockChart />
        </div>
      </section>

      {/* MÉTRICAS */}
      <section className={`${styles.section} ${styles.metrics}`} id="metricas">
        <div className={styles.metricsInner}>
          <div className={styles.sectionTag}>03 · métricas</div>
          <div className={styles.metricsHead}>
            <h2
              dangerouslySetInnerHTML={{
                __html: "Lo que cambia <em>en el día a día</em>.",
              }}
            />
            <div className={styles.meta}>
              <div>media 3 clientes · 12 meses</div>
              <div><b>· 2025 — 2026</b></div>
            </div>
          </div>
          <div className={styles.metricsGrid}>
            <div className={styles.metric}>
              <div className={styles.mKey}>tiempo gestión</div>
              <div className={styles.mBig}>
                <em data-count data-value="3" data-decimals="0" data-duration="1200">0</em>
                <sup>min/día</sup>
              </div>
              <div className={styles.mNote}>antes: 40 min/día</div>
              <div className={styles.mTrend}>↓ 92% · liberado</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.mKey}>roturas mensuales</div>
              <div className={styles.mBig}>
                <em data-count data-value="0.3" data-decimals="1" data-duration="1400">0</em>
                <sup>SKUs/mes</sup>
              </div>
              <div className={styles.mNote}>antes: 2.4 SKUs/mes</div>
              <div className={styles.mTrend}>↓ 88% · anticipado</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.mKey}>stock muerto</div>
              <div className={styles.mBig}>
                <em data-count data-value="34" data-decimals="0" data-duration="1600">0</em>
                <sup>%</sup>
              </div>
              <div className={styles.mNote}>reducción tras 4 meses</div>
              <div className={styles.mTrend}>↓ liberación de capital</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.mKey}>precisión predicción</div>
              <div className={styles.mBig}>
                <em data-count data-value="91" data-decimals="0" data-duration="1800">0</em>
                <sup>%</sup>
              </div>
              <div className={styles.mNote}>media SMAPE · 7d horizon</div>
              <div className={styles.mTrend}>↑ mejora cada semana</div>
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
              __html: "Tres negocios que ya no <em>miran el stock</em>.",
            }}
          />
          <div className={styles.casesList}>
            <div className={styles.caseRow}>
              <div className={styles.cNum}>CASO 01</div>
              <div className={styles.cWho}>Panadería · Manacor</div>
              <div className={styles.cWhat}>
                Reposición diaria de masas, harinas y producto terminado. Cuatro tiendas.
                Decisiones tomaba el encargado a las 6:00 AM, a ojo.
              </div>
              <div className={styles.cOut}><b>3 min/día</b><br />vs 45 antes</div>
            </div>
            <div className={styles.caseRow}>
              <div className={styles.cNum}>CASO 02</div>
              <div className={styles.cWho}>Bodega · Binissalem</div>
              <div className={styles.cWhat}>
                Vino para enoturismo + venta directa. Estacionalidad fuerte y picos por
                eventos. El sistema aprendió el calendario.
              </div>
              <div className={styles.cOut}><b>0 roturas</b><br />en alta temporada</div>
            </div>
            <div className={styles.caseRow}>
              <div className={styles.cNum}>CASO 03</div>
              <div className={styles.cWho}>Taller mecánico · Inca</div>
              <div className={styles.cWhat}>
                Repuestos para flota local. 4.200 SKUs. Predicción por familia, pedido
                automático a tres proveedores principales.
              </div>
              <div className={styles.cOut}><b>—34% stock</b><br />muerto en 6 meses</div>
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
                __html: "¿Tu stock te <em>está llamando</em> tarde?",
              }}
            />
            <p className={styles.lead}>
              Una conversación de 30 minutos. Te decimos si encaja antes de empezar nada
              — y si no encaja, también es información útil.
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
            <div className={styles.row}><span>producto</span><span>FMTA—STOCK</span></div>
            <div className={styles.row}><span>despliegue</span><span>~ 6 semanas</span></div>
            <div className={styles.row}><span>integra</span><span>tu ERP actual</span></div>
            <div className={styles.row}><span>cliente nº</span><span>4 · plaza disponible</span></div>
            <div className={styles.row}><span>desde</span><span>2025 — en producción</span></div>
          </div>
        </div>
      </section>
      </main>

      <ProductFooter code="STOCK" clients="3 clientes" />
      <ProductEffects />
    </ProductShell>
  );
}
