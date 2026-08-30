import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getPlan, PLANS, roundToCashStep } from "@/lib/pricing";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const { id } = await ctx.params;
  const brandId = Number(id);
  if (!Number.isInteger(brandId)) {
    return NextResponse.json({ error: "Marca inválida." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Petición inválida." }, { status: 400 });

  const patch: Record<string, unknown> = {};

  // Cambiar de plan reescribe comisión, abono y costo de servicio
  if (typeof body.plan === "string" && PLANS.some((p) => p.key === body.plan)) {
    const plan = getPlan(body.plan);
    patch.plan = plan.key;
    patch.commissionBps = plan.commissionBps;
    patch.monthlyFee = plan.monthlyFee;
    patch.serviceFeeBps = plan.serviceFeeBps;
    patch.serviceFeeMin = plan.serviceFeeMin;
  }
  // Override manual (negociación puntual con la marca)
  if (Number.isInteger(Number(body.commissionBps))) {
    const bps = Number(body.commissionBps);
    if (bps >= 0 && bps <= 3000) patch.commissionBps = bps;
  }
  if (Number.isInteger(Number(body.serviceFeeBps))) {
    const bps = Number(body.serviceFeeBps);
    if (bps >= 0 && bps <= 3000) patch.serviceFeeBps = bps;
  }
  if (Number.isInteger(Number(body.serviceFeeMin))) {
    const min = Number(body.serviceFeeMin);
    if (min >= 0 && min <= 20000) patch.serviceFeeMin = roundToCashStep(min);
  }
  if (typeof body.billingCycle === "string" && ["semanal", "quincenal", "mensual"].includes(body.billingCycle)) {
    patch.billingCycle = body.billingCycle;
  }
  if (typeof body.autoRetention === "boolean") patch.autoRetention = body.autoRetention;
  if (typeof body.billingStatus === "string" && ["al_dia", "por_vencer", "suspendida"].includes(body.billingStatus)) {
    patch.billingStatus = body.billingStatus;
  }
  if (typeof body.comingSoon === "boolean") patch.comingSoon = body.comingSoon;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }

  const updated = await db.update(brands).set(patch).where(eq(brands.id, brandId)).returning();
  if (updated.length === 0) {
    return NextResponse.json({ error: "Marca no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ brand: updated[0] });
}
