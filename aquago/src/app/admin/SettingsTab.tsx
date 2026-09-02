"use client";

import { useEffect, useState } from "react";
import { sessionHeaders } from "@/lib/session-client";

interface Settings {
  bank: string;
  account: string;
  holder: string;
  alias: string;
  note: string;
}

interface Company {
  name: string;
  email: string;
  phone: string;
}

/**
 * Ajustes de la plataforma: datos de transferencia que ve el cliente al
 * pagar. Solo el admin de plataforma entra acá. No afecta ninguna cuenta
 * ni cálculo: es pura información para el cliente.
 */
export default function SettingsTab() {
  const [f, setF] = useState<Settings>({ bank: "", account: "", holder: "", alias: "", note: "" });
  const [co, setCo] = useState<Company>({ name: "AquaGo", email: "aquagocompany@gmail.com", phone: "0991 945 969" });
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings", { headers: sessionHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((d) => {
        setF({ bank: "", account: "", holder: "", alias: "", note: "", ...d.settings });
        if (d.company) setCo(d.company);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: sessionHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          ...f,
          companyName: co.name,
          supportEmail: co.email,
          supportPhone: co.phone,
        }),
      });
      const d = await res.json();
      setMsg(res.ok ? "✓ Guardado — ya aparece en el checkout y en los pedidos" : (d.error ?? "Error al guardar"));
    } catch {
      setMsg("Sin conexión.");
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });
  const updCo = (k: keyof Company) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCo((prev) => ({ ...prev, [k]: e.target.value }));

  if (!loaded) return <div className="mt-4 h-64 animate-pulse rounded-2xl bg-water-50" />;

  return (
    <div className="mt-4 max-w-2xl space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold">Ajustes</h2>
        <p className="text-xs text-ink-soft">
          Datos operativos de AquaGo que ve el cliente. Lo que cambiés acá no toca
          comisiones ni cálculos: es solo información para que sepan dónde pagar.
        </p>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
        <p className="font-display text-sm font-bold">🏦 Datos para transferencias</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Alias</label>
            <input value={f.alias} onChange={set("alias")} placeholder="AQUAGO.PY" className="mt-0.5 w-full rounded-md border border-ink/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-water-500" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Banco / Financiera</label>
            <input value={f.bank} onChange={set("bank")} placeholder="Banco Continental" className="mt-0.5 w-full rounded-md border border-ink/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-water-500" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Número de cuenta</label>
            <input value={f.account} onChange={set("account")} placeholder="17-4175826" className="mt-0.5 w-full rounded-md border border-ink/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-water-500" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Titular / RUC</label>
            <input value={f.holder} onChange={set("holder")} placeholder="AquaGo SRL · RUC 80123456-7" className="mt-0.5 w-full rounded-md border border-ink/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-water-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Nota para el cliente (opcional)</label>
            <textarea value={f.note} onChange={set("note")} rows={2} placeholder="Ej: Enviar el comprobante por el mismo botón de arriba para confirmar al instante." className="mt-0.5 w-full rounded-md border border-ink/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-water-500" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-xl bg-water-700 px-5 py-2.5 font-display text-sm font-bold text-white transition hover:bg-water-800 disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
          {msg && <p className="text-xs font-semibold text-ink-soft">{msg}</p>}
        </div>
        <p className="mt-3 text-[11px] text-ink-soft">
          💡 Si dejás todo vacío, el checkout le avisa al cliente que los datos se
          confirman por WhatsApp al confirmar el pedido.
        </p>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
        <p className="font-display text-sm font-bold">🏢 Datos de la empresa</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          Aparecen en los Términos, la Política de Privacidad y la sección de Ayuda.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Nombre legal / razón social</label>
            <input value={co.name} onChange={updCo("name")} placeholder="AquaGo SRL" className="mt-0.5 w-full rounded-md border border-ink/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-water-500" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Email de soporte</label>
            <input value={co.email} onChange={updCo("email")} placeholder="hola@aquago.com.py" className="mt-0.5 w-full rounded-md border border-ink/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-water-500" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Teléfono de soporte</label>
            <input value={co.phone} onChange={updCo("phone")} placeholder="0991 945 969" className="mt-0.5 w-full rounded-md border border-ink/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-water-500" />
          </div>
        </div>
        <p className="mt-2 text-[11px] text-ink-soft">Se guardan junto con los datos de transferencia (un solo botón Guardar).</p>
      </div>
    </div>
  );
}
