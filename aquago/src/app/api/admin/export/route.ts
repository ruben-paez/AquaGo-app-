import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, users, brands } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Exportación CSV (abre directo en Excel / Google Sheets) para que la
 * plataforma y cada marca tengan SU copia de los datos fuera de la app.
 * Es el plan B gratis ante cualquier problema con la base: tocar los dos
 * botones del panel de vez en cuando y guardar los archivos.
 */

function csvField(v: unknown): string {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}

function csvResponse(text: string, filename: string) {
  return new Response(`\uFEFF${text}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const what = searchParams.get("what") === "clientes" ? "clientes" : "pedidos";
  // La marca exporta solo lo suyo; la plataforma, todo.
  const brandScope = user.role === "marca" ? user.brandId ?? -1 : undefined;

  if (what === "pedidos") {
    const rows = await db
      .select({
        id: orders.id,
        code: orders.code,
        createdAt: orders.createdAt,
        status: orders.status,
        brandName: brands.name,
        customerName: users.name,
        customerPhone: users.phone,
        addressLabel: orders.addressLabel,
        paymentMethod: orders.paymentMethod,
        changeFrom: orders.changeFrom,
        subtotal: orders.subtotal,
        serviceFee: orders.serviceFee,
        total: orders.total,
        driverName: orders.driverName,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .leftJoin(brands, eq(orders.brandId, brands.id))
      .where(brandScope !== undefined ? eq(orders.brandId, brandScope) : undefined)
      .orderBy(sql`${orders.createdAt} desc`)
      .limit(5000);

    const orderIds = rows.map((r) => r.id);
    const items =
      orderIds.length > 0
        ? await db
            .select({ orderId: orderItems.orderId, quantity: orderItems.quantity, name: orderItems.name })
            .from(orderItems)
            .where(inArray(orderItems.orderId, orderIds))
        : [];
    const itemsByOrder = new Map<number, string[]>();
    for (const it of items) {
      const list = itemsByOrder.get(it.orderId) ?? [];
      list.push(`${it.quantity}x ${it.name}`);
      itemsByOrder.set(it.orderId, list);
    }

    const head = "Codigo;Fecha;Estado;Marca;Cliente;Telefono;Direccion;Productos;Pago;PagaCon;Subtotal;Servicio;Total;Repartidor";
    const lines = rows.map((r) =>
      [
        r.code,
        fmtDate(r.createdAt),
        r.status,
        r.brandName ?? "",
        r.customerName ?? "",
        r.customerPhone ?? "",
        r.addressLabel ?? "",
        (itemsByOrder.get(r.id) ?? []).join(" | "),
        r.paymentMethod,
        r.changeFrom ?? "",
        r.subtotal,
        r.serviceFee,
        r.total,
        r.driverName ?? "",
      ]
        .map(csvField)
        .join(";")
    );

    return csvResponse([head, ...lines].join("\n"), `pedidos-aquago-${today()}.csv`);
  }

  // Clientes: igual que la pestaña Clientes. La marca solo ve a quienes
  // le compraron; la plataforma ve todos los registrados.
  const rows = await db
    .select({
      name: users.name,
      phone: users.phone,
      email: users.email,
      addressLabel: users.addressLabel,
      createdAt: users.createdAt,
      orderCount: sql<number>`count(${orders.id})::int`,
      spent: sql<number>`coalesce(sum(${orders.total}),0)::int`,
      lastOrderAt: sql<string | null>`max(${orders.createdAt})::text`,
    })
    .from(users)
    .leftJoin(
      orders,
      brandScope !== undefined
        ? and(eq(orders.userId, users.id), eq(orders.brandId, brandScope))
        : eq(orders.userId, users.id)
    )
    .where(eq(users.role, "cliente"))
    .groupBy(users.id)
    .orderBy(sql`count(${orders.id}) desc`)
    .limit(5000);

  const visibles = user.role === "marca" ? rows.filter((r) => r.orderCount > 0) : rows;

  const head = "Nombre;Telefono;Email;Direccion;Registrado;Pedidos;TotalGastado;UltimoPedido";
  const lines = visibles.map((r) =>
    [
      r.name,
      r.phone,
      r.email ?? "",
      r.addressLabel ?? "",
      fmtDate(r.createdAt),
      r.orderCount,
      r.spent,
      fmtDate(r.lastOrderAt),
    ]
      .map(csvField)
      .join(";")
  );

  return csvResponse([head, ...lines].join("\n"), `clientes-aquago-${today()}.csv`);
}
