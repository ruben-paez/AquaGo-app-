"use client";

import { useEffect, useState } from "react";
import {
  clearStoredToken,
  getStoredToken,
  gotoWithSession,
  setDemoRole,
  setStoredToken,
} from "@/lib/session-client";

interface Me {
  name: string;
  isAdmin: boolean;
}

const ROLES = [
  { key: "cliente", label: "Cliente", to: "/pedir" },
  { key: "repartidor", label: "Repartidor", to: "/repartidor" },
  { key: "plataforma", label: "Plataforma", to: "/admin" },
  { key: "marca", label: "Marca", to: "/admin" },
];

/**
 * Barra de acceso rápido para probar la demo sin pasar por el login,
 * pensada especialmente para cuando la app corre embebida y las cookies
 * no sobreviven.
 */
export default function DemoBar() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [demoOn, setDemoOn] = useState(false);

  useEffect(() => {
    // La barra de demos solo aparece si DEMO_MODE=on (producción va sin ella).
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDemoOn(Boolean(d?.demoMode)))
      .catch(() => setDemoOn(false));
    const token = getStoredToken();
    fetch("/api/me", {
      cache: "no-store",
      headers: token ? { "x-aquago-session": token } : undefined,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user ?? null))
      .catch(() => setMe(null));
  }, []);

  async function enter(role: (typeof ROLES)[number]) {
    setLoading(role.key);
    try {
      // Ruta de demo: abre sesión por rol, sin exponer contraseñas en el
      // cliente y dejando registrado el rol para poder reconectar solos.
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: role.key }),
      });
      const d = await res.json();
      if (!res.ok) {
        setLoading(null);
        return;
      }
      if (d.token) setStoredToken(d.token);
      setDemoRole(role.key);
      await gotoWithSession(role.to, d.token);
    } catch {
      setLoading(null);
    }
  }

  async function leave() {
    setLoading("salir");
    const token = getStoredToken();
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: token ? { "x-aquago-session": token } : undefined,
      });
    } catch {
      // ignoramos
    }
    clearStoredToken();
    window.location.assign("/");
  }

  if (!demoOn) return null;

  return (
    <div className="border-b border-water-800 bg-water-950 px-4 py-2 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
          Demo
        </span>

        {me ? (
          <>
            <span className="text-xs font-semibold text-white/80">
              Estás como <strong className="text-white">{me.name}</strong>
            </span>
            <span className="text-white/30">·</span>
            <span className="text-[11px] text-white/60">Cambiar a:</span>
            {ROLES.map((r) => (
              <button
                key={r.key}
                onClick={() => enter(r)}
                disabled={loading !== null}
                className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold transition hover:bg-white/20 disabled:opacity-50"
              >
                {loading === r.key ? "…" : r.label}
              </button>
            ))}
            <button
              onClick={leave}
              disabled={loading !== null}
              className="rounded-lg px-2.5 py-1 text-xs font-bold text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Salir
            </button>
          </>
        ) : (
          <>
            <span className="text-xs font-semibold text-white/80">Entrar como:</span>
            {ROLES.map((r) => (
              <button
                key={r.key}
                onClick={() => enter(r)}
                disabled={loading !== null}
                className="rounded-lg bg-white/15 px-3 py-1 text-xs font-bold transition hover:bg-white/25 disabled:opacity-50"
              >
                {loading === r.key ? "Entrando…" : r.label}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
