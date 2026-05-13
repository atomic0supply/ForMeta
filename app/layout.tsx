import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://formeta.es"),
  title: "ForMeta — Sistemas digitales con precisión editorial",
  description:
    "ForMeta diseña software a medida, sistemas AI-first e infraestructura sobria para organizaciones que necesitan claridad, criterio y ejecución precisa.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "ForMeta",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "ForMeta",
    description:
      "Sistemas digitales con precisión editorial, arquitectura sobria e inteligencia aplicada.",
    url: "https://formeta.es",
    siteName: "ForMeta",
    locale: "es_ES",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#2C2C28",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body><div className="page-shell">{children}</div></body>
    </html>
  );
}
