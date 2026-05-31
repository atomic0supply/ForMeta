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
  title: "FMTA—LUMEN · Tótems que iluminan la calle · ForMeta",
  description:
    "Tótems de información y animación para hostelería y comercio físico. Presencia de marca activa, dinámica e inteligente en el espacio físico.",
};

export default function LumenPage() {
  return (
    <ProductShell>
      <ProductHud code="LUMEN" />

      <main id="main" tabIndex={-1}>
        {/* HERO */}
        <section className={`${styles.section} ${styles.prodHero}`}>
          <div className={styles.prodHeroInner}>
            <div className={styles.prodEyebrow}>
              <span className={styles.ridge} />
              <span>Producto 02 · IApp · presencia física</span>
            </div>
            <div className={styles.prodCode}>FMTA—LUMEN</div>
            <h1>
              Tu negocio <em>habla</em>
              <br />
              sin que abras la boca.
            </h1>
            <p className={styles.lead}>
              Tótems de información y animación para hostelería y comercio físico.
              Presencia de marca activa, dinámica e inteligente en el espacio
              físico — sin pegar pósters, sin imprimir nada.
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
              <div className={styles.sp}><span>{"// formato"}</span><b>vertical 43&quot; · 55&quot; · 65&quot;</b></div>
              <div className={styles.sp}><span>{"// contenido"}</span><b>dinámico · por hora · por evento</b></div>
              <div className={styles.sp}><span>{"// control"}</span><b className={styles.accent}>remoto desde móvil</b></div>
              <div className={styles.sp}><span>{"// arranque"}</span><b className={styles.accent}>llave en mano</b></div>
            </div>

            <div className={styles.galleryHero}>
              <ImagePlaceholder
                slot="HERO 01"
                kind="photo"
                caption="Tótem LUMEN instalado en la entrada de un restaurante · golden hour"
                ratio="16/9"
                size="2400×1350 px · @2×"
                hint="Foto de un tótem vertical 55&quot; en la fachada o entrada de un local hostelero, con animación de marca + carta del día visible. Ambiente cálido."
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
                    __html: "La calle <em>te mira</em>. Tu marca no le contesta.",
                  }}
                />
              </div>
              <div className={styles.body}>
                <p>
                  En hostelería y comercio físico, el escaparate sigue siendo
                  pizarra de café, hoja A4 plastificada o un cartel que se cambió
                  hace tres meses. <strong>La marca está muerta en la fachada</strong>{" "}
                  mientras compite con bares y tiendas que sí experimentan.
                </p>
                <p>
                  Cuando intentas digitalizar, te venden pantallas con software
                  rígido, hosteado fuera, en inglés y con interfaz de aeropuerto.
                  Acabas pidiéndole al cuñado que te edite un PowerPoint y
                  reiniciando el aparato cada lunes.
                </p>
                <div className={styles.painList}>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>01 ·</span>
                    <span className={styles.pt}><b>Cartelería</b> impresa que envejece en 3 días.</span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>02 ·</span>
                    <span className={styles.pt}><b>Software CMS</b> diseñado para cadenas, no para barrios.</span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>03 ·</span>
                    <span className={styles.pt}><b>Pantallas</b> que se ven como un PowerPoint estropeado.</span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>04 ·</span>
                    <span className={styles.pt}><b>Ninguna identidad</b> de marca real en el espacio físico.</span>
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
                __html: "Un tótem que <em>se programa solo</em>. Y se ve como tu marca.",
              }}
            />
            <div className={styles.solSteps}>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 01</div>
                <h3>Hardware editorial</h3>
                <p>
                  Tótem vertical en metal y vidrio. Pantalla 4K mate, anti-reflejo,
                  visible bajo sol. Sin ventiladores, sin cables visibles. Diseñado
                  para integrarse con la fachada — no para ser un cartel digital
                  más.
                </p>
                <div className={styles.stepMeta}>43&quot; · 55&quot; · 65&quot; · indoor + outdoor IP65</div>
              </div>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 02</div>
                <h3>Contenido vivo</h3>
                <p>
                  Animaciones de marca, menú del día, eventos, redes sociales,
                  reseñas. El sistema sabe qué hora es, qué tiempo hace, qué pasa
                  en tu calle y compone la pantalla en consecuencia.
                </p>
                <div className={styles.stepMeta}>plantillas brand · IA generativa · datos en vivo</div>
              </div>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 03</div>
                <h3>Control desde el móvil</h3>
                <p>
                  Cambias el menú desde la cocina. Subes una historia desde tu
                  Instagram. Programas la promoción de las 19h sin tocar el tótem.
                  Si algo falla, te avisamos y resolvemos en remoto.
                </p>
                <div className={styles.stepMeta}>app móvil · web · soporte gestionado</div>
              </div>
            </div>

            <div className={`${styles.gallery} ${styles.gallery3}`}>
              <ImagePlaceholder
                slot="MOCKUP 01"
                kind="mockup"
                caption="Tótem indoor · restaurante · animación de marca + carta"
                ratio="9/16"
                size="1080×1920 px · @2× (formato vertical)"
                hint="Mockup 3D de un tótem 55&quot; vertical con animación tipográfica de la marca arriba y la carta del día abajo. Vista frontal, fondo neutro."
              />
              <ImagePlaceholder
                slot="MOCKUP 02"
                kind="mockup"
                caption="Tótem outdoor · comercio · escaparate dinámico"
                ratio="9/16"
                size="1080×1920 px · @2× (formato vertical)"
                hint="Tótem 65&quot; outdoor en la entrada de una tienda mostrando producto destacado con movimiento sutil. Brillo alto, anti-reflejo evidente."
              />
              <ImagePlaceholder
                slot="MOCKUP 03"
                kind="mockup"
                caption="Tótem hotel · recepción · información huésped + ambiente"
                ratio="9/16"
                size="1080×1920 px · @2× (formato vertical)"
                hint="Tótem 43&quot; en recepción de hotel con bienvenida personalizada por turno, info de actividades del día y meteo local. Ambiente cálido."
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
                __html: "Diseñado para <em>la calle real</em>. Pensado para tu marca.",
              }}
            />

            <div className={styles.detailBlock}>
              <div>
                <div className={styles.detailKicker}>diseño · contenido</div>
                <h3>
                  Tu marca, en movimiento. <em>Sin abrir Photoshop</em>.
                </h3>
                <p>
                  Diseñamos contigo el sistema de plantillas: tipografía, colores,
                  animaciones de marca. Después tú solo eliges qué quieres mostrar
                  — el contenido se compone solo respetando la identidad.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Brand kit</b> propio · animaciones personalizadas</li>
                  <li><b>Plantillas</b> por tipo de contenido (oferta, evento, info)</li>
                  <li><b>Generación IA</b> de imágenes y vídeos en estilo marca</li>
                  <li><b>Carrusel inteligente</b> que cambia según hora y afluencia</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="UI 01"
                kind="screenshot"
                caption="App control · selección de plantilla y previsualización en vivo"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Interfaz móvil con previsualización del tótem en vivo, librería de plantillas a la derecha y botón programar abajo. Aspecto editorial, no SaaS."
              />
            </div>

            <div className={`${styles.detailBlock} ${styles.detailFlip}`}>
              <div>
                <div className={styles.detailKicker}>contexto · automatización</div>
                <h3>
                  Sabe <em>qué pasa fuera</em>. Reacciona dentro.
                </h3>
                <p>
                  LUMEN lee tu calendario, el tiempo, el tráfico de la calle, los
                  eventos cercanos. A las 19h saca la promoción de aperitivo. Si
                  llueve, muestra la carta de calientes. Si hay partido, modo
                  pre-evento.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Triggers</b> por hora, clima, evento, ocupación</li>
                  <li><b>A/B</b> automático entre creatividades</li>
                  <li><b>Integraciones</b> POS, reservas, Instagram, Spotify</li>
                  <li><b>Modo evento</b> con countdown y energía propia</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="DIAGRAM 02"
                kind="diagram"
                caption="Diagrama · señales de entrada → triggers → composición pantalla"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Diagrama editorial: a la izquierda señales (clima, hora, calendario, POS), al centro motor de reglas, a la derecha tótem con la pieza compuesta."
              />
            </div>

            <div className={styles.detailBlock}>
              <div>
                <div className={styles.detailKicker}>servicio · operación</div>
                <h3>
                  Llave en mano. <em>Soporte gestionado</em>.
                </h3>
                <p>
                  Instalamos el tótem, lo configuramos, te formamos. Si algo
                  falla, lo vemos antes que tú y te avisamos. Sustitución del
                  hardware incluida en cuota mensual. Sin contrato a 5 años.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Monitoring 24/7</b> de cada tótem · health checks</li>
                  <li><b>Substitución</b> de hardware en &lt;48h en Baleares</li>
                  <li><b>Onboarding</b> de tu equipo en 2h</li>
                  <li><b>Sin contrato</b> a largo plazo · prueba 60 días</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="PHOTO 03"
                kind="photo"
                caption="Instalación · técnico ForMeta colocando un tótem en local hostelero"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Foto documental: técnico instalando el tótem en la entrada de un bar o tienda. Persona enfocada, marca discreta, ambiente real."
              />
            </div>

            <div className={styles.pillRow}>
              <span className={styles.pill}>resolución <b>4K UHD</b></span>
              <span className={styles.pill}>brillo <b>700-2500 nits</b></span>
              <span className={styles.pill}>outdoor <b>IP65</b></span>
              <span className={styles.pill}>conectividad <b>4G + Wi-Fi</b></span>
              <span className={styles.pill}>medida <b>43&quot; · 55&quot; · 65&quot;</b></span>
              <span className={styles.pill}>consumo <b>~180W medio</b></span>
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
                  __html: "Lo que cambia <em>cuando la fachada respira</em>.",
                }}
              />
              <div className={styles.meta}>
                <div>media 6 instalaciones · 8 meses</div>
                <div><b>· 2025 — 2026</b></div>
              </div>
            </div>
            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <div className={styles.mKey}>tráfico de paso</div>
                <div className={styles.mBig}>
                  <em data-count data-value="34" data-decimals="0" data-duration="1200">0</em>
                  <sup>% +</sup>
                </div>
                <div className={styles.mNote}>medido por contador en puerta</div>
                <div className={styles.mTrend}>↑ más atención en calle</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>conversión escaparate</div>
                <div className={styles.mBig}>
                  <em data-count data-value="22" data-decimals="0" data-duration="1400">0</em>
                  <sup>% +</sup>
                </div>
                <div className={styles.mNote}>visita → cliente sentado/compra</div>
                <div className={styles.mTrend}>↑ promesa visible</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>coste cartelería</div>
                <div className={styles.mBig}>
                  <em data-count data-value="0" data-decimals="0" data-duration="1600">0</em>
                  <sup>€/mes</sup>
                </div>
                <div className={styles.mNote}>impresión externalizada · cero</div>
                <div className={styles.mTrend}>↓ 100% papel eliminado</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>tiempo de cambio</div>
                <div className={styles.mBig}>
                  <em data-count data-value="20" data-decimals="0" data-duration="1800">0</em>
                  <sup>seg</sup>
                </div>
                <div className={styles.mNote}>de móvil a tótem en directo</div>
                <div className={styles.mTrend}>↓ vs 3 días impresión</div>
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
                __html: "Locales que <em>iluminan la calle</em> con su marca.",
              }}
            />
            <div className={styles.casesList}>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 01</div>
                <div className={styles.cWho}>Restaurante · Palma</div>
                <div className={styles.cWhat}>
                  Tótem 55&quot; en entrada, vinculado al POS para mostrar carta
                  del día y promoción de aperitivo automática a las 19h.
                </div>
                <div className={styles.cOut}><b>+34% tráfico</b><br />de paso</div>
              </div>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 02</div>
                <div className={styles.cWho}>Tienda boutique · Sóller</div>
                <div className={styles.cWhat}>
                  Tótem 65&quot; outdoor en escaparate. Animaciones de producto
                  generadas en estilo marca, rotando según hora y temperatura.
                </div>
                <div className={styles.cOut}><b>+22% conversión</b><br />escaparate → tienda</div>
              </div>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 03</div>
                <div className={styles.cWho}>Hotel boutique · Deià</div>
                <div className={styles.cWhat}>
                  Dos tótems 43&quot; en recepción y zona común. Bienvenida por
                  turno, programa del día y meteo local en tiempo real.
                </div>
                <div className={styles.cOut}><b>0 cartelería</b><br />impresa este año</div>
              </div>
            </div>

            <ImagePlaceholder
              slot="HERO 02"
              kind="photo"
              caption="Tótems LUMEN en operación · 3 ubicaciones reales · golden hour"
              ratio="21/9"
              size="2880×1234 px · @2×"
              hint="Foto panorámica con 3 viñetas en horizontal (restaurante, tienda, hotel) en momento dorado. Cada tótem con contenido distinto, mismo lenguaje visual."
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
                  __html: "¿Tu marca <em>vive en un A4 plastificado</em>?",
                }}
              />
              <p className={styles.lead}>
                Una conversación de 30 minutos. Si tu fachada no cuenta lo que
                eres realmente, probablemente FMTA—LUMEN encaje.
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
              <div className={styles.row}><span>producto</span><span>FMTA—LUMEN</span></div>
              <div className={styles.row}><span>formatos</span><span>43&quot; · 55&quot; · 65&quot;</span></div>
              <div className={styles.row}><span>uso</span><span>indoor + outdoor</span></div>
              <div className={styles.row}><span>servicio</span><span>llave en mano · soporte</span></div>
              <div className={styles.row}><span>prueba</span><span>60 días · plaza disponible</span></div>
              <div className={styles.row}><span>desde</span><span>2025 — en producción</span></div>
            </div>
          </div>
        </section>
      </main>

      <ProductFooter code="LUMEN" clients="6 instalaciones" />
      <ProductEffects />
    </ProductShell>
  );
}
