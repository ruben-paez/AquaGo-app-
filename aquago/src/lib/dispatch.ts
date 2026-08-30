import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { drivers, orders } from "@/db/schema";

/**
 * Motor de asignación de pedidos a repartidores.
 *
 * El problema tiene dos fuerzas que tiran para lados opuestos:
 *
 *   - CERCANÍA: mandar siempre al más cercano baja el costo y el tiempo,
 *     pero si un repartidor vive en la zona más densa se queda con todo
 *     el trabajo (y con todas las propinas), y el resto mira.
 *
 *   - EQUIDAD: repartir parejo es justo, pero si lo hacés a ciegas terminás
 *     cruzando la ciudad para entregar un bidón que tenías a tres cuadras.
 *
 * La solución es un puntaje combinado: cada candidato suma penalizaciones y
 * gana el de menor puntaje. El peso de cada factor lo define la marca según
 * su modo de reparto.
 */

/** Estados en los que un pedido todavía ocupa al repartidor. */
export const ACTIVE_STATUSES = ["pendiente", "aceptada", "en_camino"] as const;

import type { DispatchMode, DriverLoad } from "./dispatch-shared";
export type { DispatchMode, DriverLoad };
export { DISPATCH_MODE_LABELS } from "./dispatch-shared";

interface Weights {
  distance: number;
  load: number;
  fairness: number;
}

/** Cuánto pesa cada factor según el modo elegido por la marca. */
const WEIGHTS: Record<DispatchMode, Weights> = {
  // Gana el más cercano casi siempre. Sirve para picos de demanda.
  cercania: { distance: 1, load: 0.25, fairness: 0.1 },
  // El equilibrio recomendado: cercanía manda, pero la carga corrige.
  equilibrado: { distance: 1, load: 0.7, fairness: 0.45 },
  // Prioriza que todos facturen parecido. Ideal con equipo en relación de dependencia.
  equitativo: { distance: 1, load: 1.2, fairness: 1.3 },
};

/** Distancia en km entre dos puntos (fórmula de Haversine). */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Minutos estimados de viaje según el vehículo. */
export function etaMinutes(km: number, vehicle: string): number {
  const kmh = vehicle === "moto" ? 28 : vehicle === "camion" ? 18 : 22;
  // 6 min fijos de preparación y entrega
  return Math.round((km / kmh) * 60 + 6);
}

/** Trae los repartidores de una marca con su carga actual. */
export async function getDriverLoads(brandId?: number): Promise<DriverLoad[]> {
  const rows = await db
    .select()
    .from(drivers)
    .where(brandId ? eq(drivers.brandId, brandId) : sql`true`)
    .orderBy(drivers.id);

  if (rows.length === 0) return [];

  const counts = await db
    .select({
      driverId: orders.driverId,
      active: sql<number>`count(*) filter (where ${orders.status} in ('pendiente','aceptada','en_camino'))::int`,
      today: sql<number>`count(*) filter (where ${orders.status} = 'entregada' and ${orders.updatedAt} >= date_trunc('day', now()))::int`,
      total: sql<number>`count(*) filter (where ${orders.status} = 'entregada')::int`,
    })
    .from(orders)
    .where(inArray(orders.driverId, rows.map((r) => r.id)))
    .groupBy(orders.driverId);

  const byId = new Map(counts.map((c) => [c.driverId, c]));

  return rows.map((d) => {
    const c = byId.get(d.id);
    return {
      id: d.id,
      brandId: d.brandId,
      name: d.name,
      phone: d.phone,
      vehicle: d.vehicle,
      plate: d.plate,
      status: d.status,
      lat: d.lat,
      lng: d.lng,
      capacity: d.capacity,
      preferredZone: d.preferredZone,
      active: d.active,
      activeOrders: c?.active ?? 0,
      deliveredToday: c?.today ?? 0,
      deliveredTotal: c?.total ?? 0,
    };
  });
}

export interface Candidate {
  driver: DriverLoad;
  distanceKm: number;
  etaMin: number;
  /** puntaje final: gana el más bajo */
  score: number;
  /** desglose para poder explicar la decisión en pantalla */
  breakdown: { distance: number; load: number; fairness: number };
  eligible: boolean;
  reason?: string;
}

/**
 * Evalúa a todos los repartidores para un pedido y los ordena por puntaje.
 * Devuelve también los no elegibles, para poder mostrar por qué quedaron afuera.
 */
export function rankDrivers(
  driverList: DriverLoad[],
  destLat: number,
  destLng: number,
  mode: DispatchMode,
  fallback?: { lat: number | null; lng: number | null }
): Candidate[] {
  const w = WEIGHTS[mode] ?? WEIGHTS.equilibrado;

  // Referencias para normalizar: así los factores son comparables entre sí.
  const maxToday = Math.max(1, ...driverList.map((d) => d.deliveredToday));

  const candidates: Candidate[] = driverList.map((d) => {
    const lat = d.lat ?? fallback?.lat ?? null;
    const lng = d.lng ?? fallback?.lng ?? null;

    const distanceKm =
      lat != null && lng != null ? haversineKm(lat, lng, destLat, destLng) : 99;

    // Penalización por carga: cada pedido activo pesa como 1,5 km de viaje.
    const loadPenalty = d.activeOrders * 1.5;
    // Penalización por equidad: quien más entregó hoy, más penaliza (hasta 3 km).
    const fairnessPenalty = (d.deliveredToday / maxToday) * 3;

    const breakdown = {
      distance: distanceKm * w.distance,
      load: loadPenalty * w.load,
      fairness: fairnessPenalty * w.fairness,
    };

    let eligible = true;
    let reason: string | undefined;
    if (!d.active) {
      eligible = false;
      reason = "Inactivo";
    } else if (d.status === "fuera_turno") {
      eligible = false;
      reason = "Fuera de turno";
    } else if (d.activeOrders >= d.capacity) {
      eligible = false;
      reason = `Al tope (${d.activeOrders}/${d.capacity})`;
    }

    return {
      driver: d,
      distanceKm,
      etaMin: etaMinutes(distanceKm, d.vehicle),
      score: breakdown.distance + breakdown.load + breakdown.fairness,
      breakdown,
      eligible,
      reason,
    };
  });

  return candidates.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return a.score - b.score;
  });
}

export interface AssignResult {
  ok: boolean;
  orderId: number;
  orderCode?: string;
  driverId?: number;
  driverName?: string;
  distanceKm?: number;
  etaMin?: number;
  mode?: string;
  message?: string;
  runnerUp?: { name: string; score: number };
}

/** Asigna un pedido concreto. Si no se pasa driverId, decide el motor. */
export async function assignOrder(
  orderId: number,
  opts: { driverId?: number; mode?: DispatchMode } = {}
): Promise<AssignResult> {
  const orderRows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = orderRows[0];
  if (!order) return { ok: false, orderId, message: "Pedido no encontrado." };
  if (order.status === "entregada" || order.status === "cancelada") {
    return { ok: false, orderId, message: "El pedido ya está cerrado." };
  }
  if (order.lat == null || order.lng == null) {
    return { ok: false, orderId, message: "El pedido no tiene ubicación." };
  }

  const loads = await getDriverLoads(order.brandId);
  if (loads.length === 0) {
    return { ok: false, orderId, message: "La marca no tiene repartidores cargados." };
  }

  // Asignación manual: se respeta aunque no sea la óptima.
  if (opts.driverId) {
    const chosen = loads.find((d) => d.id === opts.driverId);
    if (!chosen) return { ok: false, orderId, message: "Repartidor inválido." };
    const km =
      chosen.lat != null && chosen.lng != null
        ? haversineKm(chosen.lat, chosen.lng, order.lat, order.lng)
        : 0;
    await db
      .update(orders)
      .set({
        driverId: chosen.id,
        driverName: chosen.name,
        assignedAt: new Date(),
        assignDistanceKm: km,
        assignReason: "manual",
        status: order.status === "pendiente" ? "aceptada" : order.status,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));
    await syncDriverStatus(chosen.id);
    return {
      ok: true,
      orderId,
      orderCode: order.code,
      driverId: chosen.id,
      driverName: chosen.name,
      distanceKm: km,
      etaMin: etaMinutes(km, chosen.vehicle),
      mode: "manual",
    };
  }

  const mode = opts.mode ?? "equilibrado";
  const ranked = rankDrivers(loads, order.lat, order.lng, mode);
  const best = ranked.find((c) => c.eligible);

  if (!best) {
    return {
      ok: false,
      orderId,
      orderCode: order.code,
      message: "Nadie disponible: todos al tope o fuera de turno.",
    };
  }

  await db
    .update(orders)
    .set({
      driverId: best.driver.id,
      driverName: best.driver.name,
      assignedAt: new Date(),
      assignDistanceKm: best.distanceKm,
      assignReason: mode,
      status: order.status === "pendiente" ? "aceptada" : order.status,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  await syncDriverStatus(best.driver.id);

  const second = ranked.filter((c) => c.eligible)[1];

  return {
    ok: true,
    orderId,
    orderCode: order.code,
    driverId: best.driver.id,
    driverName: best.driver.name,
    distanceKm: best.distanceKm,
    etaMin: best.etaMin,
    mode,
    runnerUp: second ? { name: second.driver.name, score: second.score } : undefined,
  };
}

/** Marca al repartidor como ocupado o disponible según su carga. */
export async function syncDriverStatus(driverId: number) {
  const rows = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  const d = rows[0];
  if (!d || d.status === "fuera_turno") return;

  const active = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.driverId, driverId),
        inArray(orders.status, ACTIVE_STATUSES as unknown as string[])
      )
    );

  const n = active[0]?.n ?? 0;
  const status = n >= d.capacity ? "ocupado" : "disponible";
  if (status !== d.status) {
    await db.update(drivers).set({ status }).where(eq(drivers.id, driverId));
  }
}

/** Asigna de una todos los pedidos pendientes sin repartidor. */
export async function autoAssignPending(
  brandId: number,
  mode: DispatchMode
): Promise<AssignResult[]> {
  const pending = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.brandId, brandId),
        sql`${orders.driverId} is null`,
        inArray(orders.status, ["pendiente", "aceptada"])
      )
    )
    .orderBy(orders.createdAt);

  const results: AssignResult[] = [];
  // De a uno y en orden: cada asignación cambia la carga y afecta a la siguiente.
  for (const p of pending) {
    results.push(await assignOrder(p.id, { mode }));
  }
  return results;
}

/** Índice de equidad (Jain): 1 = reparto perfecto, 0 = uno se lleva todo. */
export function fairnessIndex(values: number[]): number {
  if (values.length === 0) return 1;
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum === 0) return 1;
  const sumSq = values.reduce((a, b) => a + b * b, 0);
  return (sum * sum) / (values.length * sumSq);
}
