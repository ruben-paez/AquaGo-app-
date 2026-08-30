import { NextResponse } from "next/server";
import { db } from "@/db";
import { drivers } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getDriverLoads } from "@/lib/dispatch";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const brandParam = searchParams.get("brandId");
  const brandId = brandParam && brandParam !== "todas" ? Number(brandParam) : undefined;

  const list = await getDriverLoads(Number.isInteger(brandId) ? brandId : undefined);
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
