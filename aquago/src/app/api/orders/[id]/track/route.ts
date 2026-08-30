import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, drivers, orders } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { haversineKm, etaMinutes } from "@/lib/dispatch";

/**
 * Seguimiento en vivo de un pedido: lo usa el cliente para ver en el mapa
 * dónde va su repartidor. Responde solo si el pedido es del usuario (o si
 * es staff de la marca/plataforma).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  }

  const isOwner = order.userId === user.id;
  const isStaff =
    user.role === "plataforma" ||
    (user.role === "marca" && user.brandId === order.brandId);
  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  }

  let driver: {
    name: string;
    phone: string;
    vehicle: string;
    plate: string;
    lat: number | null;
    lng: number | null;
    lastSeenAt: string | null;
  } | null = null;

  if (order.driverId) {
    const dRows = await db.select().from(drivers).where(eq(drivers.id, order.driverId)).limit(1);
    const d = dRows[0];
    if (d) {
      driver = {
        name: d.name,
        phone: d.phone,
        vehicle: d.vehicle,
        plate: d.plate,
        lat: d.lat,
        lng: d.lng,
        lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
      };
    }
  }

  const brandRows = await db.select().from(brands).where(eq(brands.id, order.brandId)).limit(1);
  const brand = brandRows[0];

  // ETA: desde la posición del repartidor al destino; si no hay posición, desde la base de la marca.
  let etaMin: number | null = null;
  const fromLat = driver?.lat ?? brand?.baseLat ?? null;
  const fromLng = driver?.lng ?? brand?.baseLng ?? null;
  if (order.lat != null && order.lng != null && fromLat != null && fromLng != null) {
    const km = haversineKm(fromLat, fromLng, order.lat, order.lng);
    etaMin = etaMinutes(km, driver?.vehicle ?? "moto");
  }

  return NextResponse.json({
    order: {
      id: order.id,
      code: order.code,
      status: order.status,
      addressLabel: order.addressLabel,
      zone: order.zone,
      lat: order.lat,
      lng: order.lng,
      driverName: order.driverName,
    },
    driver,
    etaMin,
  });
}
