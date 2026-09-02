import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

/** Edición de marca existente. Solo plataforma. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (user.role !== "plataforma") {
    return NextResponse.json({ error: "Solo la plataforma gestiona marcas." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const brandId = Number(id);
  if (!Number.isInteger(brandId)) {
    return NextResponse.json({ error: "Marca inválida." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Petición inválida." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim().length >= 3) patch.name = body.name.trim();
  if (typeof body.tagline === "string") patch.tagline = body.tagline.trim();
  if (typeof body.city === "string" && body.city.trim()) patch.city = body.city.trim();
  if (typeof body.description === "string") patch.description = body.description.trim();
  if (typeof body.active === "boolean") patch.active = body.active;
  if (typeof body.comingSoon === "boolean") patch.comingSoon = body.comingSoon;
  if (typeof body.autoAssign === "boolean") patch.autoAssign = body.autoAssign;
  if (["cercania", "equilibrado", "equitativo"].includes(body.dispatchMode)) {
    patch.dispatchMode = body.dispatchMode;
  }
  if (Number.isInteger(Number(body.etaMin))) patch.etaMin = Number(body.etaMin);
  if (Number.isInteger(Number(body.etaMax))) patch.etaMax = Number(body.etaMax);
  if (Number.isFinite(Number(body.deliveryFee)) && Number(body.deliveryFee) >= 0) {
    patch.deliveryFee = Math.round(Number(body.deliveryFee));
  }
  const pct = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) : null;
  };
  const cb = pct(body.commissionPct);
  if (cb !== null) patch.commissionBps = cb;
  const sf = pct(body.serviceFeePct);
  if (sf !== null) patch.serviceFeeBps = sf;
  if (Number.isFinite(Number(body.serviceFeeMin)) && Number(body.serviceFeeMin) >= 0) {
    patch.serviceFeeMin = Math.round(Number(body.serviceFeeMin));
  }
  if (Number.isFinite(Number(body.baseLat)) && Number.isFinite(Number(body.baseLng))) {
    patch.baseLat = Number(body.baseLat);
    patch.baseLng = Number(body.baseLng);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }

  const updated = await db
    .update(brands)
    .set(patch)
    .where(eq(brands.id, brandId))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Marca no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ brand: updated[0] });
}
