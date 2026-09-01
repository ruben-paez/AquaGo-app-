"use client";

import { useEffect, useState } from "react";

/**
 * Activa las notificaciones push en el dispositivo actual (si el usuario
 * está logueado y el navegador lo permite). Pide permiso una sola vez;
 * después queda registrado y silencioso.
 */
export default function PushSetup() {
  const [state, setState] = useState<"idle" | "on" | "off">("idle");
  const [showBell, setShowBell] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    let cancelled = false;

    async function setup() {
      try {
        const vapidRes = await fetch("/api/push");
        const vapid = await vapidRes.json();
        if (cancelled || !vapid.configured) return;

        const meRes = await fetch("/api/me", { cache: "no-store" });
        if (!meRes.ok || cancelled) return; // sin sesión: nada que hacer

        const permission = Notification.permission;
        if (permission === "denied") {
          setState("off");
          return;
        }
        if (permission === "default") {
          // Aún no nos dijeron: ofrecemos el botón de campanita en vez de
          // asustar con el cartel del navegador ni bien entra.
          setShowBell(true);
          return;
        }

        await subscribe(vapid.publicKey);
      } catch {
        // silencioso: las notificaciones son opcionales
      }
    }

    async function subscribe(publicKey: string) {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(publicKey),
        }));

      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (res.ok) setState("on");
    }

    void setup();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setShowBell(false);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState("off");
      return;
    }
    const vapid = await (await fetch("/api/push")).json();
    if (!vapid.configured) return;
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapid.publicKey),
      }));
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    setState("on");
  }

  if (!showBell || state === "on") return null;

  return (
    <button
      onClick={() => void enable()}
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-water-950 px-4 py-3 text-xs font-bold text-white shadow-lg ring-1 ring-white/20 transition hover:bg-water-900"
    >
      🔔 Activar avisos de pedidos
    </button>
  );
}

function urlB64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}
