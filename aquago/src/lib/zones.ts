/** Barrios de referencia de Encarnación para agrupar la demanda. */
export interface Zone {
  name: string;
  lat: number;
  lng: number;
}

export const ZONES: Zone[] = [
  { name: "Centro", lat: -27.3306, lng: -55.8667 },
  { name: "San Isidro", lat: -27.3196, lng: -55.8795 },
  { name: "Ita Paso", lat: -27.3405, lng: -55.8555 },
  { name: "Kaʼaguy Rory", lat: -27.3512, lng: -55.8802 },
  { name: "Buena Vista", lat: -27.3238, lng: -55.8502 },
  { name: "Chaipé", lat: -27.3625, lng: -55.9020 },
  { name: "San Pedro", lat: -27.3402, lng: -55.8930 },
  { name: "Mboi Kaʼê", lat: -27.3110, lng: -55.8680 },
  { name: "Villa Angélica", lat: -27.3480, lng: -55.8390 },
  { name: "Quiteria", lat: -27.3700, lng: -55.8700 },
];

/** Devuelve el barrio más cercano a un punto. */
export function zoneFor(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return "Sin zona";
  let best = ZONES[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const z of ZONES) {
    const dLat = z.lat - lat;
    const dLng = z.lng - lng;
    const d = dLat * dLat + dLng * dLng;
    if (d < bestD) {
      bestD = d;
      best = z;
    }
  }
  return best.name;
}

export function zoneCenter(name: string): [number, number] {
  const z = ZONES.find((x) => x.name === name);
  return z ? [z.lat, z.lng] : [-27.3306, -55.8667];
}
