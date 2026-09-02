"use client";

import { useState } from "react";
import Link from "next/link";
import MapPicker from "@/components/MapPicker";
import { ENCARNACION_CENTER } from "@/lib/format";
import { IconDroplet, IconMapPin } from "@/components/icons";
import { gotoWithSession, setStoredToken } from "@/lib/session-client";

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [addressLabel, setAddressLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!pos) {
      setError("Toca el mapa para marcar tu dirección.");
      return;
    }
    if (addressLabel.trim().length < 5) {
      setError("Escribe tu dirección (calle y número).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          password,
          addressLabel,
          deliveryNotes: notes,
          lat: pos[0],
          lng: pos[1],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No pudimos crear la cuenta.");
        setLoading(false);
        return;
      }
      // Navegación completa para que /pedir se renderice ya con la sesión.
      if (data.token) setStoredToken(data.token);
      await gotoWithSession("/pedir", data.token);
    } catch {
      setError("No pudimos conectar. Probá de nuevo.");
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-ink/15 bg-paper px-3.5 py-2.5 text-sm outline-none transition focus:border-water-500 focus:ring-2 focus:ring-water-200";

  return (
    <div>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">Crea tu cuenta</h1>
          <p className="mt-2 text-ink-soft">
            Con tu dirección marcada en el mapa de Encarnación, el repartidor llega a la puerta exacta.
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-card">
            <h2 className="font-display text-lg font-bold">Tus datos</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold">Nombre completo</label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="María Benítez" required minLength={3} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Teléfono</label>
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+595 981 456 789" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Email</label>
                  <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold">Contraseña</label>
                <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
              </div>
            </div>

            <div className="mt-6 border-t border-dashed border-ink/15 pt-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <IconMapPin className="h-5 w-5 text-water-600" />
                Tu dirección
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Dirección (calle y número)</label>
                  <input className={inputCls} value={addressLabel} onChange={(e) => setAddressLabel(e.target.value)} placeholder="Av. Irrazábal 1250 c/ Curupayty" required />
                </div>
                <div>
                  <label className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-bold">
                    Punto exacto en el mapa
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        pos ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"
                      }`}
                    >
                      {pos ? "✓ marcado" : "obligatorio · tocá el mapa"}
                    </span>
                  </label>
                  <MapPicker
                    center={pos}
                    onChange={(lat, lng) => setPos([lat, lng])}
                    showLocate
                    heightClass="h-64"
                  />
                  <p
                    className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                      pos ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"
                    }`}
                  >
                    {pos
                      ? `Punto marcado: ${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`
                      : "Todavía no marcaste el punto. Hacé clic en cualquier parte del mapa o usá «Mi ubicación»."}
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Indicaciones de entrega <span className="font-medium text-ink-soft">(opcional)</span></label>
                  <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Portón blanco, tocar bocina, casa de dos pisos…" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm font-semibold text-danger">
                <p>{error}</p>
                {error.includes("ya está registrado") && (
                  <Link
                    href="/login"
                    className="mt-1.5 inline-block rounded-lg bg-danger px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
                  >
                    Ir a iniciar sesión →
                  </Link>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-water-700 py-3.5 font-display text-base font-bold text-white shadow-card transition hover:bg-water-800 disabled:opacity-50"
            >
              {loading ? "Creando cuenta…" : "Crear cuenta y seguir pidiendo"}
            </button>
            <div className="rounded-xl border border-ink/10 bg-white p-5 text-sm leading-relaxed text-ink-soft shadow-card">
              <p className="flex items-center gap-2 font-display font-bold text-ink">
                <IconDroplet className="h-4 w-4 text-water-600" /> ¿Qué ganas?
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-4">
                <li>Pedir recargas de 20 L a 12.000 Gs en un minuto.</li>
                <li>Pagar en efectivo con vuelto o por transferencia.</li>
                <li>Ver el estado de tu entrega en tiempo real.</li>
                <li>Tu dirección queda guardada para la próxima.</li>
              </ul>
              <p className="mt-4">
                Ya tienes cuenta?{" "}
                <Link href="/login" className="font-bold text-water-700 hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </div>
            {!pos && (
              <p className="rounded-lg bg-water-50 px-3 py-2.5 text-xs font-semibold text-water-700">
                Consejo: marcá el punto cerca de tu portón para que el repartidor no dé vueltas.
              </p>
            )}
          </div>
          <label className="flex items-start gap-2 text-xs text-ink-soft">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#105c88]"
            />
            <span>
              Acepto los{" "}
              <a href="/terminos" target="_blank" className="font-semibold text-water-700 underline">
                Términos y Condiciones
              </a>{" "}
              y la{" "}
              <a href="/privacidad" target="_blank" className="font-semibold text-water-700 underline">
                Política de Privacidad
              </a>
              .
            </span>
          </label>
        </form>
      <p className="pb-6 pt-8 text-center text-xs text-ink-soft">
        {`Zona de reparto: Encarnación, Itapúa · centro del mapa ${ENCARNACION_CENTER[0].toFixed(3)}, ${ENCARNACION_CENTER[1].toFixed(3)}`}
      </p>
    </div>
  );
}
