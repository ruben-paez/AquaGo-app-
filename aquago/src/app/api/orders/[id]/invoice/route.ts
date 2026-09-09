import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, brands, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getCompanySettings } from "@/lib/company-settings";
import { buildInvoicePdf } from "@/lib/pdf-invoice";

export const dynamic = "force-dynamic";

/**
 * Comprobante interno de compra en PDF. Disponible SOLO cuando el pedido
 * está entregado. Pueden descargarlo: el cliente dueño del pedido, la
 * marca del pedido y la plataforma.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const rows = await db
    .select({
      order: orders,
      brandName: brands.name,
      brandTagline: brands.tagline,
      customerName: users.name,
      customerPhone: users.phone,
    })
    .from(orders)
    .leftJoin(brands, eq(orders.brandId, brands.id))
    .leftJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  }

  // Permisos: cliente dueño, marca del pedido o plataforma.
  const esDueno = user.role === "cliente" && row.order.userId === user.id;
  const esMarca = user.role === "marca" && row.order.brandId === user.brandId;
  const esPlataforma = user.role === "plataforma";
  if (!esDueno && !esMarca && !esPlataforma) {
    return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  }

  // Solo pedidos entregados tienen comprobante.
  if (row.order.status !== "entregada") {
    return NextResponse.json(
      { error: "El comprobante se genera cuando el pedido queda entregado." },
      { status: 403 }
    );
  }

  const items = await db
    .select({ quantity: orderItems.quantity, name: orderItems.name, unitPrice: orderItems.unitPrice })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const company = await getCompanySettings();
  const fecha = (row.order.updatedAt ?? row.order.createdAt).toLocaleString(
    "es-PY",
    { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
  );

  const pdf = buildInvoicePdf({
    code: row.order.code,
    brandName: row.brandName ?? "AQUAnat",
    brandTagline: row.brandTagline,
    customerName: row.customerName ?? "Cliente",
    customerPhone: row.customerPhone ?? "",
    addressLabel: row.order.addressLabel,
    items,
    subtotal: row.order.subtotal,
    serviceFee: row.order.serviceFee,
    total: row.order.total,
    paymentMethod: row.order.paymentMethod,
    changeFrom: row.order.changeFrom,
    deliveredAt: fecha,
    company,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="comprobante-${row.order.code}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
