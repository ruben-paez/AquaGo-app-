import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getDriverForUser, getSessionUser } from "@/lib/auth";
import { syncDriverStatus } from "@/lib/dispatch";

/** Transiciones que el repartidor puede hacer. */
const ALLOWED: Record<string, string[]> = {
  aceptada: ["en_camino", "entregada"],
  en_camino: ["entregada"],
};

/**
 * El repartidor avanza el estado de un pedido que tiene asignado:
 * aceptada → en camino → entregada.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
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

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order || order.driverId !== driver.id) {
    return NextResponse.json({ error: "Ese pedido no es tuyo." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const next = String(body?.status ?? "");
  const allowed = ALLOWED[order.status] ?? [];
  if (!allowed.includes(next)) {
    return NextResponse.json(
      { error: `No se puede pasar de "${order.status}" a "${next}".` },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(orders)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  // Libera o ocupa al repartidor según la carga que le quede.
  await syncDriverStatus(driver.id);

  return NextResponse.json({ order: updated });
}
