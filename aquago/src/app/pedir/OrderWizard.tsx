"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MapPicker from "@/components/MapPicker";
import Stepper from "@/components/Stepper";
import StatusBadge from "@/components/StatusBadge";
import { AquaNatLogo, AquaNatMark } from "@/components/Brand";
import { CASH_OPTIONS, formatGs, formatRating } from "@/lib/format";
import { computeServiceFee } from "@/lib/pricing";
import { getStoredToken, reconnectDemo, setStoredToken } from "@/lib/session-client";
import type { BrandView, OrderView } from "@/lib/queries";
import type { PublicUser } from "@/lib/auth";
import {
  IconArrowRight,
  IconBank,
  IconCash,
  IconCheck,
  IconClock,
  IconMapPin,
  IconTruck,
} from "@/components/icons";

interface Product {
  id: number;
  brandId: number;
  name: string;
  description: string;
  category: string;
  volume: string;
  price: number;
}

const STEPS = ["Marca", "Productos", "Dirección", "Pago", "Listo"];
const CATEGORY_ORDER: [string, string][] = [
  ["agua", "Agua · bidones"],
  ["accesorios", "Accesorios"],
  ["otros", "Otros"],
];

export default function OrderWizard({
  user,
  sessionToken,
}: {
  user: PublicUser;
  sessionToken?: string | null;
}) {
  /**
   * Cabeceras para hablar con la API.
   *
   * El token llega como prop desde el servidor, que es lo único 100 % seguro:
   * si el servidor renderizó esta pantalla con sesión, este componente tiene
   * exactamente ese token. No depende de cookies (que el iframe bloquea), ni
   * del `<meta>` (que la hidratación puede alterar), ni de la URL.
   */
  function apiHeaders(
    extra?: Record<string, string>,
    override?: string | null
  ): Record<string, string> {
    const h: Record<string, string> = { ...(extra ?? {}) };
    const t = override ?? tokenRef.current ?? sessionToken ?? getStoredToken();
    if (t) h["x-aquago-session"] = t;
    return h;
  }

  const [step, setStep] = useState(1);
  const [brands, setBrands] = useState<BrandView[] | null>(null);
  const [brand, setBrand] = useState<BrandView | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [cart, setCart] = useState<Record<number, number>>({});

  const [pos, setPos] = useState<[number, number] | null>(
    user.lat != null && user.lng != null ? [user.lat, user.lng] : null
  );
  const [addressLabel, setAddressLabel] = useState(user.addressLabel);
  const [notes, setNotes] = useState(user.deliveryNotes);

  const [method, setMethod] = useState<"efectivo" | "transferencia">("efectivo");
  const [changeFrom, setChangeFrom] = useState<number>(0);
  const [transferConfirmed, setTransferConfirmed] = useState(false);
  // Comprobante adjuntado en el checkout: se sube apenas se crea el pedido.
  const [proof, setProof] = useState<{ dataUrl: string; name: string } | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<OrderView | null>(null);
  // Token vigente: puede cambiar si hay que reconectar en medio del pedido.
  const tokenRef = useRef<string | null>(sessionToken ?? null);

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((d) => setBrands(d.brands ?? []))
      .catch(() => setLoadError(true));
  }, []);

  function chooseBrand(b: BrandView) {
    if (b.comingSoon || b.suspended) return;
    setBrand(b);
    setCart({});
    setProducts(null);
    setError("");
    setStep(2);
    fetch(`/api/products?brand=${b.slug}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setLoadError(true));
  }

  const subtotal = useMemo(
    () => (products ?? []).reduce((sum, p) => sum + (cart[p.id] ?? 0) * p.price, 0),
    [products, cart]
  );

  // Se calcula igual que en el servidor para que el cliente nunca vea
  // un número distinto al que termina pagando.
  const serviceFee = useMemo(
    () =>
      brand
        ? computeServiceFee(subtotal, {
            serviceFeeBps: brand.serviceFeeBps,
            serviceFeeMin: brand.serviceFeeMin,
            serviceFee: brand.serviceFee,
          })
        : 0,
    [subtotal, brand]
  );
  const total = subtotal + serviceFee;
  const itemCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

  const grouped = useMemo(() => {
    const map: Record<string, Product[]> = {};
    (products ?? []).forEach((p) => {
      (map[p.category] ??= []).push(p);
    });
    return CATEGORY_ORDER.filter(([k]) => (map[k] ?? []).length > 0).map(([k, label]) => ({
      key: k,
      label,
      items: map[k],
    }));
  }, [products]);

  async function confirmOrder() {
    setError("");
    if (!pos) {
      setStep(3);
      setError("Falta marcar el punto de entrega en el mapa.");
      return;
    }
    if (addressLabel.trim().length < 5) {
      setStep(3);
      setError("Escribí la dirección de entrega.");
      return;
    }
    if (method === "transferencia" && !transferConfirmed) {
      setError("Confirmá que ya hiciste la transferencia (o elegí efectivo).");
      return;
    }
    setPlacing(true);
    try {
      const payload = JSON.stringify({
          items: Object.entries(cart)
            .filter(([, q]) => q > 0)
            .map(([productId, quantity]) => ({ productId: Number(productId), quantity })),
          addressLabel,
          notes,
          lat: pos[0],
          lng: pos[1],
        paymentMethod: method,
        changeFrom,
      });

      const send = (tok?: string | null) =>
        fetch("/api/orders", {
          method: "POST",
          headers: apiHeaders({ "Content-Type": "application/json" }, tok),
          body: payload,
        });

      let res = await send();

      // Si la sesión se cayó (pestaña vieja, cookie bloqueada), reconectamos
      // solos y reintentamos una vez: el usuario no pierde el carrito ni ve
      // el cartel de "iniciá sesión".
      if (res.status === 401) {
        const fresh = await reconnectDemo();
        if (fresh) {
          tokenRef.current = fresh;
          setStoredToken(fresh);
          res = await send(fresh);
        }
      }

      const data = await res.json();
      if (!res.ok) {
        setError(
          res.status === 401
            ? "Se cerró tu sesión. Tocá «Cliente» en la barra de arriba para volver a entrar; el carrito se mantiene."
            : (data.error ?? "No pudimos crear el pedido.")
        );
        return;
      }
      // Si adjuntó el comprobante en el checkout, lo subimos ahora que el
      // pedido ya existe y tiene id.
      if (proof && data.order?.id) {
        try {
          await fetch(`/api/orders/${data.order.id}/proof`, {
            method: "POST",
            headers: apiHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ dataUrl: proof.dataUrl, fileName: proof.name }),
          });
          data.order.proofStatus = "pendiente";
        } catch {
          // El pedido ya está tomado; puede subirlo desde Mis pedidos.
        }
      }

      setPlaced(data.order);
      setStep(5);
      fetch("/api/me", {
        method: "PATCH",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ addressLabel, lat: pos[0], lng: pos[1], deliveryNotes: notes }),
      }).catch(() => undefined);
    } finally {
      setPlacing(false);
    }
  }

  function reset() {
    setCart({});
    setMethod("efectivo");
    setChangeFrom(0);
    setTransferConfirmed(false);
    setProof(null);
    setPlaced(null);
    setError("");
    setBrand(null);
    setStep(1);
  }

  // Diálogo "¿Seguro que querés cancelar el pedido?"
  const [confirmCancel, setConfirmCancel] = useState(false);

  const inputCls =
    "w-full rounded-lg border border-ink/15 bg-paper px-3.5 py-2.5 text-sm outline-none transition focus:border-water-500 focus:ring-2 focus:ring-water-200";

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Tu pedido</h1>

      {/* Pasos */}
      <ol className="mt-5 flex items-center gap-1.5">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const current = step === n;
          return (
            <li key={label} className="flex flex-1 items-center gap-1.5 last:flex-none">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-sm font-bold transition ${
                  done
                    ? "bg-ok text-white"
                    : current
                      ? "bg-water-700 text-white"
                      : "border border-ink/20 bg-white text-ink-soft"
                }`}
              >
                {done ? <IconCheck className="h-4 w-4" /> : n}
              </span>
              <span className={`hidden text-sm font-semibold sm:block ${current ? "text-ink" : "text-ink-soft"}`}>
                {label}
              </span>
              {n < STEPS.length && <span className="h-px flex-1 bg-ink/15" />}
            </li>
          );
        })}
      </ol>

      {/* Marca elegida */}
      {brand && step > 1 && step < 5 && (
        <button
          onClick={() => setStep(1)}
          className="mt-4 flex w-full items-center gap-3 rounded-xl border border-water-200 bg-water-50 px-4 py-2.5 text-left transition hover:border-water-400"
        >
          <AquaNatMark className="h-8 w-8" />
          <span className="flex-1">
            <span className="block text-sm font-bold text-water-800">{brand.name}</span>
            <span className="block text-xs text-ink-soft">{brand.tagline}</span>
          </span>
          <span className="text-xs font-bold text-water-700">Cambiar</span>
        </button>
      )}

      <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-card sm:p-6">
        {/* PASO 1: MARCA */}
        {step === 1 && (
          <div>
            <h2 className="font-display text-lg font-bold">¿A qué aguatería le pedís?</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Cada marca tiene su propio catálogo y sus repartidores.
            </p>

            {brands === null && !loadError && (
              <div className="mt-4 space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-xl bg-water-50" />
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-3">
              {(brands ?? []).map((b) => (
                <button
                  key={b.id}
                  onClick={() => chooseBrand(b)}
                  disabled={b.comingSoon || b.suspended}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    b.comingSoon || b.suspended
                      ? "cursor-not-allowed border-dashed border-ink/15 bg-paper opacity-70"
                      : "border-ink/10 bg-white hover:-translate-y-0.5 hover:border-water-500 hover:shadow-card"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {b.slug === "aquanat" ? (
                      <AquaNatLogo className="h-14" />
                    ) : (
                      <div>
                        <p className="font-display text-lg font-bold text-ink-soft">{b.name}</p>
                        <p className="text-xs text-ink-soft">{b.tagline}</p>
                      </div>
                    )}
                    {b.comingSoon ? (
                      <span className="rounded-full bg-ink/8 px-3 py-1 text-xs font-bold text-ink-soft">
                        Próximamente
                      </span>
                    ) : b.suspended ? (
                      <span className="rounded-full bg-danger-soft px-3 py-1 text-xs font-bold text-danger">
                        No disponible
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 text-xs font-bold text-ok">
                        Abierto <IconArrowRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  {!b.comingSoon && !b.suspended && (
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ink-soft">
                      <span className="flex items-center gap-1">
                        <IconClock className="h-3.5 w-3.5 text-water-600" /> {b.etaMin}–{b.etaMax} min
                      </span>
                      <span className="flex items-center gap-1">
                        <IconMapPin className="h-3.5 w-3.5 text-water-600" /> {b.city}
                      </span>
                      <span>⭐ {formatRating(b.rating)}</span>
                      <span className="flex items-center gap-1">
                        <IconTruck className="h-3.5 w-3.5 text-water-600" />
                        {b.deliveryFee === 0 ? "Envío sin cargo" : formatGs(b.deliveryFee)}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: PRODUCTOS */}
        {step === 2 && (
          <div>
            <NavRowFlow
              onBack={() => setStep(1)}
              onCancel={() => setConfirmCancel(true)}
              backLabel="Cambiar marca"
            />
            {products === null && !loadError && (
              <div className="space-y-3 py-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-water-50" />
                ))}
              </div>
            )}
            {loadError && (
              <div className="py-6 text-center">
                <p className="font-semibold text-ink-soft">No pudimos cargar el catálogo.</p>
                <button
                  onClick={() => brand && chooseBrand(brand)}
                  className="mt-3 rounded-lg bg-water-700 px-4 py-2 text-sm font-bold text-white"
                >
                  Reintentar
                </button>
              </div>
            )}

            <div className="space-y-6">
              {grouped.map((g) => (
                <section key={g.key}>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">{g.label}</h2>
                  <div className="mt-2 divide-y divide-ink/8 rounded-xl border border-ink/10">
                    {g.items.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-3.5 sm:gap-4 sm:p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-sm font-bold">{p.name}</h3>
                            {p.volume && (
                              <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-bold text-ink-soft">
                                {p.volume}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-ink-soft">{p.description}</p>
                          <p className="mt-1 font-display text-sm font-bold text-water-700">
                            {formatGs(p.price)}
                          </p>
                        </div>
                        <Stepper value={cart[p.id] ?? 0} onChange={(v) => setCart((c) => ({ ...c, [p.id]: v }))} />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {error && (
              <p className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-ink/10 pt-4">
              <div>
                <p className="text-xs font-semibold text-ink-soft">
                  {itemCount === 0 ? "Carrito vacío" : `${itemCount} producto${itemCount > 1 ? "s" : ""}`}
                </p>
                {itemCount > 0 && (
                  <p className="text-xs text-ink-soft">
                    {formatGs(subtotal)} + {formatGs(serviceFee)} de servicio
                  </p>
                )}
                <p className="font-display text-xl font-bold">{formatGs(total)}</p>
              </div>
              <button
                onClick={() => {
                  setError("");
                  setStep(3);
                }}
                disabled={itemCount === 0}
                className="flex items-center gap-2 rounded-xl bg-water-700 px-5 py-3 font-display text-sm font-bold text-white transition hover:bg-water-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar <IconArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: DIRECCIÓN */}
        {step === 3 && (
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <IconMapPin className="h-5 w-5 text-water-600" />
              ¿Dónde te lo llevamos?
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <MapPicker
                center={pos}
                onChange={(lat, lng) => setPos([lat, lng])}
                showLocate
                heightClass="h-72 md:h-full md:min-h-72"
              />
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Dirección</label>
                  <input
                    className={inputCls}
                    value={addressLabel}
                    onChange={(e) => setAddressLabel(e.target.value)}
                    placeholder="Av. Irrazábal 1250 c/ Curupayty"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold">
                    Referencias <span className="font-medium text-ink-soft">(opcional)</span>
                  </label>
                  <textarea
                    className={inputCls}
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Portón blanco, tocar bocina…"
                  />
                </div>
                <p className="rounded-lg bg-water-50 px-3 py-2.5 text-xs font-semibold text-water-700">
                  {pos
                    ? `Punto: ${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`
                    : "Tocá el mapa para fijar el punto exacto."}
                </p>
              </div>
            </div>
            {error && (
              <p className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
                {error}
              </p>
            )}
            <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
              <button
                onClick={() => setStep(2)}
                className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-bold text-ink-soft transition hover:border-water-400"
              >
                ← Volver
              </button>
              <button
                onClick={() => setConfirmCancel(true)}
                className="rounded-xl border border-danger/30 px-4 py-3 text-sm font-bold text-danger transition hover:bg-danger-soft"
              >
                Cancelar pedido
              </button>
              <button
                onClick={() => {
                  setError("");
                  setStep(4);
                }}
                disabled={!pos || addressLabel.trim().length < 5}
                className="flex items-center gap-2 rounded-xl bg-water-700 px-5 py-3 font-display text-sm font-bold text-white transition hover:bg-water-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar <IconArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASO 4: PAGO */}
        {step === 4 && (
          <div>
            <h2 className="font-display text-lg font-bold">¿Cómo pagás?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMethod("efectivo")}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  method === "efectivo" ? "border-water-600 bg-water-50" : "border-ink/10 bg-white hover:border-water-300"
                }`}
              >
                <span className="flex items-center gap-2 font-display text-sm font-bold">
                  <IconCash className="h-5 w-5 text-water-700" /> Efectivo
                </span>
                <p className="mt-1 text-xs text-ink-soft">Pagás al repartidor al recibir el bidón.</p>
              </button>
              <button
                type="button"
                onClick={() => setMethod("transferencia")}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  method === "transferencia" ? "border-water-600 bg-water-50" : "border-ink/10 bg-white hover:border-water-300"
                }`}
              >
                <span className="flex items-center gap-2 font-display text-sm font-bold">
                  <IconBank className="h-5 w-5 text-water-700" /> Transferencia
                </span>
                <p className="mt-1 text-xs text-ink-soft">Transferís o mandás giro y el local confirma.</p>
              </button>
            </div>

            {method === "efectivo" ? (
              <div className="mt-4 rounded-xl border border-ink/10 bg-paper p-4">
                <label className="mb-2 block text-sm font-bold">¿Con cuánto abonás? (para el vuelto)</label>
                <div className="flex flex-wrap gap-2">
                  {CASH_OPTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setChangeFrom(v)}
                      className={`rounded-lg border px-3.5 py-2 text-sm font-bold transition ${
                        changeFrom === v
                          ? "border-water-600 bg-water-700 text-white"
                          : "border-ink/15 bg-white text-ink hover:border-water-400"
                      }`}
                    >
                      {v === 0 ? "Justo, sin vuelto" : formatGs(v)}
                    </button>
                  ))}
                </div>
                {changeFrom > 0 && changeFrom < total && (
                  <p className="mt-2 text-xs font-semibold text-warn">
                    Ojo: {formatGs(changeFrom)} es menor al total de {formatGs(total)}.
                  </p>
                )}
                {changeFrom > 0 && changeFrom >= total && (
                  <p className="mt-2 text-xs font-semibold text-ok">
                    El repartidor lleva {formatGs(changeFrom - total)} de vuelto.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-ink/10 bg-paper p-4">
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold text-ink-soft">Banco</p>
                    <p className="font-bold">Banco Continental</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-soft">Cuenta</p>
                    <p className="font-bold tabular-nums">17-4175826</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-soft">RUC</p>
                    <p className="font-bold tabular-nums">80012345-6 · AQUAnat</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border-2 border-dashed border-water-300 bg-white p-3.5">
                  <p className="text-sm font-bold">
                    Subí el comprobante de transferencia
                    <span className="ml-1 font-medium text-ink-soft">(recomendado)</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Con la captura, el local confirma tu pago al instante y no tenés que esperar.
                  </p>

                  {proof ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {proof.dataUrl.startsWith("data:application/pdf") ? (
                        <div className="grid h-16 w-16 place-items-center rounded-lg border border-ink/15 bg-paper text-xs font-bold text-ink-soft">
                          PDF
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={proof.dataUrl}
                          alt="Comprobante"
                          className="h-16 w-16 rounded-lg border border-ink/15 object-cover"
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ok">
                        ✓ {proof.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setProof(null)}
                        className="rounded-lg border border-ink/15 px-2.5 py-1.5 text-xs font-bold text-ink-soft"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => proofInputRef.current?.click()}
                      className="mt-2.5 w-full rounded-lg bg-water-700 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-water-800"
                    >
                      📎 Elegir comprobante
                    </button>
                  )}

                  <input
                    ref={proofInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      if (f.size > 2_500_000) {
                        setError("La foto pesa más de 2,5 MB. Sacala con menos calidad.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        setProof({ dataUrl: String(reader.result), name: f.name });
                        setTransferConfirmed(true);
                        setError("");
                      };
                      reader.readAsDataURL(f);
                    }}
                  />
                </div>

                <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={transferConfirmed}
                    onChange={(e) => setTransferConfirmed(e.target.checked)}
                    className="h-4 w-4 accent-water-700"
                  />
                  Ya transferí {formatGs(total)}
                  {!proof && (
                    <span className="text-xs font-normal text-ink-soft">
                      · lo subo después
                    </span>
                  )}
                </label>
              </div>
            )}

            {/* Resumen */}
            <div className="mt-4 rounded-xl border border-dashed border-ink/20 p-4 text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                Resumen · {brand?.name}
              </p>
              <ul className="mt-2 space-y-1">
                {(products ?? [])
                  .filter((p) => (cart[p.id] ?? 0) > 0)
                  .map((p) => (
                    <li key={p.id} className="flex justify-between gap-3">
                      <span className="text-ink-soft">
                        {cart[p.id]} × {p.name}
                      </span>
                      <span className="font-semibold tabular-nums">{formatGs(cart[p.id] * p.price)}</span>
                    </li>
                  ))}
                <li className="mt-2 flex justify-between gap-3 border-t border-dashed border-ink/15 pt-2">
                  <span className="text-ink-soft">
                    Costo de servicio
                    {brand && brand.serviceFeeBps > 0 && (
                      <span className="ml-1 text-[11px]">
                        ({(brand.serviceFeeBps / 100).toFixed(0)} %)
                      </span>
                    )}
                  </span>
                  <span className="font-semibold tabular-nums">{formatGs(serviceFee)}</span>
                </li>
              </ul>
              <div className="mt-2 flex justify-between border-t border-ink/10 pt-2 font-display text-base font-bold">
                <span>Total a pagar</span>
                <span className="text-water-700">{formatGs(total)}</span>
              </div>
              <p className="mt-2 text-xs text-ink-soft">Entrega: {addressLabel || "—"}</p>
            </div>

            {error && (
              <p className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
              <button
                onClick={() => setStep(3)}
                className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-bold text-ink-soft transition hover:border-water-400"
              >
                ← Volver
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="rounded-xl border border-danger/30 px-4 py-3 text-sm font-bold text-danger transition hover:bg-danger-soft"
                >
                  Cancelar pedido
                </button>
                <button
                  onClick={confirmOrder}
                  disabled={placing}
                  className="flex items-center gap-2 rounded-xl bg-ok px-5 py-3 font-display text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {placing ? "Confirmando…" : `Confirmar · ${formatGs(total)}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 5: LISTO */}
        {step === 5 && placed && (
          <div className="py-4 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ok-soft text-ok">
              <IconCheck className="h-8 w-8" />
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold">¡Pedido recibido!</h2>
            <p className="mt-1 text-ink-soft">
              Tu código es{" "}
              <span className="rounded-lg bg-water-50 px-2 py-0.5 font-display font-bold text-water-700">
                {placed.code}
              </span>
            </p>
            <div className="mt-3 flex justify-center">
              <StatusBadge status={placed.status} size="md" />
            </div>

            <div className="mx-auto mt-6 max-w-sm rounded-xl border border-ink/10 bg-paper p-4 text-left text-sm">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
                <AquaNatMark className="h-6 w-6" /> {placed.brandName ?? brand?.name}
              </p>
              <ul className="space-y-1">
                {placed.items.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span className="text-ink-soft">
                      {i.quantity} × {i.name}
                    </span>
                    <span className="font-semibold tabular-nums">{formatGs(i.quantity * i.unitPrice)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t border-ink/10 pt-2 font-display font-bold">
                <span>Total</span>
                <span className="text-water-700">{formatGs(placed.total)}</span>
              </div>
              <p className="mt-2 text-xs text-ink-soft">
                Pago:{" "}
                {placed.paymentMethod === "efectivo"
                  ? `Efectivo ${placed.changeFrom ? `· abona con ${formatGs(placed.changeFrom)}` : "· justo"}`
                  : "Transferencia"}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/mis-pedidos"
                className="rounded-xl bg-water-700 px-5 py-3 font-display text-sm font-bold text-white shadow-card transition hover:bg-water-800"
              >
                Seguir mi pedido
              </Link>
              <button
                onClick={reset}
                className="rounded-xl border border-ink/15 bg-white px-5 py-3 font-display text-sm font-bold text-ink transition hover:border-water-400"
              >
                Hacer otro pedido
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Diálogo: cancelar pedido antes de confirmar */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger">
              ✕
            </span>
            <h3 className="mt-3 font-display text-lg font-bold">¿Cancelar este pedido?</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Se vacía el carrito y volvés al inicio. Todavía no se cobró nada.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={() => setConfirmCancel(false)}
                className="rounded-xl bg-water-700 px-5 py-2.5 font-display text-sm font-bold text-white transition hover:bg-water-800"
              >
                No, seguir pidiendo
              </button>
              <button
                onClick={() => {
                  setConfirmCancel(false);
                  reset();
                }}
                className="rounded-xl border border-danger/40 px-5 py-2.5 font-display text-sm font-bold text-danger transition hover:bg-danger-soft"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-ink-soft">
        Entrega estimada 30–60 min · Zona: Encarnación y alrededores
      </p>
    </div>
  );
}

/**
 * Fila superior de navegación del flujo: botón de atrás + cancelar pedido.
 * Se muestra antes de confirmar; una vez confirmado, el pedido ya vale.
 */
function NavRowFlow({
  onBack,
  onCancel,
  backLabel = "← Volver",
}: {
  onBack: () => void;
  onCancel: () => void;
  backLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <button
        onClick={onBack}
        className="rounded-xl border border-ink/15 bg-white px-3.5 py-2 text-sm font-bold text-ink-soft transition hover:border-water-400"
      >
        {backLabel}
      </button>
      <button
        onClick={onCancel}
        className="text-sm font-bold text-danger transition hover:underline"
      >
        ✕ Cancelar pedido
      </button>
    </div>
  );
}
