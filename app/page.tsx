import { BrandMark } from "@/components/BrandMark";
import { CapabilitiesGrid } from "@/components/CapabilitiesGrid";
import { ContactBlock } from "@/components/ContactBlock";
import { DotDivider } from "@/components/DotDivider";
import { FooterAccess } from "@/components/FooterAccess";
import { HeroManifesto } from "@/components/HeroManifesto";
import { LandingLoader } from "@/components/LandingLoader";
import { MethodSection } from "@/components/MethodSection";
import { ScenariosSection } from "@/components/ScenariosSection";
import { SiteHeader } from "@/components/SiteHeader";
import { StackSection } from "@/components/StackSection";
import { Reveal } from "@/components/Reveal";
import styles from "@/styles/home.module.css";

export default function HomePage() {
  return (
    <>
      <LandingLoader />
      <SiteHeader />
      <main className={styles.main}>
        <section className={styles.heroWrap} id="top">
          <div className={styles.heroBackdrop} />
          <div className={styles.heroDots} />
          <div className={styles.heroGrid}>
            <HeroManifesto />
            <div className={styles.brandColumn}>
              <Reveal className={styles.brandFrame} delay={320}>
                <BrandMark />
              </Reveal>
            </div>
          </div>
        </section>

        <Reveal as="section" className={styles.statement}>
          <div className={styles.statementIntro}>
            <p className={styles.statementLabel}>Qué hacemos</p>
            <p>
              Diseñamos software a medida, automatizaciones e inteligencia
              aplicada para empresas que ya han superado las herramientas
              genéricas y necesitan una estructura propia.
            </p>
          </div>
          <div className={styles.statementSupport}>
            <p>
              Trabajamos con pocas colaboraciones a la vez, desde el problema
              real hasta la operación, para que la solución sea legible,
              mantenible y útil desde el inicio.
            </p>
            <a href="#contacto" className={styles.statementLink}>
              Ver si encaja con vuestro caso
            </a>
          </div>
        </Reveal>

        <DotDivider accent="terracotta" />
        <MethodSection />
        <DotDivider accent="sage" />
        <CapabilitiesGrid />
        <DotDivider accent="sea" />
        <StackSection />
        <DotDivider accent="terracotta" />
        <ScenariosSection />
        <DotDivider accent="terracotta" width="lg" />
        <ContactBlock />
      </main>
      <FooterAccess />
    </>
  );
}
