import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, drivers, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

/** Lista de marcas con sus datos comerciales y conteo de vendedores. Solo plataforma. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (user.role !== "plataforma") {
    return NextResponse.json({ error: "Solo la plataforma gestiona marcas." }, { status: 403 });
  }

  const rows = await db
    .select({
      id: brands.id,
      slug: brands.slug,
      name: brands.name,
      tagline: brands.tagline,
      city: brands.city,
      description: brands.description,
      etaMin: brands.etaMin,
      etaMax: brands.etaMax,
      deliveryFee: brands.deliveryFee,
      plan: brands.plan,
      commissionBps: brands.commissionBps,
      serviceFeeBps: brands.serviceFeeBps,
      serviceFeeMin: brands.serviceFeeMin,
      active: brands.active,
      comingSoon: brands.comingSoon,
      dispatchMode: brands.dispatchMode,
      autoAssign: brands.autoAssign,
      baseLat: brands.baseLat,
      baseLng: brands.baseLng,
      driverCount: sql<number>`(select count(*)::int from ${drivers} where ${drivers.brandId} = ${brands.id} and ${drivers.active} = true)`,
      accessEmail: users.email,
    })
    .from(brands)
    .leftJoin(users, and(eq(users.brandId, brands.id), eq(users.role, "marca")))
    .orderBy(asc(brands.sortOrder), asc(brands.id));

  return NextResponse.json({ brands: rows });
}

/** Alta de marca nueva. Solo plataforma. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (user.role !== "plataforma") {
    return NextResponse.json({ error: "Solo la plataforma gestiona marcas." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Petición inválida." }, { status: 400 });

  const name = String(body.name ?? "").trim();
  if (name.length < 3) {
    return NextResponse.json({ error: "El nombre de la marca es obligatorio." }, { status: 400 });
  }

  let slug = slugify(String(body.slug ?? "") || name);
  const existing = await db.select({ id: brands.id }).from(brands).where(eq(brands.slug, slug)).limit(1);
  if (existing[0]) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const pct = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) : fallback;
  };

  const inserted = await db
    .insert(brands)
    .values({
      slug,
      name,
      tagline: String(body.tagline ?? "").trim(),
      city: String(body.city ?? "Encarnación").trim() || "Encarnación",
      description: String(body.description ?? "").trim(),
      etaMin: Number.isInteger(Number(body.etaMin)) ? Number(body.etaMin) : 30,
      etaMax: Number.isInteger(Number(body.etaMax)) ? Number(body.etaMax) : 60,
      deliveryFee: Number.isFinite(Number(body.deliveryFee)) && Number(body.deliveryFee) >= 0
        ? Math.round(Number(body.deliveryFee))
        : 0,
      plan: "unico",
      commissionBps: pct(body.commissionPct, 0),
      serviceFeeBps: pct(body.serviceFeePct, 1000),
      serviceFeeMin: Number.isFinite(Number(body.serviceFeeMin)) && Number(body.serviceFeeMin) >= 0
        ? Math.round(Number(body.serviceFeeMin))
        : 3500,
      serviceFee: 0,
      dispatchMode: "cercania",
      autoAssign: true,
      baseLat: Number.isFinite(Number(body.baseLat)) ? Number(body.baseLat) : -27.3306,
      baseLng: Number.isFinite(Number(body.baseLng)) ? Number(body.baseLng) : -55.8667,
    })
    .returning();

  return NextResponse.json({ brand: inserted[0] }, { status: 201 });
}
