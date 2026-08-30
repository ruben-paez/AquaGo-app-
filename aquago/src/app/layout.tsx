import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Manrope, Sora } from "next/font/google";
import SessionBridge from "@/components/SessionBridge";
import DemoBar from "@/components/DemoBar";
import { getSessionToken } from "@/lib/auth";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AquaGo — Bidones de 20 L a domicilio en Encarnación",
  description:
    "Pedí tu recarga de bidón 20 L de AQUAnat, pagá en efectivo o por transferencia y seguí el reparto en el mapa.",
  applicationName: "AquaGo",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Permite instalarla en iOS desde "Agregar a inicio" y abrirla sin barra.
  appleWebApp: {
    capable: true,
    title: "AquaGo",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: "#105c88",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // El servidor le pasa al cliente el mismo token con el que renderizó esta
  // página. Sin esto, si el navegador bloquea las cookies y la URL pierde el
  // parámetro `?s=`, el cliente se queda sin sesión y los pedidos salían con
  // "Debes iniciar sesión para pedir" aunque la pantalla se viera logueada.
  const token = await getSessionToken();

  return (
    <html lang="es" className={`${manrope.variable} ${sora.variable}`}>
      <head>
        {token && <meta name="aquago-session" content={token} />}
      </head>
      <body className="min-h-dvh">
        <SessionBridge />
        <DemoBar />
        {children}
      </body>
    </html>
  );
}
