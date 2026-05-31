import { AmbientBackdrop } from "@/components/landing/AmbientBackdrop";
import { ContactoSection } from "@/components/landing/ContactoSection";
import { CustomCursor } from "@/components/landing/CustomCursor";
import { FaqSection } from "@/components/landing/FaqSection";
import { FluidBackdrop } from "@/components/landing/FluidBackdrop";
import { Footer } from "@/components/landing/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { HudChrome } from "@/components/landing/HudChrome";
import { IappSection } from "@/components/landing/IappSection";
import { LandingEffects } from "@/components/landing/LandingEffects";
import { ManifiestoSection } from "@/components/landing/ManifiestoSection";
import { ProcesoSection } from "@/components/landing/ProcesoSection";
import { ProductosSection } from "@/components/landing/ProductosSection";
import { QuoteSection } from "@/components/landing/QuoteSection";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { SectionCounter } from "@/components/landing/SectionCounter";
import { SkipLink } from "@/components/landing/SkipLink";
import { StackSection } from "@/components/landing/StackSection";
import { Ticker } from "@/components/landing/Ticker";
import styles from "@/styles/landing.module.css";

const TICKER_1 = [
  "Formita — dar forma a las cosas",
  "IApp Studio",
  "Mallorca · 39.5696° N",
  "Hacer menos para hacer más",
  "AI-first · desde 2024",
  "10 clientes con nombre",
  "Sin sinergias · sin ecosistemas",
  "Sin formularios de 14 campos",
  "Conversación → software",
  "Google Cloud · Anthropic · OpenAI",
];

const TICKER_2 = [
  "FMTA—STOCK · anticipación por SKU",
  "FMTA—VOZ · manos libres",
  "FMTA—FLOW · orquestación viva",
  "40 → 3 min/día",
  "cliente nº 11 · Q3 2026",
  "soporte continuo",
  "café incluido en visita",
  "v1.0 · 2026.05.27",
];

export default function HomePage() {
  return (
    <div className={styles.root}>
      <SkipLink />
      <FluidBackdrop />
      <AmbientBackdrop />
      <ScrollProgress />
      <SectionCounter />
      <HudChrome />

      <main id="main" tabIndex={-1}>
        <HeroSection />
        <ManifiestoSection />
        <Ticker variant="dark" items={TICKER_1} />
        <IappSection />
        <ProcesoSection />
        <FaqSection />
        <Ticker variant="light" reverse items={TICKER_2} />
        <StackSection />
        <QuoteSection />
        <ProductosSection />
        <ContactoSection />
      </main>

      <Footer />

      <LandingEffects />
      <CustomCursor />
    </div>
  );
}
