import { haversineKm, etaMinutes } from "./dispatch";

/**
 * Planificador de ruta para entregas.
 *
 * Estrategia "vecino más cercano": desde la posición actual del repartidor,
 * en cada paso va al punto pendiente más cercano. Con la cantidad de pedidos
 * que maneja una moto por vuelta (menos de 10) la solución es prácticamente
 * óptima y es fácil de entender para el repartidor.
 */

export interface RouteStopInput {
  orderId: number;
  code: string;
  lat: number;
  lng: number;
  addressLabel: string;
  zone: string;
  status: string;
}

export interface PlannedStop extends RouteStopInput {
  /** orden en la ruta (1 = primera parada) */
  order: number;
  /** km desde la parada anterior (o desde el repartidor, si es la primera) */
  legKm: number;
  /** minutos estimados de la pierna, según el vehículo */
  legMin: number;
  /** km acumulados al llegar a esta parada */
  totalKm: number;
}

export interface PlannedRoute {
  stops: PlannedStop[];
  totalKm: number;
  totalMin: number;
}

export function planRoute(
  start: { lat: number; lng: number },
  stops: RouteStopInput[],
  vehicle = "moto"
): PlannedRoute {
  const remaining = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  const planned: PlannedStop[] = [];

  let cur = { lat: start.lat, lng: start.lng };
  let totalKm = 0;

  while (remaining.length > 0) {
    // parada más cercana desde la posición actual
    let bestIdx = 0;
    let bestKm = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const km = haversineKm(cur.lat, cur.lng, remaining[i].lat, remaining[i].lng);
      if (km < bestKm) {
        bestKm = km;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    totalKm += bestKm;
    planned.push({
      ...next,
      order: planned.length + 1,
      legKm: Math.round(bestKm * 10) / 10,
      legMin: etaMinutes(bestKm, vehicle),
      totalKm: Math.round(totalKm * 10) / 10,
    });
    cur = { lat: next.lat, lng: next.lng };
  }

  return {
    stops: planned,
    totalKm: Math.round(totalKm * 10) / 10,
    totalMin: planned.reduce((sum, s) => sum + s.legMin, 0),
  };
}
