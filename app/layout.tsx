import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Priori™ — Transparencia Estratégica",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon", type: "image/png", sizes: "32x32" },
    ],
  },
  description:
    "Transparencia estratégica para equipos de software. Matriz de Impacto vs Esfuerzo, planificación por Quarters.",
  openGraph: {
    title: "Priori™ — Transparencia Estratégica",
    description:
      "Transparencia estratégica para equipos de software. Matriz de Impacto vs Esfuerzo, planificación por Quarters.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={GeistSans.variable}>
      <body className={GeistSans.className}>{children}</body>
    </html>
  );
}
