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
  title: "FMTA—CORE · El sistema operativo de tu equipo · ForMeta",
  description:
    "Wiki, tickets, inventario, tareas y ubicaciones en un solo lugar — con una IA que conecta todo y sabe el contexto antes de que se lo expliques.",
};

export default function CorePage() {
  return (
    <ProductShell accent="core">
      <ProductHud code="CORE" />

      <main id="main" tabIndex={-1}>
        {/* HERO */}
        <section className={`${styles.section} ${styles.prodHero}`}>
          <div className={styles.prodHeroInner}>
            <div className={styles.prodEyebrow}>
              <span className={styles.ridge} />
              <span>Producto 03 · IApp · operación interna</span>
            </div>
            <div className={styles.prodCode}>FMTA—CORE</div>
            <h1>
              El sistema operativo
              <br />
              <em>de tu equipo.</em>
            </h1>
            <p className={styles.lead}>
              Wiki, tickets, inventario, tareas y ubicaciones en un solo lugar —
              con una IA que conecta todo y sabe el contexto antes de que se lo
              expliques.
            </p>
            <div className={styles.actions}>
              <a href="#solucion" className={`${styles.btn} ${styles.btnAccent} magnetic`}>
                <span>Ver cómo funciona</span>
                <span className={styles.btnArrow}>↓</span>
              </a>
              <Link href="/contacto" className={`${styles.btn} ${styles.btnGhost} magnetic`}>
                <span>Hablar con nosotros</span>
                <span className={styles.btnArrow}>→</span>
              </Link>
            </div>
            <div className={styles.heroSpec}>
              <div className={styles.sp}><span>{"// módulos"}</span><b>wiki · tickets · inventario · tareas · ubicaciones</b></div>
              <div className={styles.sp}><span>{"// IA"}</span><b>contextual · busca · resume · sugiere</b></div>
              <div className={styles.sp}><span>{"// equipo objetivo"}</span><b className={styles.accent}>5–80 personas</b></div>
              <div className={styles.sp}><span>{"// despliegue"}</span><b className={styles.accent}>~ 4 semanas</b></div>
            </div>

            <div className={styles.galleryHero}>
              <ImagePlaceholder
                slot="HERO 01"
                kind="screenshot"
                caption="Dashboard CORE · resumen de equipo, tickets activos y búsqueda IA"
                ratio="16/9"
                size="2400×1350 px · @2×"
                hint="Captura del home: lateral con módulos (Wiki, Tickets, Inventario, Tareas, Ubicaciones), centro con resumen IA del día, derecha con actividad reciente. Tema light + acento terra."
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
                    __html: "Cinco apps. <em>Cero contexto</em>. Una sola persona que lo sabe todo.",
                  }}
                />
              </div>
              <div className={styles.body}>
                <p>
                  La wiki está en Notion. Los tickets en Zendesk. El inventario en
                  un Excel compartido. Las tareas en Trello. Las ubicaciones en la
                  cabeza del responsable.{" "}
                  <strong>Nadie ve la foto completa</strong> — y cuando alguien
                  pregunta, hay que abrir 4 pestañas.
                </p>
                <p>
                  Para colmo, cada herramienta cobra por usuario, vive en su silo
                  y reinventa el inicio de sesión. La IA &quot;integrada&quot; de cada
                  una busca solo dentro de sí misma. El equipo termina preguntando
                  en Slack lo que ya está documentado tres veces.
                </p>
                <div className={styles.painList}>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>01 ·</span>
                    <span className={styles.pt}><b>4-6 herramientas</b> que no se hablan entre ellas.</span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>02 ·</span>
                    <span className={styles.pt}><b>Conocimiento</b> repetido y desactualizado en cada silo.</span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>03 ·</span>
                    <span className={styles.pt}><b>Onboarding</b> que depende de un humano disponible.</span>
                  </div>
                  <div className={styles.painItem}>
                    <span className={styles.pn}>04 ·</span>
                    <span className={styles.pt}><b>Coste</b> SaaS creciente por usuario, por módulo, por extra.</span>
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
                __html: "Un solo sistema. Una <em>IA que ya sabe</em> de qué hablas.",
              }}
            />
            <div className={styles.solSteps}>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 01</div>
                <h3>Unificamos los módulos</h3>
                <p>
                  Wiki, tickets, tareas, inventario y ubicaciones — diseñados para
                  hablarse entre ellos desde el primer minuto. Un ticket conoce el
                  artículo de wiki, el artículo conoce el SKU, el SKU conoce su
                  ubicación.
                </p>
                <div className={styles.stepMeta}>modelo de datos compartido · permisos finos</div>
              </div>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 02</div>
                <h3>IA contextual</h3>
                <p>
                  Una caja de búsqueda IA que ve todo a la vez. Pregúntale en
                  lenguaje natural y te responde con cita: &quot;según la wiki v3 y
                  ticket #423, la respuesta es&quot;. Aprende de tu equipo cada
                  semana.
                </p>
                <div className={styles.stepMeta}>RAG · embeddings · citation-first</div>
              </div>
              <div className={styles.solStep}>
                <div className={styles.stepTag}>paso 03</div>
                <h3>Crece contigo</h3>
                <p>
                  Empieza con wiki y tickets. Añade inventario cuando lo
                  necesites. Cada módulo es opcional y se integra sin migración.
                  El precio es por organización, no por usuario.
                </p>
                <div className={styles.stepMeta}>modular · precio fijo · sin per-seat</div>
              </div>
            </div>

            <div className={`${styles.gallery} ${styles.gallery2}`}>
              <ImagePlaceholder
                slot="UI 01"
                kind="screenshot"
                caption="Wiki · artículo con backlinks a tickets, SKUs y tareas relacionadas"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Vista de un artículo de wiki con cuerpo principal y, lateral, panel de menciones cruzadas: tickets, items inventario, tareas. Tipografía editorial."
              />
              <ImagePlaceholder
                slot="UI 02"
                kind="screenshot"
                caption="Búsqueda IA · respuesta con citas a wiki + tickets + inventario"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Resultado de búsqueda IA con respuesta sintética arriba, fuentes citadas debajo (tarjetas con título + fragmento), barra de búsqueda fija arriba."
              />
            </div>
          </div>
        </section>

        {/* DETALLE — módulos */}
        <section className={`${styles.section} ${styles.detail}`} id="modulos">
          <div className={styles.detailInner}>
            <div className={styles.sectionTag}>03 · módulos</div>
            <h2
              dangerouslySetInnerHTML={{
                __html: "Cinco módulos. <em>Un solo contexto</em>.",
              }}
            />

            <div className={styles.detailBlock}>
              <div>
                <div className={styles.detailKicker}>módulo · wiki</div>
                <h3>
                  Conocimiento que <em>se actualiza solo</em> cuando algo cambia.
                </h3>
                <p>
                  Editor por bloques tipo Notion, pero conectado al resto del
                  sistema. Cuando un ticket se cierra de forma repetida, CORE
                  sugiere actualizar la wiki. Cuando una persona se va, su
                  conocimiento sigue accesible.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Editor</b> bloques · markdown · embeds</li>
                  <li><b>Versionado</b> automático con diff legible</li>
                  <li><b>Sugerencias IA</b> a partir de tickets repetidos</li>
                  <li><b>Permisos</b> por equipo, por carpeta, por bloque</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="UI 03"
                kind="screenshot"
                caption="Wiki editor · bloques editoriales + sugerencia IA en margen"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Editor tipo Notion con bloques, comentarios en margen y, lateral, sugerencia IA: aplicar/descartar/ver fuente."
              />
            </div>

            <div className={`${styles.detailBlock} ${styles.detailFlip}`}>
              <div>
                <div className={styles.detailKicker}>módulo · tickets</div>
                <h3>
                  Tickets que <em>saben buscar su respuesta</em>.
                </h3>
                <p>
                  Cuando entra un ticket, la IA busca en wiki, tickets pasados y
                  KB de proveedor. Te muestra la propuesta antes de que abras el
                  caso. Tú apruebas, editas o descartas — y la IA aprende.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Cola</b> con SLA por contrato y prioridad por contexto</li>
                  <li><b>Respuesta IA</b> con cita y nivel de confianza</li>
                  <li><b>Plantillas vivas</b> que mejoran al cerrar casos</li>
                  <li><b>Multi-canal</b> · email, web, WhatsApp, voz</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="UI 04"
                kind="screenshot"
                caption="Ticket · IA propone respuesta con cita a wiki/historial"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Detalle de ticket con hilo a la izquierda y, derecha, panel IA con propuesta de respuesta, fuentes citadas y botón aprobar."
              />
            </div>

            <div className={styles.detailBlock}>
              <div>
                <div className={styles.detailKicker}>módulo · inventario + ubicaciones</div>
                <h3>
                  Cada SKU sabe <em>dónde está y cuánto queda</em>. En tiempo real.
                </h3>
                <p>
                  Inventario por estantería, vehículo, almacén. Movimientos vía
                  QR/voz. Las ubicaciones son árbol (almacén → pasillo →
                  estantería → balda) o mapa (oficinas, locales, flota). La wiki
                  de cada item enlaza directo.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>QR + voz</b> para movimiento sin teclado</li>
                  <li><b>Ubicaciones</b> jerárquicas o geográficas</li>
                  <li><b>Alertas</b> de mínimo, caducidad, mantenimiento</li>
                  <li><b>Integración</b> con Holded, Odoo, A3, ERPs custom</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="UI 05"
                kind="screenshot"
                caption="Inventario · ficha SKU con ubicaciones, tareas y wiki vinculada"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Ficha de SKU: foto a la izquierda, datos en el centro (stock por ubicación, lote, próximo movimiento), enlaces a tickets/wiki a la derecha."
              />
            </div>

            <div className={`${styles.detailBlock} ${styles.detailFlip}`}>
              <div>
                <div className={styles.detailKicker}>módulo · tareas</div>
                <h3>
                  Tareas <em>que se asignan solas</em> cuando algo se activa.
                </h3>
                <p>
                  Una incidencia abre una tarea. Un mínimo de stock dispara un
                  pedido. Una nueva contratación lanza el onboarding. CORE
                  conecta los disparadores sin que tengas que diseñar BPMN.
                </p>
                <ul className={styles.bulletCheck}>
                  <li><b>Asignación</b> por carga, rol o turno</li>
                  <li><b>Disparadores</b> desde tickets, inventario, calendario</li>
                  <li><b>Vista Kanban + tabla + timeline</b> según preferencia</li>
                  <li><b>Recurrentes</b> sin necesidad de cron casero</li>
                </ul>
              </div>
              <ImagePlaceholder
                slot="UI 06"
                kind="screenshot"
                caption="Tareas · Kanban con tarjetas vinculadas a tickets e inventario"
                ratio="4/3"
                size="1600×1200 px · @2×"
                hint="Tablero Kanban con columnas (todo · en curso · revisión · hecho) y tarjetas con badges que indican origen (ticket #, SKU, calendario)."
              />
            </div>

            <div className={styles.pillRow}>
              <span className={styles.pill}>auth <b>SSO · SCIM</b></span>
              <span className={styles.pill}>idiomas <b>ES · CA · EN</b></span>
              <span className={styles.pill}>hosting <b>cloud · on-prem</b></span>
              <span className={styles.pill}>precio <b>por organización</b></span>
              <span className={styles.pill}>API <b>REST + GraphQL</b></span>
              <span className={styles.pill}>backup <b>diario · 30 días</b></span>
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
                  __html: "Lo que cambia <em>cuando todo vive en un sitio</em>.",
                }}
              />
              <div className={styles.meta}>
                <div>media 4 clientes · 10 meses</div>
                <div><b>· 2025 — 2026</b></div>
              </div>
            </div>
            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <div className={styles.mKey}>preguntas en Slack</div>
                <div className={styles.mBig}>
                  <em data-count data-value="68" data-decimals="0" data-duration="1200">0</em>
                  <sup>% -</sup>
                </div>
                <div className={styles.mNote}>internas repetidas</div>
                <div className={styles.mTrend}>↓ IA contextual responde</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>onboarding</div>
                <div className={styles.mBig}>
                  <em data-count data-value="3" data-decimals="0" data-duration="1400">0</em>
                  <sup>días</sup>
                </div>
                <div className={styles.mNote}>antes: 3 semanas</div>
                <div className={styles.mTrend}>↓ wiki conectada</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>SaaS sustituidos</div>
                <div className={styles.mBig}>
                  <em data-count data-value="5" data-decimals="0" data-duration="1600">0</em>
                  <sup>apps</sup>
                </div>
                <div className={styles.mNote}>media por cliente</div>
                <div className={styles.mTrend}>↓ coste recurrente</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.mKey}>tickets auto-resueltos</div>
                <div className={styles.mBig}>
                  <em data-count data-value="46" data-decimals="0" data-duration="1800">0</em>
                  <sup>%</sup>
                </div>
                <div className={styles.mNote}>con cita verificable</div>
                <div className={styles.mTrend}>↑ confianza humana</div>
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
                __html: "Equipos que <em>ya no abren 6 pestañas</em>.",
              }}
            />
            <div className={styles.casesList}>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 01</div>
                <div className={styles.cWho}>Despacho · Palma</div>
                <div className={styles.cWhat}>
                  12 personas. Sustituyeron Notion + Zendesk + Trello. Wiki y
                  tickets conectados, búsqueda IA con cita legal en cada
                  respuesta.
                </div>
                <div className={styles.cOut}><b>−5 SaaS</b><br />en 6 semanas</div>
              </div>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 02</div>
                <div className={styles.cWho}>Taller mecánico · Inca</div>
                <div className={styles.cWhat}>
                  Inventario por bahía + wiki técnica por modelo. Voz para
                  movimientos. Tickets de cliente con respuesta IA citando
                  manual.
                </div>
                <div className={styles.cOut}><b>3 días</b><br />onboarding técnico</div>
              </div>
              <div className={styles.caseRow}>
                <div className={styles.cNum}>CASO 03</div>
                <div className={styles.cWho}>Distribuidora · Manacor</div>
                <div className={styles.cWhat}>
                  40 personas, 3 almacenes, flota de furgonetas. CORE como única
                  fuente de verdad para wiki, stock, tareas y ubicaciones móviles.
                </div>
                <div className={styles.cOut}><b>46% tickets</b><br />resueltos solos</div>
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
                  __html: "¿Tu equipo <em>abre 5 apps</em> para hacer una pregunta?",
                }}
              />
              <p className={styles.lead}>
                Una conversación de 30 minutos. Si la información existe pero
                nadie la encuentra, probablemente FMTA—CORE encaje.
              </p>
              <div className={styles.ctaActions}>
                <Link href="/contacto" className={`${styles.btn} ${styles.btnAccent}`}>
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
              <div className={styles.row}><span>producto</span><span>FMTA—CORE</span></div>
              <div className={styles.row}><span>despliegue</span><span>~ 4 semanas</span></div>
              <div className={styles.row}><span>módulos</span><span>5 · opcionales</span></div>
              <div className={styles.row}><span>precio</span><span>por organización</span></div>
              <div className={styles.row}><span>hosting</span><span>cloud · on-prem</span></div>
              <div className={styles.row}><span>desde</span><span>2025 — en producción</span></div>
            </div>
          </div>
        </section>
      </main>

      <ProductFooter code="CORE" clients="4 equipos" />
      <ProductEffects />
    </ProductShell>
  );
}
