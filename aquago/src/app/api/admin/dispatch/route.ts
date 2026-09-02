import { NextResponse } from "next/server";
import { eq, sql, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brands, orders } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import {
  assignOrder,
  autoAssignPending,
  getDriverLoads,
  rankDrivers,
  fairnessIndex,
  DispatchMode,
} from "@/lib/dispatch";

/** Vista de despacho: pedidos sin asignar + ranking de candidatos. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  let brandParam = searchParams.get("brandId");
  // La marca solo ve el despacho de SU marca.
  if (user.role === "marca") brandParam = String(user.brandId ?? -1);

  const brandRows = await db.select().from(brands).where(eq(brands.comingSoon, false));
  const brand =
    brandParam && brandParam !== "todas"
      ? brandRows.find((b) => b.id === Number(brandParam))
      : brandRows[0];

  if (!brand) return NextResponse.json({ error: "Marca no encontrada." }, { status: 404 });

  const mode = brand.dispatchMode as DispatchMode;
  const driverLoads = await getDriverLoads(brand.id);

  const unassigned = await db
    .select({
      id: orders.id,
      code: orders.code,
      addressLabel: orders.addressLabel,
      zone: orders.zone,
      lat: orders.lat,
      lng: orders.lng,
      total: orders.total,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.brandId, brand.id),
        sql`${orders.driverId} is null`,
        inArray(orders.status, ["pendiente", "aceptada"])
      )
    )
    .orderBy(orders.createdAt)
    .limit(25);

  // Para cada pedido sin asignar, calculamos a quién le tocaría y por qué.
  const queue = unassigned.map((o) => {
    const ranked =
      o.lat != null && o.lng != null
        ? rankDrivers(driverLoads, o.lat, o.lng, mode).slice(0, 4)
        : [];
    return {
      id: o.id,
      code: o.code,
      addressLabel: o.addressLabel,
      zone: o.zone,
      total: o.total,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      candidates: ranked.map((c) => ({
        driverId: c.driver.id,
        name: c.driver.name,
        vehicle: c.driver.vehicle,
        distanceKm: Math.round(c.distanceKm * 10) / 10,
        etaMin: c.etaMin,
        activeOrders: c.driver.activeOrders,
        capacity: c.driver.capacity,
        deliveredToday: c.driver.deliveredToday,
        score: Math.round(c.score * 100) / 100,
        breakdown: {
          distance: Math.round(c.breakdown.distance * 100) / 100,
          load: Math.round(c.breakdown.load * 100) / 100,
          fairness: Math.round(c.breakdown.fairness * 100) / 100,
        },
        eligible: c.eligible,
        reason: c.reason,
      })),
    };
  });

  const todayCounts = driverLoads.map((d) => d.deliveredToday);

  return NextResponse.json({
    brand: {
      id: brand.id,
      name: brand.name,
      dispatchMode: brand.dispatchMode,
      autoAssign: brand.autoAssign,
    },
    brands: brandRows.map((b) => ({ id: b.id, name: b.name })),
    drivers: driverLoads,
    queue,
    fairness: Math.round(fairnessIndex(todayCounts) * 100),
  });
}

/** Acciones: asignar uno, asignar todos, o cambiar la configuración. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");

  if (action === "assign") {
    const orderId = Number(body.orderId);
    if (!Number.isInteger(orderId)) {
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    }
    // La marca solo asigna pedidos de SU marca.
    if (user.role === "marca") {
      const own = await db
        .select({ brandId: orders.brandId })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      if (own.length === 0 || own[0].brandId !== user.brandId) {
        return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
      }
    }
    const driverId = Number.isInteger(Number(body.driverId)) ? Number(body.driverId) : undefined;
    const mode = (body.mode as DispatchMode) ?? undefined;
    const result = await assignOrder(orderId, { driverId, mode });
    return NextResponse.json({ result });
  }

  if (action === "assign_all") {
    const brandId = Number(body.brandId);
    if (!Number.isInteger(brandId)) {
      return NextResponse.json({ error: "Marca inválida." }, { status: 400 });
    }
    if (user.role === "marca" && brandId !== user.brandId) {
      return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
    }
    const brandRows = await db.select().from(brands).where(eq(brands.id, brandId)).limit(1);
    const mode = (body.mode as DispatchMode) ?? (brandRows[0]?.dispatchMode as DispatchMode);
    const results = await autoAssignPending(brandId, mode ?? "equilibrado");
    return NextResponse.json({ results });
  }

  if (action === "config") {
    const brandId = Number(body.brandId);
    if (!Number.isInteger(brandId)) {
      return NextResponse.json({ error: "Marca inválida." }, { status: 400 });
    }
    if (user.role === "marca" && brandId !== user.brandId) {
      return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
    }
    const patch: Record<string, unknown> = {};
    if (["cercania", "equilibrado", "equitativo"].includes(body.dispatchMode)) {
      patch.dispatchMode = body.dispatchMode;
    }
    if (typeof body.autoAssign === "boolean") patch.autoAssign = body.autoAssign;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
    }
    await db.update(brands).set(patch).where(eq(brands.id, brandId));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
}
