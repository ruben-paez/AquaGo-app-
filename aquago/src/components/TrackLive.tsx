"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { sessionHeaders, getStoredToken } from "@/lib/session-client";
import type { LiveMapProps } from "@/components/LiveMap";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 animate-pulse rounded-xl bg-water-50 border border-ink/10" />
  ),
});

interface TrackData {
  order: {
    id: number;
    code: string;
    status: string;
    addressLabel: string;
    zone: string;
    lat: number | null;
    lng: number | null;
    driverName: string;
  };
  driver: {
    name: string;
    phone: string;
    vehicle: string;
    plate: string;
    lat: number | null;
    lng: number | null;
    lastSeenAt: string | null;
  } | null;
  etaMin: number | null;
}

/**
 * Mapa de seguimiento del pedido: el cliente ve dónde está su repartidor
 * (se actualiza solo cada 12 segundos mientras el pedido va en camino).
 */
export default function TrackLive({ orderId, token }: { orderId: number; token?: string | null }) {
  const [data, setData] = useState<TrackData | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const headers = token
          ? { ...sessionHeaders(), "x-aquago-session": token }
          : sessionHeaders();
        const res = await fetch(`/api/orders/${orderId}/track`, { headers });
        if (res.ok && !stop) setData(await res.json());
      } catch {
        // sin conexión: se mantiene la última vista
      }
    }
    load();
    const id = setInterval(load, 12000);
    const clock = setInterval(() => setTick((t) => t + 1), 5000);
    return () => {
      stop = true;
      clearInterval(id);
      clearInterval(clock);
    };
  }, [orderId, token]);

  if (!data || data.order.status === "entregada" || data.order.status === "cancelada") return null;

  const { order, driver, etaMin } = data;
  const markers: LiveMapProps["markers"] = [];
  const path: [number, number][] = [];

  if (order.lat != null && order.lng != null) {
    markers.push({
      id: "dest",
      lat: order.lat,
      lng: order.lng,
      kind: "dest",
      popup: `<b>Tu pedido ${order.code}</b><br/>${order.addressLabel}`,
    });
  }
  if (driver?.lat != null && driver?.lng != null) {
    markers.push({
      id: "driver",
      lat: driver.lat,
      lng: driver.lng,
      kind: "driver",
      popup: `<b>${driver.name}</b><br/>${driver.vehicle} ${driver.plate}`,
    });
    if (order.lat != null && order.lng != null) {
      path.push([driver.lat, driver.lng], [order.lat, order.lng]);
    }
  }

  if (markers.length < 2) return null;

  return (
    <div className="mt-3">
      <LiveMap markers={markers} path={path} heightClass="h-64" />
      <p className="mt-2 text-xs font-semibold text-cyan-800">
        {order.status === "en_camino"
          ? `🛵 ${driver?.name ?? "Tu repartidor"} va en camino${etaMin ? ` · llega en ~${etaMin} min` : ""}`
          : "📍 Mapa de tu entrega"}
        {tick < 0 ? "" : ""}
      </p>
    </div>
  );
}
