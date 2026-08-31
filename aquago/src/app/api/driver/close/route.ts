import { NextResponse } from "next/server";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { getDriverForUser, getSessionUser } from "@/lib/auth";
import { formatGs } from "@/lib/format";

/**
 * Cierre de venta diaria del repartidor: pedidos entregados hoy con el
 * detalle para el resumen en PDF.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (user.role !== "repartidor") {
    return NextResponse.json({ error: "Solo repartidores." }, { status: 403 });
  }

  const driver = await getDriverForUser(user.id);
  if (!driver) {
    return NextResponse.json({ error: "Sin perfil de repartidor." }, { status: 404 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.driverId, driver.id),
        eq(orders.status, "entregada"),
        gte(orders.updatedAt, startOfDay),
        lte(orders.updatedAt, endOfDay)
      )
    )
    .orderBy(orders.updatedAt);

  const ids = rows.map((r) => r.id);
  const items = ids.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids))
    : [];
  const itemsByOrder = new Map<number, { name: string; quantity: number }[]>();
  for (const it of items) {
    if (!ids.includes(it.orderId)) continue;
    const list = itemsByOrder.get(it.orderId) ?? [];
    list.push({ name: it.name, quantity: it.quantity });
    itemsByOrder.set(it.orderId, list);
  }

  let cashTotal = 0;
  let transferTotal = 0;
  const deliveries = rows.map((o) => {
    if (o.paymentMethod === "efectivo") cashTotal += o.total;
    else transferTotal += o.total;
    return {
      code: o.code,
      time: o.updatedAt.toISOString(),
      addressLabel: o.addressLabel,
      total: o.total,
      paymentMethod: o.paymentMethod,
      changeFrom: o.changeFrom,
      items: itemsByOrder.get(o.id) ?? [],
    };
  });

  return NextResponse.json({
    driver: {
      name: driver.name,
      vehicle: driver.vehicle,
      plate: driver.plate,
    },
    date: new Date().toISOString(),
    deliveries,
    summary: {
      count: deliveries.length,
      cashTotal,
      transferTotal,
      grandTotal: cashTotal + transferTotal,
      cashLabel: formatGs(cashTotal),
      transferLabel: formatGs(transferTotal),
      grandLabel: formatGs(cashTotal + transferTotal),
    },
  });
}
