"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { ENCARNACION_CENTER } from "@/lib/format";
import { IconLocate } from "./icons";

const PIN_SVG = `
<svg width="38" height="46" viewBox="0 0 38 46" xmlns="http://www.w3.org/2000/svg">
  <path d="M19 1.5C9.9 1.5 2.5 8.9 2.5 18c0 12 16.5 26.5 16.5 26.5S35.5 30 35.5 18C35.5 8.9 28.1 1.5 19 1.5Z" fill="#105c88" stroke="#ffffff" stroke-width="2.5"/>
  <path d="M19 9.5c3 3.4 5.6 6.4 5.6 9.4a5.6 5.6 0 1 1-11.2 0c0-3 2.6-6 5.6-9.4Z" fill="#ffffff"/>
  <path d="M16.4 18.6a2.6 2.6 0 0 0 2 2.7" stroke="#1f8dc9" stroke-width="1.4" stroke-linecap="round" fill="none"/>
</svg>`;

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export interface LeafletMapProps {
  center: [number, number] | null;
  onChange?: (lat: number, lng: number) => void;
  showLocate?: boolean;
  heightClass?: string;
  zoom?: number;
}

export default function LeafletMap({
  center,
  onChange,
  showLocate = false,
  heightClass = "h-72",
  zoom = 14,
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [satellite, setSatellite] = useState(false);
  const hasCenter = center !== null;

  // El icono se crea dentro del componente: así Leaflet nunca se evalúa en el servidor.
  const pinIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: PIN_SVG,
        iconSize: [38, 46],
        iconAnchor: [19, 44],
      }),
    []
  );

  const lat = center?.[0];
  const lng = center?.[1];

  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat == null || lng == null) return;
    map.flyTo([lat, lng], Math.max(map.getZoom(), zoom), { duration: 0.6 });
  }, [lat, lng, zoom]);

  const handleLocate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.flyTo([latitude, longitude], 16, { duration: 0.8 });
        onChange?.(latitude, longitude);
      },
      () => {
        // sin permiso: se queda con el centro actual
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-ink/10">
      <div className={heightClass}>
        <MapContainer
          ref={mapRef}
          center={center ?? ENCARNACION_CENTER}
          zoom={center ? zoom : 12}
          className="h-full w-full"
          scrollWheelZoom
          attributionControl={false}
        >
          <TileLayer
            key={satellite ? "sat" : "mapa"}
            url={
              satellite
                ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                : "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            }
            maxZoom={19}
          />
          {hasCenter && <Marker position={center} icon={pinIcon} />}
          {onChange && <ClickHandler onPick={onChange} />}
        </MapContainer>
      </div>

      <button
        type="button"
        onClick={() => setSatellite((v) => !v)}
        className="absolute right-3 top-3 z-[600] rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-bold text-ink shadow-pop ring-1 ring-ink/10 transition hover:bg-white"
      >
        {satellite ? "🗺️ Mapa" : "🛰️ Satélite"}
      </button>

      <div className="pointer-events-none absolute bottom-1.5 right-2 z-[500] rounded bg-white/80 px-1.5 text-[9px] text-ink-soft">
        {satellite ? "Imágenes © Esri, Maxar" : "© OpenStreetMap"}
      </div>

      {showLocate && (
        <button
          type="button"
          onClick={handleLocate}
          className="absolute right-3 top-12 z-[500] flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-water-700 shadow-pop transition hover:bg-water-50"
        >
          <IconLocate className="h-3.5 w-3.5" />
          Mi ubicación
        </button>
      )}

      <div className="pointer-events-none absolute bottom-1.5 right-2 z-[500] rounded bg-white/80 px-1.5 text-[9px] text-ink-soft">
        © OpenStreetMap · CARTO
      </div>
    </div>
  );
}
