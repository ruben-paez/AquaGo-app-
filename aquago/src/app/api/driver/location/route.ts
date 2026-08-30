import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { drivers } from "@/db/schema";
import { getDriverForUser, getSessionUser } from "@/lib/auth";

/**
 * El repartidor reporta su posición GPS. La llama el panel cada ~15 segundos
 * mientras tiene el botón de ubicación activado; es lo que alimenta los
 * mapas en vivo de la marca y del cliente.
 */
export async function POST(req: Request) {
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

  const body = await req.json().catch(() => null);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400 });
  }

  await db
    .update(drivers)
    .set({ lat, lng, lastSeenAt: new Date() })
    .where(eq(drivers.id, driver.id));

  return NextResponse.json({ ok: true });
}
