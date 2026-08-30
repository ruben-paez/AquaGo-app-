"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { formatGs, timeAgo } from "@/lib/format";
import { sessionHeaders } from "@/lib/session-client";
import type { LiveMapProps } from "@/components/LiveMap";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="h-96 animate-pulse rounded-xl bg-water-50 border border-ink/10" />
  ),
});

interface LiveOrder {
  id: number;
  code: string;
  status: string;
  addressLabel: string;
  zone: string;
  lat: number | null;
  lng: number | null;
  total: number;
}

interface LiveDriver {
  id: number;
  name: string;
  brandName: string;
  vehicle: string;
  plate: string;
  status: string;
  lat: number | null;
  lng: number | null;
  lastSeenAt: string | null;
  orders: LiveOrder[];
}

interface LiveData {
  drivers: LiveDriver[];
  unassigned: LiveOrder[];
}

const DRIVER_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  disponible: { label: "Disponible", cls: "bg-teal-50 text-teal-700 ring-teal-200", dot: "#0d9488" },
  ocupado: { label: "En reparto", cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "#d97706" },
  fuera_turno: { label: "Fuera de turno", cls: "bg-ink/5 text-ink-soft ring-ink/10", dot: "#6b7280" },
};

export default function LiveTab() {
  const [data, setData] = useState<LiveData | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch("/api/brand/live", { headers: sessionHeaders() });
        if (res.ok && !stop) setData(await res.json());
      } catch {
        // sin conexión
      }
    }
    load();
    const id = setInterval(load, 10000);
    const clock = setInterval(() => setTick((t) => t + 1), 5000);
    return () => {
      stop = true;
      clearInterval(id);
      clearInterval(clock);
    };
  }, []);

  if (!data) return <div className="h-96 animate-pulse rounded-2xl bg-water-50" />;

  const markers: LiveMapProps["markers"] = [];
  const path: [number, number][] = [];

  for (const d of data.drivers) {
    if (d.lat != null && d.lng != null) {
      const ordersTxt = d.orders.length
        ? d.orders.map((o) => `#${o.code} → ${o.addressLabel}`).join("<br/>")
        : "sin pedidos activos";
      markers.push({
        id: `d-${d.id}`,
        lat: d.lat,
        lng: d.lng,
        kind: "driver",
        popup: `<b>${d.name}</b> (${d.brandName})<br/>${ordersTxt}`,
      });
    }
    for (const o of d.orders) {
      if (o.lat == null || o.lng == null) continue;
      markers.push({
        id: `o-${o.id}`,
        lat: o.lat,
        lng: o.lng,
        kind: "dest",
        popup: `<b>${o.code}</b><br/>${o.addressLabel}<br/>${formatGs(o.total)}`,
      });
      if (d.lat != null && d.lng != null) {
        path.push([d.lat, d.lng], [o.lat, o.lng]);
      }
    }
  }
  for (const o of data.unassigned) {
    if (o.lat == null || o.lng == null) continue;
    markers.push({
      id: `u-${o.id}`,
      lat: o.lat,
      lng: o.lng,
      kind: "store",
      popup: `<b>${o.code} · sin asignar</b><br/>${o.addressLabel}`,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">Mapa en vivo</h2>
          <p className="text-xs text-ink-soft">
            Se actualiza solo cada 10 segundos · azul: repartidores · naranja: entregas pendientes · 🏪: sin asignar
          </p>
        </div>
        {tick < 0 ? "" : ""}
      </div>

      <LiveMap markers={markers} path={path} heightClass="h-96" zoom={13} />

      <div className="grid gap-3 sm:grid-cols-2">
        {data.drivers.map((d) => {
          const st = DRIVER_STATUS[d.status] ?? DRIVER_STATUS.fuera_turno;
          return (
            <div key={d.id} className="rounded-2xl border border-ink/10 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-bold">
                  {d.name}{" "}
                  <span className="text-xs font-normal text-ink-soft">
                    · {d.vehicle} {d.plate}
                  </span>
                </p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${st.cls}`}>
                  {st.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                {d.brandName} ·{" "}
                {d.lastSeenAt ? (
                  <>última posición {timeAgo(d.lastSeenAt)}</>
                ) : (
                  "sin ubicación reportada (le tiene que activar el GPS en su panel)"
                )}
              </p>
              {d.orders.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {d.orders.map((o) => (
                    <li key={o.id} className="text-sm">
                      <b>{o.code}</b> · {o.addressLabel} ·{" "}
                      <span className="text-ink-soft">{formatGs(o.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ink-soft">Sin pedidos activos.</p>
              )}
            </div>
          );
        })}
      </div>

      {data.unassigned.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-display text-sm font-bold text-amber-800">
            Sin repartidor asignado ({data.unassigned.length})
          </h3>
          <ul className="mt-2 space-y-1">
            {data.unassigned.map((o) => (
              <li key={o.id} className="text-sm text-amber-900">
                <b>{o.code}</b> · {o.addressLabel} · {formatGs(o.total)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
