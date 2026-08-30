import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuración para empaquetar AquaGo como app nativa (Android / iOS).
 *
 * La app no se compila dentro del APK: el APK es un contenedor que abre la
 * versión publicada. Ventaja para esta etapa: cada cambio que subís a Vercel
 * llega al celular sin reinstalar nada.
 *
 * Antes de generar el APK, poné acá la URL real de tu despliegue.
 */
const config: CapacitorConfig = {
  appId: "py.com.aquago.app",
  appName: "AquaGo",
  webDir: "public",

  server: {
    // ⬇️ CAMBIAR por tu URL de producción (Vercel, Railway, etc.)
    url: process.env.AQUAGO_URL ?? "https://aquago.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },

  android: {
    backgroundColor: "#f2f8fc",
    allowMixedContent: false,
  },

  ios: {
    backgroundColor: "#f2f8fc",
    contentInset: "always",
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#105c88",
      showSpinner: false,
    },
  },
};

export default config;
