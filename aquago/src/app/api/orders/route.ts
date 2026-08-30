import { NextResponse } from "next/server";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, products, brands, commissions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/queries";
import { newOrderCode } from "@/lib/format";
import { computeOrderEconomics, collectionModeFor } from "@/lib/pricing";
import { zoneFor } from "@/lib/zones";
import { assignOrder, DispatchMode } from "@/lib/dispatch";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const ordersList = await getOrdersForUser(user.id);
  return NextResponse.json({ orders: ordersList });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión para pedir." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) {
    return NextResponse.json({ error: "Agrega al menos un producto." }, { status: 400 });
  }

  const items = rawItems
    .map((i: { productId?: unknown; quantity?: unknown }) => ({
      productId: Number(i?.productId),
      quantity: Number(i?.quantity),
    }))
    .filter(
      (i: { productId: number; quantity: number }) =>
        Number.isInteger(i.productId) &&
        Number.isInteger(i.quantity) &&
        i.quantity >= 1 &&
        i.quantity <= 20
    );

  if (items.length === 0) {
    return NextResponse.json({ error: "Agrega al menos un producto válido." }, { status: 400 });
  }

  const qtyByProduct = new Map<number, number>();
  for (const i of items) {
    qtyByProduct.set(i.productId, (qtyByProduct.get(i.productId) ?? 0) + i.quantity);
  }
  const ids = [...qtyByProduct.keys()];

  const found = await db.select().from(products).where(inArray(products.id, ids));
  const productById = new Map(found.map((p) => [p.id, p]));

  const missing = ids.filter((id) => !productById.has(id) || !productById.get(id)!.active);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Algunos productos ya no están disponibles." },
      { status: 400 }
    );
  }

  const brandIds = new Set(found.map((p) => p.brandId));
  if (brandIds.size > 1) {
    return NextResponse.json({ error: "Cada pedido debe ser de una sola marca." }, { status: 400 });
  }
  const brandId = found[0].brandId;

  const brandRow = await db.select().from(brands).where(eq(brands.id, brandId)).limit(1);
  const brand = brandRow[0];
  if (!brand || !brand.active || brand.comingSoon) {
    return NextResponse.json(
      { error: "Esa marca todavía no está recibiendo pedidos." },
      { status: 400 }
    );
  }
  if (brand.billingStatus === "suspendida") {
    return NextResponse.json(
      { error: "Esta marca está temporalmente fuera de servicio." },
      { status: 400 }
    );
  }

  const paymentMethod = body.paymentMethod === "transferencia" ? "transferencia" : "efectivo";
  const changeFrom =
    paymentMethod === "efectivo" &&
    Number.isInteger(Number(body.changeFrom)) &&
    Number(body.changeFrom) > 0
      ? Number(body.changeFrom)
      : null;

  const addressLabel = String(body.addressLabel ?? user.addressLabel ?? "").trim();
  const lat = Number(body.lat ?? user.lat);
  const lng = Number(body.lng ?? user.lng);
  const notes = String(body.notes ?? user.deliveryNotes ?? "").trim();

  if (!addressLabel) {
    return NextResponse.json({ error: "Falta la dirección de entrega." }, { status: 400 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Marca el punto de entrega en el mapa." }, { status: 400 });
  }

  // Subtotal con precios del catálogo (nunca los que manda el cliente)
  let subtotal = 0;
  const orderItemsValues = ids.map((id) => {
    const p = productById.get(id)!;
    const qty = qtyByProduct.get(id)!;
    subtotal += p.price * qty;
    return { productId: p.id, name: p.name, unitPrice: p.price, quantity: qty };
  });

  // El precio de lista no se toca: la comisión sale del lado de la marca
  const econ = computeOrderEconomics(subtotal, brand.commissionBps, {
    serviceFeeBps: brand.serviceFeeBps,
    serviceFeeMin: brand.serviceFeeMin,
    serviceFee: brand.serviceFee,
  });
  const collectionMode = collectionModeFor(paymentMethod);
  const zone = zoneFor(lat, lng);
  const code = newOrderCode();

  const created = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        code,
        userId: user.id,
        brandId,
        status: "pendiente",
        paymentMethod,
        changeFrom,
        addressLabel,
        zone,
        lat,
        lng,
        notes,
        subtotal: econ.subtotal,
        serviceFee: econ.serviceFee,
        total: econ.total,
        commissionBps: econ.commissionBps,
        commissionAmount: econ.commissionAmount,
        netToBrand: econ.netToBrand,
      })
      .returning();

    await tx.insert(orderItems).values(orderItemsValues.map((v) => ({ ...v, orderId: order.id })));

    // Asiento de comisión: se genera junto con el pedido
    await tx.insert(commissions).values({
      orderId: order.id,
      brandId,
      orderCode: order.code,
      gross: econ.subtotal,
      commissionBps: econ.commissionBps,
      commissionAmount: econ.commissionAmount,
      serviceFee: econ.serviceFee,
      platformRevenue: econ.platformRevenue,
      paymentMethod,
      collectionMode,
      status: "pendiente",
    });

    // Cuenta corriente de la marca: la comisión queda como saldo en contra
    await tx
      .update(brands)
      .set({ walletBalance: sql`${brands.walletBalance} - ${econ.platformRevenue}` })
      .where(eq(brands.id, brandId));

    return order;
  });

  // Despacho automático: apenas entra el pedido se busca al mejor repartidor.
  if (brand.autoAssign) {
    try {
      await assignOrder(created.id, { mode: brand.dispatchMode as DispatchMode });
    } catch {
      // Si falla el despacho el pedido igual queda tomado y se asigna a mano.
    }
  }

  const own = await getOrdersForUser(user.id);
  const full = own.find((o) => o.id === created.id);

  return NextResponse.json({ order: full ?? own[0] }, { status: 201 });
}
