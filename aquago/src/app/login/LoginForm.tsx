"use client";

import { useState } from "react";
import Link from "next/link";
import { IconDroplet } from "@/components/icons";
import { gotoWithSession, setStoredToken } from "@/lib/session-client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function doLogin(mail: string, pass: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No pudiste ingresar.");
        setLoading(false);
        return;
      }
      // Navegación completa: el router de Next cachea la versión sin sesión
      // de /pedir y /admin (las prefetchea el menú), así que un push mostraría
      // la pantalla de "creá tu cuenta" aunque el login haya sido correcto.
      // gotoWithSession además arrastra el token si la cookie no sobrevivió.
      if (data.token) setStoredToken(data.token);
      // Cada rol entra a su panel: repartidor → sus entregas, staff → admin.
      const dest =
        data.user.role === "repartidor"
          ? "/repartidor"
          : data.user.isAdmin
            ? "/admin"
            : "/pedir";
      await gotoWithSession(dest, data.token);
    } catch {
      setError("No pudimos conectar. Probá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-ink/10 bg-white p-7 shadow-card">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-water-700 text-white">
            <IconDroplet className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold">Ingresá a AquaGo</h1>
            <p className="text-sm text-ink-soft">Pedí tu bidón y seguí la entrega.</p>
          </div>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            doLogin(email, password);
          }}
        >
          <div>
            <label className="mb-1.5 block text-sm font-bold">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="w-full rounded-lg border border-ink/15 bg-paper px-3.5 py-2.5 text-sm outline-none transition focus:border-water-500 focus:ring-2 focus:ring-water-200"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-ink/15 bg-paper px-3.5 py-2.5 text-sm outline-none transition focus:border-water-500 focus:ring-2 focus:ring-water-200"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-water-700 py-3 font-display text-sm font-bold text-white transition hover:bg-water-800 disabled:opacity-50"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <div className="mt-5 border-t border-dashed border-ink/15 pt-4">
          <p className="text-center text-xs font-bold uppercase tracking-wider text-ink-soft">
            Entrar con un clic
          </p>
          <div className="mt-3 space-y-2">
            {[
              {
                email: "cliente@demo.com.py",
                pass: "cliente123",
                label: "Cliente",
                desc: "Pedir bidones y seguir la entrega",
              },
              {
                email: "admin@aquago.com.py",
                pass: "admin123",
                label: "Plataforma",
                desc: "Comisiones, liquidaciones y datos",
              },
              {
                email: "marca@aquanat.com.py",
                pass: "marca123",
                label: "Marca AQUAnat",
                desc: "Pedidos y catálogo del local",
              },
              {
                email: "repartidor@aquago.com.py",
                pass: "repartidor123",
                label: "Repartidor",
                desc: "Entregas, ruta y GPS en vivo",
              },
            ].map((c) => (
              <button
                key={c.email}
                type="button"
                onClick={() => doLogin(c.email, c.pass)}
                disabled={loading}
                className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-left transition hover:border-water-400 hover:bg-water-50 disabled:opacity-50"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-ink">{c.label}</span>
                  <span className="text-[11px] font-semibold text-water-700">Entrar →</span>
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-soft">{c.desc}</span>
                <span className="mt-1 block font-mono text-[11px] text-ink-soft">
                  {c.email} · {c.pass}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] text-ink-soft">
            También podés escribirlas a mano en el formulario de arriba.
          </p>
        </div>
      </div>

      <p className="mt-5 text-center text-sm text-ink-soft">
        ¿Primera vez?{" "}
        <Link href="/registro" className="font-bold text-water-700 hover:underline">
          Crea tu cuenta
        </Link>
      </p>
    </>
  );
}
