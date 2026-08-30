import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { drivers } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const { id } = await ctx.params;
  const driverId = Number(id);
  if (!Number.isInteger(driverId)) {
    return NextResponse.json({ error: "Repartidor inválido." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Petición inválida." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim().length >= 3) patch.name = body.name.trim();
  if (typeof body.phone === "string") patch.phone = body.phone.trim();
  if (typeof body.plate === "string") patch.plate = body.plate.trim();
  if (typeof body.preferredZone === "string") patch.preferredZone = body.preferredZone.trim();
  if (["moto", "camioneta", "camion"].includes(body.vehicle)) patch.vehicle = body.vehicle;
  if (["disponible", "ocupado", "fuera_turno"].includes(body.status)) patch.status = body.status;
  if (typeof body.active === "boolean") patch.active = body.active;
  if (Number.isInteger(Number(body.capacity)) && Number(body.capacity) > 0) {
    patch.capacity = Math.min(20, Number(body.capacity));
  }
  // Actualización de posición (lo mandaría la app del repartidor)
  if (Number.isFinite(Number(body.lat)) && Number.isFinite(Number(body.lng))) {
    patch.lat = Number(body.lat);
    patch.lng = Number(body.lng);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }

  const updated = await db
    .update(drivers)
    .set(patch)
    .where(eq(drivers.id, driverId))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Repartidor no encontrado." }, { status: 404 });
  }
  return NextResponse.json({ driver: updated[0] });
}
