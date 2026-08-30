"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { LeafletMapProps } from "./LeafletMap";

/**
 * Leaflet toca `window` apenas se importa, así que el mapa se carga
 * solo en el navegador. Sin esto, cualquier página que renderice el
 * mapa durante el SSR revienta con "window is not defined".
 */
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => null,
});

export default function MapPicker(props: LeafletMapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Reserva el mismo alto que tendrá el mapa para que no salte el layout.
  if (!mounted) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-ink/10">
        <div className={`${props.heightClass ?? "h-72"} animate-pulse bg-water-50`} />
        <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-water-700">
          Cargando mapa…
        </span>
      </div>
    );
  }

  return <LeafletMap {...props} />;
}
