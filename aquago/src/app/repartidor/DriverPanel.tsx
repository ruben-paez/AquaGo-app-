"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatGs, timeAgo } from "@/lib/format";
import { sessionHeaders } from "@/lib/session-client";
import type { LiveMapProps } from "@/components/LiveMap";
import ChatBox from "@/components/ChatBox";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="h-80 animate-pulse rounded-xl bg-water-50 border border-ink/10" />
  ),
});

interface DriverOrder {
  id: number;
  code: string;
  status: string;
  addressLabel: string;
  zone: string;
  lat: number | null;
  lng: number | null;
  notes: string;
  total: number;
  paymentMethod: string;
  changeFrom: number | null;
  customerName: string;
  customerPhone: string;
  items: { name: string; quantity: number }[];
  createdAt: string;
}

interface MeData {
  driver: {
    id: number;
    name: string;
    vehicle: string;
    plate: string;
    status: string;
    lat: number | null;
    lng: number | null;
    lastSeenAt: string | null;
  };
  orders: DriverOrder[];
  route: { orderId: number; order: number; legKm: number }[];
  totalKm: number;
  totalMin: number;
  deliveredToday: number;
}

export default function DriverPanel() {
  const [data, setData] = useState<MeData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [gpsOn, setGpsOn] = useState(false);
  const [gpsMsg, setGpsMsg] = useState("");
  const [tick, setTick] = useState(0);
  const [chatFor, setChatFor] = useState<number | null>(null);
  const lastSent = useRef(0);
  const watchId = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/driver/me", { headers: sessionHeaders() });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Error cargando tus pedidos.");
        return;
      }
      setError("");
      setData(d);
    } catch {
      // sin conexión: se mantiene la última vista
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  // reloj para refrescar "hace Xs"
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const sendPosition = useCallback(async (lat: number, lng: number, force = false) => {
    const now = Date.now();
    if (!force && now - lastSent.current < 12000) return;
    lastSent.current = now;
    try {
      const res = await fetch("/api/driver/location", {
        method: "POST",
        headers: sessionHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ lat, lng }),
      });
      if (res.ok) {
        setGpsMsg("Ubicación compartida");
        setData((prev) =>
          prev
            ? { ...prev, driver: { ...prev.driver, lat, lng, lastSeenAt: new Date().toISOString() } }
            : prev
        );
      } else {
        setGpsMsg("No se pudo enviar la ubicación");
      }
    } catch {
      setGpsMsg("Sin conexión para enviar la ubicación");
    }
  }, []);

  function toggleGps() {
    if (gpsOn) {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setGpsOn(false);
      setGpsMsg("");
      return;
    }
    if (!("geolocation" in navigator)) {
      setGpsMsg("Este navegador no soporta GPS");
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsOn(true);
        void sendPosition(pos.coords.latitude, pos.coords.longitude, true);
      },
      () => setGpsMsg("No se pudo acceder al GPS. Revisá los permisos del navegador."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  }

  // apaga el GPS al salir del panel
  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    },
    []
  );

  async function setStatus(orderId: number, status: string) {
    setBusy(orderId);
    try {
      const res = await fetch(`/api/driver/orders/${orderId}/status`, {
        method: "POST",
        headers: sessionHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center">
        <h2 className="font-display text-lg font-bold">No pudimos cargar tu panel</h2>
        <p className="mt-1 text-sm text-ink-soft">{error}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="h-64 animate-pulse rounded-2xl bg-water-50" />;
  }

  const { driver, orders, route, totalKm, totalMin, deliveredToday } = data;
  const routeByOrder = new Map(route.map((r) => [r.orderId, r]));

  const markers: LiveMapProps["markers"] = [];
  for (const o of orders) {
    if (o.lat == null || o.lng == null) continue;
    const r = routeByOrder.get(o.id);
    markers.push({
      id: `o-${o.id}`,
      lat: o.lat,
      lng: o.lng,
      kind: "stop",
      num: r?.order,
      popup: `<b>#${r?.order ?? "-"} · ${o.code}</b><br/>${o.addressLabel}<br/>${formatGs(o.total)}`,
    });
  }
  if (driver.lat != null && driver.lng != null) {
    markers.push({
      id: "me",
      lat: driver.lat,
      lng: driver.lng,
      kind: "driver",
      popup: `<b>${driver.name}</b><br/>${gpsMsg || "Tu posición"}`,
    });
  }
  const path: [number, number][] = route
    .map((r) => {
      const o = orders.find((x) => x.id === r.orderId);
      return o && o.lat != null && o.lng != null ? ([o.lat, o.lng] as [number, number]) : null;
    })
    .filter((p): p is [number, number] => p !== null);
  if (driver.lat != null && driver.lng != null) path.unshift([driver.lat, driver.lng]);

  return (
    <div className="space-y-4">
      {/* encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Mis entregas</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {driver.name} · {driver.vehicle} {driver.plate && `· ${driver.plate}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-200">
            {orders.length} en curso
          </span>
          <span className="rounded-full bg-water-50 px-3 py-1 text-xs font-bold text-water-700 ring-1 ring-water-200">
            {deliveredToday} entregados hoy
          </span>
        </div>
      </div>

      {/* acciones rápidas */}
      <div className="flex flex-wrap gap-2">
        <a
          href="/repartidor/cierre"
          className="flex-1 rounded-2xl border border-ink/10 bg-white p-4 text-center font-display text-sm font-bold text-water-800 shadow-card transition hover:border-water-400"
        >
          🧾 Cerrar venta diaria
          <span className="mt-0.5 block text-[11px] font-normal text-ink-soft">
            Resumen del día en PDF
          </span>
        </a>
      </div>

      {/* GPS */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-white p-4">
        <button
          onClick={toggleGps}
          className={`rounded-xl px-4 py-2.5 font-display text-sm font-bold transition ${
            gpsOn
              ? "bg-teal-600 text-white hover:bg-teal-700"
              : "bg-water-700 text-white hover:bg-water-800"
          }`}
        >
          {gpsOn ? "● GPS activo — tocá para pausar" : "Compartir mi ubicación"}
        </button>
        <p className="text-xs text-ink-soft">
          {gpsMsg
            ? gpsMsg + (driver.lastSeenAt ? ` · última: ${timeAgo(driver.lastSeenAt)}` : "")
            : "Activá el GPS para que la marca y tus clientes te vean en el mapa."}
          {tick < 0 ? "" : ""}
        </p>
      </div>

      {/* mapa con la ruta */}
      {markers.length > 0 && (
        <div className="rounded-2xl border border-ink/10 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
              Ruta sugerida · {totalKm} km · ~{totalMin} min
            </h2>
          </div>
          <LiveMap markers={markers} path={path} heightClass="h-80" />
          <p className="mt-2 px-1 text-xs text-ink-soft">
            La ruta va del punto más cercano al siguiente: seguí los números 1, 2, 3…
          </p>
        </div>
      )}

      {/* paradas */}
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center">
          <h2 className="font-display text-lg font-bold">Sin pedidos asignados por ahora</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Cuando la marca te asigne una entrega, aparece acá con su pin en el mapa.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          {orders
            .slice()
            .sort((a, b) => (routeByOrder.get(a.id)?.order ?? 99) - (routeByOrder.get(b.id)?.order ?? 99))
            .map((o) => {
              const r = routeByOrder.get(o.id);
              const gmaps = o.lat != null && o.lng != null
                ? `https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`
                : null;
              return (
                <article key={o.id} className="rounded-2xl border border-ink/10 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-water-700 font-display text-base font-bold text-white">
                      {r?.order ?? "·"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-bold">{o.code}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            o.status === "en_camino"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-water-50 text-water-700"
                          }`}
                        >
                          {o.status === "en_camino" ? "EN CAMINO" : "POR SALIR"}
                        </span>
                        {r && <span className="text-xs text-ink-soft">· {r.legKm} km</span>}
                      </div>
                      <p className="mt-1 text-sm font-semibold">{o.addressLabel}</p>
                      <p className="text-xs text-ink-soft">
                        Zona: {o.zone || "—"} · {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                      </p>
                      <p className="mt-1 text-sm">
                        <b>{formatGs(o.total)}</b>{" "}
                        <span className="text-ink-soft">
                          ({o.paymentMethod === "efectivo"
                            ? `cobrar al entregar${o.changeFrom ? ` · vuelto de ${formatGs(o.changeFrom)}` : ""}`
                            : "ya pagado por transferencia"}
                          )
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {o.customerName} ·{" "}
                        <a className="font-semibold text-water-700" href={`tel:${o.customerPhone}`}>
                          {o.customerPhone}
                        </a>
                        {o.notes && <> · 📝 {o.notes}</>}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {o.status === "aceptada" && (
                          <button
                            disabled={busy === o.id}
                            onClick={() => setStatus(o.id, "en_camino")}
                            className="rounded-xl bg-amber-500 px-4 py-2 font-display text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
                          >
                            🛵 Salí hacia el cliente
                          </button>
                        )}
                        {o.status === "en_camino" && (
                          <button
                            disabled={busy === o.id}
                            onClick={() => setStatus(o.id, "entregada")}
                            className="rounded-xl bg-teal-600 px-4 py-2 font-display text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
                          >
                            ✅ Entregado
                          </button>
                        )}
                        {gmaps && (
                          <a
                            href={gmaps}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-ink/15 px-4 py-2 font-display text-sm font-bold text-ink transition hover:bg-water-50"
                          >
                            🧭 Ir con Google Maps
                          </a>
                        )}
                        <button
                          onClick={() => setChatFor(chatFor === o.id ? null : o.id)}
                          className="rounded-xl border border-ink/15 px-4 py-2 font-display text-sm font-bold text-water-700 transition hover:bg-water-50"
                        >
                          💬 {chatFor === o.id ? "Cerrar chat" : "Chat con el cliente"}
                        </button>
                      </div>
                      {chatFor === o.id && (
                        <div className="mt-3">
                          <ChatBox orderId={o.id} compact />
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
        </section>
      )}
    </div>
  );
}
