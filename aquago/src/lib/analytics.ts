import { sql, eq, and, gte, ne } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, users, brands, commissions, settlements } from "@/db/schema";

export interface AnalyticsPayload {
  kpis: {
    orders30: number;
    gmv30: number;
    platformRevenue30: number;
    avgTicket: number;
    activeCustomers30: number;
    newCustomers30: number;
    repeatRate: number;
    avgDaysBetweenOrders: number;
    litersDelivered30: number;
  };
  series: { date: string; orders: number; gmv: number; revenue: number }[];
  zones: { zone: string; orders: number; gmv: number; customers: number; lat: number; lng: number }[];
  hours: { hour: number; orders: number }[];
  weekdays: { weekday: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  paymentMix: { method: string; orders: number; amount: number }[];
  topCustomers: {
    id: number;
    name: string;
    zone: string;
    ordersCount: number;
    spent: number;
    lastOrder: string;
    avgDays: number | null;
  }[];
  atRisk: {
    id: number;
    name: string;
    phone: string;
    zone: string;
    daysSince: number;
    avgDays: number;
    ordersCount: number;
  }[];
  brandsPerf: {
    id: number;
    name: string;
    orders: number;
    gmv: number;
    commission: number;
    commissionBps: number;
    plan: string;
    walletBalance: number;
    billingStatus: string;
  }[];
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getAnalytics(brandId?: number): Promise<AnalyticsPayload> {
  const since30 = new Date(Date.now() - 30 * 864e5);
  const delivered = ne(orders.status, "cancelada");
  const scope = brandId ? and(delivered, eq(orders.brandId, brandId)) : delivered;
  const scope30 = brandId
    ? and(delivered, eq(orders.brandId, brandId), gte(orders.createdAt, since30))
    : and(delivered, gte(orders.createdAt, since30));

  /* ---------- KPIs de los últimos 30 días ---------- */
  const kpiRow = await db
    .select({
      orders: sql<number>`count(*)::int`,
      gmv: sql<number>`coalesce(sum(${orders.total}),0)::int`,
      revenue: sql<number>`coalesce(sum(${orders.commissionAmount} + ${orders.serviceFee}),0)::int`,
      customers: sql<number>`count(distinct ${orders.userId})::int`,
    })
    .from(orders)
    .where(scope30);

  const k = kpiRow[0] ?? { orders: 0, gmv: 0, revenue: 0, customers: 0 };

  const newCustRow = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(gte(users.createdAt, since30));

  // Clientes con más de un pedido (recurrencia) en toda la historia
  const repeatRow = await db
    .select({
      total: sql<number>`count(*)::int`,
      repeat: sql<number>`count(*) filter (where c > 1)::int`,
    })
    .from(
      db
        .select({ u: orders.userId, c: sql<number>`count(*)`.as("c") })
        .from(orders)
        .where(scope)
        .groupBy(orders.userId)
        .as("per_user")
    );

  // Días promedio entre pedidos del mismo cliente
  const gapRow = await db.execute(sql`
    select coalesce(avg(gap),0)::float as avg_gap from (
      select extract(epoch from (created_at - lag(created_at) over (partition by user_id order by created_at))) / 86400 as gap
      from orders
      where status <> 'cancelada' ${brandId ? sql`and brand_id = ${brandId}` : sql``}
    ) t where gap is not null
  `);
  const avgGap = Number((gapRow.rows[0] as { avg_gap?: number })?.avg_gap ?? 0);

  // Litros repartidos: se infiere del nombre del producto (20 L, 10 L…)
  const litersRow = await db.execute(sql`
    select coalesce(sum(
      oi.quantity * coalesce(nullif(substring(oi.name from '([0-9]+)\\s*L'), '')::int, 0)
    ),0)::int as liters
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.status <> 'cancelada' and o.created_at >= ${since30.toISOString()}
    ${brandId ? sql`and o.brand_id = ${brandId}` : sql``}
  `);
  const liters = Number((litersRow.rows[0] as { liters?: number })?.liters ?? 0);

  /* ---------- Serie diaria ---------- */
  const seriesRows = await db
    .select({
      date: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
      orders: sql<number>`count(*)::int`,
      gmv: sql<number>`coalesce(sum(${orders.total}),0)::int`,
      revenue: sql<number>`coalesce(sum(${orders.commissionAmount} + ${orders.serviceFee}),0)::int`,
    })
    .from(orders)
    .where(scope30)
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  // Rellenar días sin ventas para que el gráfico no mienta
  const byDate = new Map(seriesRows.map((r) => [r.date, r]));
  const series: AnalyticsPayload["series"] = [];
  for (let i = 29; i >= 0; i--) {
    const d = iso(new Date(Date.now() - i * 864e5));
    const row = byDate.get(d);
    series.push({ date: d, orders: row?.orders ?? 0, gmv: row?.gmv ?? 0, revenue: row?.revenue ?? 0 });
  }

  /* ---------- Zonas ---------- */
  const zoneRows = await db
    .select({
      zone: orders.zone,
      orders: sql<number>`count(*)::int`,
      gmv: sql<number>`coalesce(sum(${orders.total}),0)::int`,
      customers: sql<number>`count(distinct ${orders.userId})::int`,
      lat: sql<number>`coalesce(avg(${orders.lat}),0)::float`,
      lng: sql<number>`coalesce(avg(${orders.lng}),0)::float`,
    })
    .from(orders)
    .where(scope)
    .groupBy(orders.zone)
    .orderBy(sql`2 desc`)
    .limit(12);

  /* ---------- Horas y días ---------- */
  const hourRows = await db
    .select({
      hour: sql<number>`extract(hour from ${orders.createdAt})::int`,
      orders: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(scope)
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const weekdayRows = await db
    .select({
      weekday: sql<number>`extract(dow from ${orders.createdAt})::int`,
      orders: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(scope)
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  /* ---------- Productos ---------- */
  const productRows = await db
    .select({
      name: orderItems.name,
      quantity: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPrice})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(scope)
    .groupBy(orderItems.name)
    .orderBy(sql`3 desc`)
    .limit(8);

  /* ---------- Medios de pago ---------- */
  const payRows = await db
    .select({
      method: orders.paymentMethod,
      orders: sql<number>`count(*)::int`,
      amount: sql<number>`coalesce(sum(${orders.total}),0)::int`,
    })
    .from(orders)
    .where(scope)
    .groupBy(orders.paymentMethod);

  /* ---------- Clientes top ---------- */
  const topCustRows = await db
    .select({
      id: users.id,
      name: users.name,
      zone: users.zone,
      ordersCount: sql<number>`count(${orders.id})::int`,
      spent: sql<number>`coalesce(sum(${orders.total}),0)::int`,
      lastOrder: sql<string>`max(${orders.createdAt})::text`,
      firstOrder: sql<string>`min(${orders.createdAt})::text`,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(scope)
    .groupBy(users.id, users.name, users.zone)
    .orderBy(sql`5 desc`)
    .limit(10);

  const topCustomers = topCustRows.map((c) => {
    const first = new Date(c.firstOrder).getTime();
    const last = new Date(c.lastOrder).getTime();
    const avgDays =
      c.ordersCount > 1 ? Math.round((last - first) / 864e5 / (c.ordersCount - 1)) : null;
    return {
      id: c.id,
      name: c.name,
      zone: c.zone,
      ordersCount: c.ordersCount,
      spent: c.spent,
      lastOrder: new Date(c.lastOrder).toISOString(),
      avgDays,
    };
  });

  /* ---------- Clientes en riesgo de fuga ---------- */
  const riskRows = await db.execute(sql`
    select u.id, u.name, u.phone, u.zone,
           count(o.id)::int as orders_count,
           max(o.created_at) as last_order,
           (extract(epoch from (now() - max(o.created_at))) / 86400)::float as days_since,
           (extract(epoch from (max(o.created_at) - min(o.created_at))) / 86400 / nullif(count(o.id) - 1, 0))::float as avg_days
    from orders o
    join users u on u.id = o.user_id
    where o.status <> 'cancelada' ${brandId ? sql`and o.brand_id = ${brandId}` : sql``}
    group by u.id, u.name, u.phone, u.zone
    having count(o.id) >= 2
       and (extract(epoch from (now() - max(o.created_at))) / 86400)
           > 1.5 * (extract(epoch from (max(o.created_at) - min(o.created_at))) / 86400 / nullif(count(o.id) - 1, 0))
    order by days_since desc
    limit 10
  `);

  const atRisk = (riskRows.rows as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    phone: String(r.phone),
    zone: String(r.zone ?? ""),
    daysSince: Math.round(Number(r.days_since ?? 0)),
    avgDays: Math.round(Number(r.avg_days ?? 0)),
    ordersCount: Number(r.orders_count ?? 0),
  }));

  /* ---------- Performance por marca ---------- */
  const brandRows = await db
    .select({
      id: brands.id,
      name: brands.name,
      commissionBps: brands.commissionBps,
      plan: brands.plan,
      walletBalance: brands.walletBalance,
      billingStatus: brands.billingStatus,
      orders: sql<number>`count(${orders.id})::int`,
      gmv: sql<number>`coalesce(sum(${orders.total}),0)::int`,
      commission: sql<number>`coalesce(sum(${orders.commissionAmount} + ${orders.serviceFee}),0)::int`,
    })
    .from(brands)
    .leftJoin(orders, and(eq(orders.brandId, brands.id), ne(orders.status, "cancelada")))
    .groupBy(
      brands.id,
      brands.name,
      brands.commissionBps,
      brands.plan,
      brands.walletBalance,
      brands.billingStatus
    )
    .orderBy(sql`9 desc`);

  const repeat = repeatRow[0] ?? { total: 0, repeat: 0 };

  return {
    kpis: {
      orders30: k.orders,
      gmv30: k.gmv,
      platformRevenue30: k.revenue,
      avgTicket: k.orders > 0 ? Math.round(k.gmv / k.orders) : 0,
      activeCustomers30: k.customers,
      newCustomers30: newCustRow[0]?.n ?? 0,
      repeatRate: repeat.total > 0 ? repeat.repeat / repeat.total : 0,
      avgDaysBetweenOrders: Math.round(avgGap * 10) / 10,
      litersDelivered30: liters,
    },
    series,
    zones: zoneRows,
    hours: hourRows,
    weekdays: weekdayRows,
    topProducts: productRows,
    paymentMix: payRows,
    topCustomers,
    atRisk,
    brandsPerf: brandRows,
  };
}

/* ---------------- Facturación ---------------- */

export interface BillingPayload {
  brands: {
    id: number;
    name: string;
    slug: string;
    plan: string;
    commissionBps: number;
    monthlyFee: number;
    serviceFeeBps: number;
    serviceFeeMin: number;
    serviceFee: number;
    billingCycle: string;
    autoRetention: boolean;
    billingStatus: string;
    walletBalance: number;
    pendingCommission: number;
    pendingRetained: number;
    pendingOrders: number;
  }[];
  settlements: {
    id: number;
    brandId: number;
    brandName: string;
    code: string;
    periodStart: string;
    periodEnd: string;
    ordersCount: number;
    grossSales: number;
    commissionTotal: number;
    serviceFeeTotal: number;
    monthlyFee: number;
    retainedAmount: number;
    amountDue: number;
    status: string;
    dueDate: string;
    paidAt: string | null;
  }[];
  totals: {
    pendingToCollect: number;
    settledThisMonth: number;
    overdue: number;
  };
}

export async function getBilling(brandId?: number): Promise<BillingPayload> {
  const brandRows = await db
    .select()
    .from(brands)
    .where(brandId !== undefined ? eq(brands.id, brandId) : undefined)
    .orderBy(brands.sortOrder);

  const pendingRows = await db
    .select({
      brandId: commissions.brandId,
      pending: sql<number>`coalesce(sum(${commissions.platformRevenue}),0)::int`,
      retained: sql<number>`coalesce(sum(${commissions.platformRevenue}) filter (where ${commissions.collectionMode} = 'retenida'),0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(commissions)
    .where(and(eq(commissions.status, "pendiente"), brandId !== undefined ? eq(commissions.brandId, brandId) : undefined))
    .groupBy(commissions.brandId);

  const pendingByBrand = new Map(pendingRows.map((r) => [r.brandId, r]));

  const settleRows = await db
    .select({
      id: settlements.id,
      brandId: settlements.brandId,
      brandName: brands.name,
      code: settlements.code,
      periodStart: settlements.periodStart,
      periodEnd: settlements.periodEnd,
      ordersCount: settlements.ordersCount,
      grossSales: settlements.grossSales,
      commissionTotal: settlements.commissionTotal,
      serviceFeeTotal: settlements.serviceFeeTotal,
      monthlyFee: settlements.monthlyFee,
      retainedAmount: settlements.retainedAmount,
      amountDue: settlements.amountDue,
      status: settlements.status,
      dueDate: settlements.dueDate,
      paidAt: settlements.paidAt,
    })
    .from(settlements)
    .leftJoin(brands, eq(brands.id, settlements.brandId))
    .where(brandId !== undefined ? eq(settlements.brandId, brandId) : undefined)
    .orderBy(sql`${settlements.createdAt} desc`)
    .limit(40);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let pendingToCollect = 0;
  let settledThisMonth = 0;
  let overdue = 0;
  for (const r of pendingRows) pendingToCollect += r.pending;
  for (const s of settleRows) {
    if (s.status === "pagada" && s.paidAt && s.paidAt >= monthStart) {
      settledThisMonth += s.commissionTotal + s.serviceFeeTotal + s.monthlyFee;
    }
    if (s.status !== "pagada" && s.dueDate < new Date()) overdue += s.amountDue;
  }

  return {
    brands: brandRows.map((b) => {
      const p = pendingByBrand.get(b.id);
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        plan: b.plan,
        commissionBps: b.commissionBps,
        monthlyFee: b.monthlyFee,
        serviceFeeBps: b.serviceFeeBps,
        serviceFeeMin: b.serviceFeeMin,
        serviceFee: b.serviceFee,
        billingCycle: b.billingCycle,
        autoRetention: b.autoRetention,
        billingStatus: b.billingStatus,
        walletBalance: b.walletBalance,
        pendingCommission: p?.pending ?? 0,
        pendingRetained: p?.retained ?? 0,
        pendingOrders: p?.count ?? 0,
      };
    }),
    settlements: settleRows.map((s) => ({
      id: s.id,
      brandId: s.brandId,
      brandName: s.brandName ?? "",
      code: s.code,
      periodStart: s.periodStart.toISOString(),
      periodEnd: s.periodEnd.toISOString(),
      ordersCount: s.ordersCount,
      grossSales: s.grossSales,
      commissionTotal: s.commissionTotal,
      serviceFeeTotal: s.serviceFeeTotal,
      monthlyFee: s.monthlyFee,
      retainedAmount: s.retainedAmount,
      amountDue: s.amountDue,
      status: s.status,
      dueDate: s.dueDate.toISOString(),
      paidAt: s.paidAt ? s.paidAt.toISOString() : null,
    })),
    totals: { pendingToCollect, settledThisMonth, overdue },
  };
}
