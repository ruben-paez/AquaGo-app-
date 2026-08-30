import { NextResponse } from "next/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { brands, drivers, orders } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

/**
 * Mapa en vivo para la marca (y para la plataforma): posición de cada
 * repartidor y los pedidos activos que lleva cada uno.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (user.role !== "marca" && user.role !== "plataforma") {
    return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  }

  // La marca solo ve lo suyo; la plataforma ve todo.
  const brandScope = user.role === "marca" && user.brandId
    ? [user.brandId]
    : undefined;

  const driverRows = await db
    .select({
      id: drivers.id,
      name: drivers.name,
      brandId: drivers.brandId,
      brandName: brands.name,
      vehicle: drivers.vehicle,
      plate: drivers.plate,
      status: drivers.status,
      lat: drivers.lat,
      lng: drivers.lng,
      lastSeenAt: drivers.lastSeenAt,
      active: drivers.active,
    })
    .from(drivers)
    .innerJoin(brands, eq(brands.id, drivers.brandId))
    .where(
      brandScope
        ? and(eq(drivers.active, true), inArray(drivers.brandId, brandScope))
        : eq(drivers.active, true)
    );

  const activeOrders = await db
    .select({
      id: orders.id,
      code: orders.code,
      driverId: orders.driverId,
      brandId: orders.brandId,
      status: orders.status,
      addressLabel: orders.addressLabel,
      zone: orders.zone,
      lat: orders.lat,
      lng: orders.lng,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(inArray(orders.status, ["pendiente", "aceptada", "en_camino"]))
    .orderBy(orders.createdAt);

  const byDriver = new Map<number, typeof activeOrders>();
  const unassigned: typeof activeOrders = [];
  for (const o of activeOrders) {
    if (o.driverId) {
      const list = byDriver.get(o.driverId) ?? [];
      list.push(o);
      byDriver.set(o.driverId, list);
    } else if (!brandScope || (o.brandId && brandScope.includes(o.brandId))) {
      unassigned.push(o);
    }
  }

  return NextResponse.json({
    drivers: driverRows
      .filter((d) => !brandScope || brandScope.includes(d.brandId))
      .map((d) => ({
        id: d.id,
        name: d.name,
        brandName: d.brandName,
        vehicle: d.vehicle,
        plate: d.plate,
        status: d.status,
        lat: d.lat,
        lng: d.lng,
        lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
        orders: (byDriver.get(d.id) ?? []).map((o) => ({
          id: o.id,
          code: o.code,
          status: o.status,
          addressLabel: o.addressLabel,
          zone: o.zone,
          lat: o.lat,
          lng: o.lng,
          total: o.total,
        })),
      })),
    unassigned: unassigned.map((o) => ({
      id: o.id,
      code: o.code,
      addressLabel: o.addressLabel,
      zone: o.zone,
      lat: o.lat,
      lng: o.lng,
      total: o.total,
      brandId: o.brandId,
    })),
  });
}
