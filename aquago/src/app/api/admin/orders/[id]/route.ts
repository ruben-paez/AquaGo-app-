import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { ORDER_STATUSES } from "@/lib/format";
import { syncDriverStatus } from "@/lib/dispatch";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.status === "string" && ORDER_STATUSES.includes(body.status as (typeof ORDER_STATUSES)[number])) {
    patch.status = body.status;
  }
  if (typeof body.driverName === "string") {
    patch.driverName = body.driverName.trim();
  }
  if (typeof body.transferPaid === "boolean") {
    patch.transferPaid = body.transferPaid;
  }

  const updated = await db
    .update(orders)
    .set(patch)
    .where(eq(orders.id, orderId))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  }

  // Si el pedido se canceló o entregó, el vendedor queda libre para el
  // motor de reparto (recalcula disponible/ocupado según su carga real).
  if (patch.status && updated[0].driverId) {
    try {
      await syncDriverStatus(updated[0].driverId);
    } catch {
      // nunca bloquea la operación del admin
    }
  }


  return NextResponse.json({
    order: {
      id: updated[0].id,
      code: updated[0].code,
      status: updated[0].status,
      driverName: updated[0].driverName,
      transferPaid: updated[0].transferPaid,
    },
  });
}
