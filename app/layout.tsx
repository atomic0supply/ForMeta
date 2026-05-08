import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://formeta.es"),
  title: "ForMeta — Sistemas digitales con precisión editorial",
  description:
    "ForMeta diseña software a medida, sistemas AI-first e infraestructura sobria para organizaciones que necesitan claridad, criterio y ejecución precisa.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2C2C28" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ForMeta" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body><div className="page-shell">{children}</div></body>
    </html>
  );
}
