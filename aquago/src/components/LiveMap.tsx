"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import { ENCARNACION_CENTER } from "@/lib/format";

export type MarkerKind = "driver" | "store" | "stop" | "dest";

const COLORS: Record<MarkerKind, { fill: string; glyph: (n?: number) => string }> = {
  driver: { fill: "#1d4ed8", glyph: () => "🛵" },
  store: { fill: "#105c88", glyph: () => "🏪" },
  stop: { fill: "#0f766e", glyph: (n) => String(n ?? "?") },
  dest: { fill: "#b45309", glyph: () => "🏠" },
};

function pinIcon(kind: MarkerKind, num?: number) {
  const { fill, glyph } = COLORS[kind];
  const text = glyph(num);
  const fontSize = kind === "stop" ? 15 : 17;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:32px;height:32px;border-radius:50% 50% 50% 4px;
      transform:rotate(-45deg);background:${fill};border:2.5px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:${fontSize}px;line-height:1;color:#fff;font-weight:800">${text}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 30],
    popupAnchor: [0, -28],
  });
}

export interface LiveMarker {
  id: string;
  lat: number;
  lng: number;
  kind: MarkerKind;
  /** número de parada (para kind = stop) */
  num?: number;
  popup?: string;
}

export interface LiveMapProps {
  markers: LiveMarker[];
  /** línea de ruta en el orden de entrega */
  path?: [number, number][];
  heightClass?: string;
  zoom?: number;
}

/** Ajusta el mapa para que se vean todos los puntos. */
function FitAll({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [42, 42], maxZoom: 16 });
  }, [map, points]);
  return null;
}

export default function LiveMap({ markers, path = [], heightClass = "h-80", zoom = 14 }: LiveMapProps) {
  const [satellite, setSatellite] = useState(false);
  const valid = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
  const center = useMemo<[number, number]>(
    () => (valid[0] ? [valid[0].lat, valid[0].lng] : ENCARNACION_CENTER),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markers.length]
  );
  const points = useMemo<[number, number][]>(
    () => valid.map((m) => [m.lat, m.lng]),
    [valid]
  );

  return (
    <div className={`relative overflow-hidden rounded-xl border border-ink/10 ${heightClass}`}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          key={satellite ? "sat" : "mapa"}
          url={
            satellite
              ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              : "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          maxZoom={19}
        />
        {satellite && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        )}
        {path.length > 1 && (
          <Polyline positions={path} pathOptions={{ color: "#1d4ed8", weight: 4, opacity: 0.65, dashArray: "8 8" }} />
        )}
        {valid.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={pinIcon(m.kind, m.num)}>
            {m.popup && <Popup>{m.popup}</Popup>}
          </Marker>
        ))}
        <FitAll points={points} />
      </MapContainer>
      <button
        onClick={() => setSatellite((v) => !v)}
        className="absolute right-2.5 top-2.5 z-[600] rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-bold text-ink shadow ring-1 ring-ink/10 transition hover:bg-white"
      >
        {satellite ? "🗺️ Mapa" : "🛰️ Satélite"}
      </button>
      <div className="pointer-events-none absolute bottom-1.5 right-2 z-[500] rounded bg-white/80 px-1.5 text-[9px] text-ink-soft">
        {satellite ? "Imágenes © Esri, Maxar" : "© OpenStreetMap"}
      </div>
    </div>
  );
}
