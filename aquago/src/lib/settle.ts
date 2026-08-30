import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, commissions, settlements } from "@/db/schema";
import {
  ceilToCashStep,
  cycleDays,
  newSettlementCode,
  SETTLEMENT_GRACE_DAYS,
  SUSPEND_AFTER_DAYS,
} from "./pricing";

export interface SettlementResult {
  brandId: number;
  brandName: string;
  created: boolean;
  code?: string;
  ordersCount: number;
  commissionTotal: number;
  serviceFeeTotal: number;
  monthlyFee: number;
  retainedAmount: number;
  amountDue: number;
  reason?: string;
}

/**
 * Corre el cierre de período para una o todas las marcas.
 * Esto es lo que dispararía un cron diario: junta las comisiones
 * pendientes, emite la liquidación y deja el saldo listo para cobrar.
 */
export async function runSettlements(brandId?: number): Promise<SettlementResult[]> {
  const brandRows = brandId
    ? await db.select().from(brands).where(eq(brands.id, brandId))
    : await db.select().from(brands);

  const results: SettlementResult[] = [];

  for (const brand of brandRows) {
    const pending = await db
      .select()
      .from(commissions)
      .where(and(eq(commissions.brandId, brand.id), eq(commissions.status, "pendiente")));

    if (pending.length === 0) {
      results.push({
        brandId: brand.id,
        brandName: brand.name,
        created: false,
        ordersCount: 0,
        commissionTotal: 0,
        serviceFeeTotal: 0,
        monthlyFee: 0,
        retainedAmount: 0,
        amountDue: 0,
        reason: "Sin comisiones pendientes",
      });
      continue;
    }

    const commissionTotal = pending.reduce((s, c) => s + c.commissionAmount, 0);
    const serviceFeeTotal = pending.reduce((s, c) => s + c.serviceFee, 0);
    const grossSales = pending.reduce((s, c) => s + c.gross, 0);

    // Lo cobrado por transferencia ya pasó por la cuenta de AquaGo:
    // esa parte se retiene sola, no hay que perseguirla.
    const retainedAmount = pending
      .filter((c) => c.collectionMode === "retenida")
      .reduce((s, c) => s + c.platformRevenue, 0);

    // El abono del plan se prorratea al ciclo (semanal = 1/4 del mes)
    const days = cycleDays(brand.billingCycle);
    const monthlyFee = Math.round((brand.monthlyFee * days) / 30);

    // Se paga en efectivo o transferencia: redondeamos hacia arriba a 500 Gs.
    const amountDue = ceilToCashStep(
      Math.max(0, commissionTotal + serviceFeeTotal + monthlyFee - retainedAmount)
    );

    const dates = pending.map((c) => c.createdAt.getTime());
    const periodStart = new Date(Math.min(...dates));
    const periodEnd = new Date(Math.max(...dates));
    const dueDate = new Date(Date.now() + SETTLEMENT_GRACE_DAYS * 864e5);
    const code = newSettlementCode(brand.slug, new Date());

    await db.transaction(async (tx) => {
      const [settlement] = await tx
        .insert(settlements)
        .values({
          brandId: brand.id,
          code,
          periodStart,
          periodEnd,
          ordersCount: pending.length,
          grossSales,
          commissionTotal,
          serviceFeeTotal,
          monthlyFee,
          retainedAmount,
          amountDue,
          status: "emitida",
          dueDate,
        })
        .returning();

      await tx
        .update(commissions)
        .set({ status: "liquidada", settlementId: settlement.id })
        .where(inArray(commissions.id, pending.map((c) => c.id)));

      // La parte retenida ya está cobrada: se acredita en la cuenta corriente
      if (retainedAmount > 0) {
        await tx
          .update(brands)
          .set({ walletBalance: sql`${brands.walletBalance} + ${retainedAmount}` })
          .where(eq(brands.id, brand.id));
      }
    });

    results.push({
      brandId: brand.id,
      brandName: brand.name,
      created: true,
      code,
      ordersCount: pending.length,
      commissionTotal,
      serviceFeeTotal,
      monthlyFee,
      retainedAmount,
      amountDue,
    });
  }

  return results;
}

/** Marca una liquidación como pagada y regulariza la cuenta corriente. */
export async function markSettlementPaid(settlementId: number) {
  const rows = await db.select().from(settlements).where(eq(settlements.id, settlementId)).limit(1);
  const s = rows[0];
  if (!s || s.status === "pagada") return null;

  await db.transaction(async (tx) => {
    await tx
      .update(settlements)
      .set({ status: "pagada", paidAt: new Date() })
      .where(eq(settlements.id, settlementId));

    await tx
      .update(brands)
      .set({
        walletBalance: sql`${brands.walletBalance} + ${s.amountDue}`,
        billingStatus: "al_dia",
        suspendedAt: null,
        suspendedReason: "",
      })
      .where(eq(brands.id, s.brandId));
  });

  // Si le quedaban otras vencidas, refreshOverdue la vuelve a suspender.
  await refreshOverdue();
  return true;
}

export interface OverdueReport {
  markedOverdue: number;
  suspended: { brandId: number; brandName: string; daysLate: number; amount: number }[];
  reactivated: { brandId: number; brandName: string }[];
}

/**
 * Cierre de cobranza automático. Pensado para correr en un cron diario:
 *
 *   1. Liquidación vencida  -> estado "vencida", marca "por_vencer" (aviso).
 *   2. Más de SUSPEND_AFTER_DAYS de mora -> marca "suspendida": deja de
 *      recibir pedidos hasta que regularice.
 *   3. Si ya no debe nada -> se reactiva sola.
 */
export async function refreshOverdue(): Promise<OverdueReport> {
  const now = new Date();
  const report: OverdueReport = { markedOverdue: 0, suspended: [], reactivated: [] };

  const open = await db.select().from(settlements).where(eq(settlements.status, "emitida"));
  for (const s of open) {
    if (s.dueDate < now && s.amountDue > 0) {
      await db.update(settlements).set({ status: "vencida" }).where(eq(settlements.id, s.id));
      report.markedOverdue++;
    }
  }

  const brandRows = await db.select().from(brands);
  for (const brand of brandRows) {
    const overdue = await db
      .select()
      .from(settlements)
      .where(and(eq(settlements.brandId, brand.id), eq(settlements.status, "vencida")));

    const debt = overdue.reduce((sum, s) => sum + s.amountDue, 0);

    if (debt === 0) {
      // Se puso al día: vuelve a la app sola.
      if (brand.billingStatus !== "al_dia") {
        await db
          .update(brands)
          .set({ billingStatus: "al_dia", suspendedAt: null, suspendedReason: "" })
          .where(eq(brands.id, brand.id));
        if (brand.billingStatus === "suspendida") {
          report.reactivated.push({ brandId: brand.id, brandName: brand.name });
        }
      }
      continue;
    }

    const oldest = overdue.reduce((a, b) => (a.dueDate < b.dueDate ? a : b));
    const daysLate = Math.floor((now.getTime() - oldest.dueDate.getTime()) / 864e5);

    if (daysLate >= SUSPEND_AFTER_DAYS) {
      if (brand.billingStatus !== "suspendida") {
        await db
          .update(brands)
          .set({
            billingStatus: "suspendida",
            suspendedAt: now,
            suspendedReason: `${daysLate} días de mora · ${debt} Gs impagos`,
          })
          .where(eq(brands.id, brand.id));
        report.suspended.push({
          brandId: brand.id,
          brandName: brand.name,
          daysLate,
          amount: debt,
        });
      }
    } else if (brand.billingStatus === "al_dia") {
      await db
        .update(brands)
        .set({ billingStatus: "por_vencer" })
        .where(eq(brands.id, brand.id));
    }
  }

  return report;
}
