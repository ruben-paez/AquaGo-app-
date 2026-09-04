import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brands, orders, users } from "@/db/schema";
import { autoAssignPending, DispatchMode } from "@/lib/dispatch";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Despacho automático matutino: lo llama el cron de Vercel (8:00 de Paraguay,
 * ver vercel.json). Recorre las marcas activas y asigna a un repartidor todo
 * pedido que haya quedado pendiente (por ejemplo, pedidos hechos de noche,
 * cuando no había nadie en reparto). A cada cliente con pedido asignado le
 * manda un push avisando que ya salió en el reparto del día.
 */
export async function GET(req: Request) {
  // Seguridad del cron: Vercel manda este header con el CRON_SECRET.
  const auth = req.headers.get("authorization") ?? "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const brandRows = await db
    .select()
    .from(brands)
    .where(eq(brands.comingSoon, false));

  const summary: { brand: string; assigned: number; pending: number; note?: string }[] = [];
  const assignedOrderIds: number[] = [];

  for (const brand of brandRows) {
    // En mora profunda no se despacha: primero regulariza.
    if (brand.billingStatus === "suspendida") {
      summary.push({ brand: brand.name, assigned: 0, pending: 0, note: "suspendida, no despacha" });
      continue;
    }

    const results = await autoAssignPending(brand.id, brand.dispatchMode as DispatchMode);
    const ok = results.filter((r) => r.ok);
    summary.push({
      brand: brand.name,
      assigned: ok.length,
      pending: results.length - ok.length,
    });
    for (const r of ok) if (r.orderId) assignedOrderIds.push(r.orderId);
  }

  // Aviso a cada cliente: "tu pedido ya salió en el reparto de hoy".
  let pushes = 0;
  if (assignedOrderIds.length > 0) {
    const rows = await db
      .select({ id: orders.id, code: orders.code, userId: orders.userId })
      .from(orders)
      .where(inArray(orders.id, assignedOrderIds));
    await Promise.all(
      rows.map(async (o) => {
        const target = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, o.userId))
          .limit(1);
        if (target.length === 0) return;
        const sent = await sendPushToUser(target[0].id, {
          title: "🚚 Tu pedido ya salió en el reparto",
          body: `${o.code} va en el primer reparto de hoy. Seguílo en vivo desde la app.`,
          url: "/mis-pedidos",
          tag: `order-${o.id}`,
        });
        pushes += sent;
      })
    );
  }

  return NextResponse.json({ ok: true, summary, pushes });
}
