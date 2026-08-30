import type { MetadataRoute } from "next";

/**
 * Manifiesto PWA: permite instalar AquaGo en el celular desde el navegador,
 * sin pasar por Play Store ni App Store. Queda con ícono propio en el
 * escritorio y se abre a pantalla completa, igual que una app nativa.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AquaGo — Bidones a domicilio",
    short_name: "AquaGo",
    description:
      "Pedí tu recarga de bidón 20 L en Encarnación. Pagá en efectivo o transferencia y seguí el reparto.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f8fc",
    theme_color: "#105c88",
    lang: "es-PY",
    categories: ["shopping", "food", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Pedir ahora", url: "/pedir" },
      { name: "Mis pedidos", url: "/mis-pedidos" },
    ],
  };
}
