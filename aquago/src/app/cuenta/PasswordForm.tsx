"use client";

import { useState } from "react";
import { getStoredToken } from "@/lib/session-client";

/** Formulario corto para cambiar la contraseña desde Mi cuenta. */
export default function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (next.length < 6) {
      setMsg("La contraseña nueva debe tener al menos 8 caracteres (con letras y números).");
      return;
    }
    setBusy(true);
    try {
      const token = getStoredToken();
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-aquago-session": token } : {}),
        },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg("✓ Contraseña actualizada.");
        setCurrent("");
        setNext("");
      } else {
        setMsg(d.error ?? "No se pudo cambiar la contraseña.");
      }
    } catch {
      setMsg("Sin conexión. Intentá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-md border border-ink/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-water-500";

  return (
    <form onSubmit={submit} className="mt-3 space-y-3">
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Contraseña actual</label>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required className={input} autoComplete="current-password" />
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Contraseña nueva</label>
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required className={input} autoComplete="new-password" />
      </div>
      {msg && <p className="text-xs font-semibold text-ink-soft">{msg}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-water-700 px-4 py-2.5 font-display text-sm font-bold text-white transition hover:bg-water-800 disabled:opacity-50"
      >
        {busy ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
