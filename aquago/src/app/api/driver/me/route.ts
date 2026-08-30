import { NextResponse } from "next/server";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { drivers, orderItems, orders, users } from "@/db/schema";
import { getDriverForUser, getSessionUser } from "@/lib/auth";
import { planRoute } from "@/lib/route";

/**
 * Panel del repartidor: perfil, pedidos asignados activos y la ruta
 * sugerida (vecino más cercano desde la última posición conocida).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (user.role !== "repartidor") {
    return NextResponse.json(
      { error: "Esta sección es solo para repartidores." },
      { status: 403 }
    );
  }

  const driver = await getDriverForUser(user.id);
  if (!driver) {
    return NextResponse.json(
      { error: "Tu usuario no está vinculado a un perfil de repartidor. Avisale a tu marca." },
      { status: 404 }
    );
  }

  const rows = await db
    .select({
      order: orders,
      customerName: users.name,
      customerPhone: users.phone,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(and(eq(orders.driverId, driver.id), inArray(orders.status, ["aceptada", "en_camino"])))
    .orderBy(orders.createdAt);

  const ids = rows.map((r) => r.order.id);
  const items = ids.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids))
    : [];

  const itemsByOrder = new Map<number, { name: string; quantity: number }[]>();
  for (const it of items) {
    const list = itemsByOrder.get(it.orderId) ?? [];
    list.push({ name: it.name, quantity: it.quantity });
    itemsByOrder.set(it.orderId, list);
  }

  const stops = rows.map((r) => ({
    orderId: r.order.id,
    code: r.order.code,
    lat: r.order.lat ?? driver.lat ?? 0,
    lng: r.order.lng ?? driver.lng ?? 0,
    addressLabel: r.order.addressLabel,
    zone: r.order.zone,
    status: r.order.status,
  }));

  // Si el repartidor aún no reportó posición, se ordena desde la primera parada.
  const start = driver.lat != null && driver.lng != null
    ? { lat: driver.lat, lng: driver.lng }
    : stops[0] ?? { lat: -27.3306, lng: -55.8667 };

  const route = planRoute(start, stops, driver.vehicle);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [todayCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.driverId, driver.id),
        eq(orders.status, "entregada"),
        gte(orders.updatedAt, startOfDay)
      )
    );

  return NextResponse.json({
    driver: {
      id: driver.id,
      name: driver.name,
      vehicle: driver.vehicle,
      plate: driver.plate,
      status: driver.status,
      lat: driver.lat,
      lng: driver.lng,
      lastSeenAt: driver.lastSeenAt?.toISOString() ?? null,
    },
    orders: rows.map((r) => ({
      id: r.order.id,
      code: r.order.code,
      status: r.order.status,
      addressLabel: r.order.addressLabel,
      zone: r.order.zone,
      lat: r.order.lat,
      lng: r.order.lng,
      notes: r.order.notes,
      total: r.order.total,
      paymentMethod: r.order.paymentMethod,
      changeFrom: r.order.changeFrom,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      items: itemsByOrder.get(r.order.id) ?? [],
      createdAt: r.order.createdAt.toISOString(),
    })),
    route: route.stops.map((s) => ({ orderId: s.orderId, order: s.order, legKm: s.legKm })),
    totalKm: route.totalKm,
    totalMin: route.totalMin,
    deliveredToday: todayCount?.n ?? 0,
  });
}
