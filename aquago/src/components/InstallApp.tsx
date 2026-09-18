"use client";

import { useEffect, useState } from "react";

/**
 * Botón "Instalar la app" para la portada.
 *
 * Android/Chrome: captura el evento beforeinstallprompt y al tocar el
 * botón dispara el cartel nativo de instalación (el mismo de Play Store).
 * iPhone/Safari: no existe ese evento, así que muestra una mini-guía de
 * dos toques (Compartir → Agregar a pantalla de inicio).
 * Si el usuario ya tiene la app instalada, no se muestra nada.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function esIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallApp() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    // ¿Ya la tiene instalada? (se abre sin barra del navegador)
    const nav = navigator as Navigator & { standalone?: boolean };
    if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone) {
      setInstalled(true);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault(); // evitamos el cartel automático de Chrome
      setDeferred(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function click() {
    if (deferred) {
      // Android/Chrome: cartel oficial de instalación.
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null); // el evento se usa una sola vez
    } else {
      // iPhone (o navegador sin cartel): guía de 2 toques.
      setModal(true);
    }
  }

  if (installed) return null;

  return (
    <>
      <button
        onClick={() => void click()}
        className="rounded-xl bg-[#1B9CE3] px-6 py-3.5 font-display text-base font-bold text-white shadow-pop transition hover:bg-[#3aaef0]"
      >
        📲 Instalar AquaGo
      </button>

      {modal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4"
          onClick={() => setModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-ink/10 bg-white p-6 text-left shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-lg font-bold text-ink">
              {esIOS() ? "📥 Agregala en 2 toques" : "📥 Instalala en segundos"}
            </p>

            {esIOS() ? (
              <ol className="mt-4 space-y-3 text-sm text-ink-soft">
                <li className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B9CE3] text-xs font-bold text-white">1</span>
                  Tocá el botón <strong className="text-ink">Compartir</strong> ⬆️ de abajo, en Safari.
                </li>
                <li className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B9CE3] text-xs font-bold text-white">2</span>
                  Elegí <strong className="text-ink">“Agregar a pantalla de inicio”</strong>.
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-3 text-sm text-ink-soft">
                <li className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B9CE3] text-xs font-bold text-white">1</span>
                  Tocá el menú <strong className="text-ink">⋮</strong> (arriba a la derecha).
                </li>
                <li className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B9CE3] text-xs font-bold text-white">2</span>
                  Elegí <strong className="text-ink">“Instalar app”</strong> o “Agregar a pantalla de inicio”.
                </li>
              </ol>
            )}

            <p className="mt-4 text-xs text-ink-soft">
              Te queda como una app más: con ícono propio, pantalla completa y sin ocupar espacio.
            </p>

            <button
              onClick={() => setModal(false)}
              className="mt-5 w-full rounded-xl bg-[#1B9CE3] px-4 py-3 font-display text-sm font-bold text-white transition hover:bg-[#3aaef0]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
