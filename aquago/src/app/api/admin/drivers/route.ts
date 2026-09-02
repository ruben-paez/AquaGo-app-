import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { drivers, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const brandParam = searchParams.get("brandId");
  const brandId = brandParam && brandParam !== "todas" ? Number(brandParam) : undefined;

  // La marca solo ve a sus vendedores; la plataforma ve todos.
  const scope =
    user.role === "marca" && user.brandId
      ? user.brandId
      : Number.isInteger(brandId)
        ? (brandId as number)
        : undefined;

  const rows = await db
    .select({
      id: drivers.id,
      brandId: drivers.brandId,
      name: drivers.name,
      phone: drivers.phone,
      vehicle: drivers.vehicle,
      plate: drivers.plate,
      status: drivers.status,
      capacity: drivers.capacity,
      preferredZone: drivers.preferredZone,
      active: drivers.active,
      userEmail: users.email,
    })
    .from(drivers)
    .leftJoin(users, eq(users.id, drivers.userId))
    .where(scope ? eq(drivers.brandId, scope) : sql`true`)
    .orderBy(drivers.id);

  const list = rows.map((d) => ({
    id: d.id,
    brandId: d.brandId,
    name: d.name,
    phone: d.phone,
    vehicle: d.vehicle,
    plate: d.plate,
    status: d.status,
    capacity: d.capacity,
    preferredZone: d.preferredZone,
    active: d.active,
    user: d.userEmail ? { id: 0, email: d.userEmail } : null,
  }));

  return NextResponse.json({ drivers: list });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Petición inválida." }, { status: 400 });

  const name = String(body.name ?? "").trim();
  const brandId = Number(body.brandId);
  if (name.length < 3) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (!Number.isInteger(brandId)) {
    return NextResponse.json({ error: "Marca inválida." }, { status: 400 });
  }
  // Una marca solo puede crear vendedores para sí misma.
  if (user.role === "marca" && user.brandId !== brandId) {
    return NextResponse.json({ error: "Solo podés crear vendedores de tu marca." }, { status: 403 });
  }

  const vehicle = ["moto", "camioneta", "camion"].includes(body.vehicle)
    ? body.vehicle
    : "moto";
  const capacity =
    Number.isInteger(Number(body.capacity)) && Number(body.capacity) > 0
      ? Math.min(20, Number(body.capacity))
      : 4;

  const inserted = await db
    .insert(drivers)
    .values({
      brandId,
      name,
      phone: String(body.phone ?? "").trim(),
      vehicle,
      plate: String(body.plate ?? "").trim(),
      capacity,
      preferredZone: String(body.preferredZone ?? "").trim(),
      lat: Number.isFinite(Number(body.lat)) ? Number(body.lat) : null,
      lng: Number.isFinite(Number(body.lng)) ? Number(body.lng) : null,
      status: "disponible",
    })
    .returning();

  return NextResponse.json({ driver: inserted[0] }, { status: 201 });
}
