import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

/**
 * Base de clientes: la plataforma ve a todos; cada marca ve solo a los
 * clientes que compraron a esa marca. Con estadísticas simples por cliente.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  // Para la marca, solo cuentan los pedidos hechos a SU marca.
  const orderJoin =
    user.role === "marca" && user.brandId
      ? and(eq(orders.userId, users.id), eq(orders.brandId, user.brandId))
      : eq(orders.userId, users.id);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      email: users.email,
      addressLabel: users.addressLabel,
      createdAt: users.createdAt,
      orderCount: sql<number>`count(${orders.id})::int`,
      spent: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
      lastOrderAt: sql<string | null>`max(${orders.createdAt})`,
    })
    .from(users)
    .leftJoin(orders, orderJoin)
    .where(eq(users.role, "cliente"))
    .groupBy(users.id, users.name, users.phone, users.email, users.addressLabel, users.createdAt)
    .orderBy(desc(users.createdAt));

  // La marca solo ve a quienes realmente le compraron (≥1 pedido a su marca).
  const visibles = user.role === "marca" ? rows.filter((c) => c.orderCount > 0) : rows;

  return NextResponse.json({
    customers: visibles.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      addressLabel: c.addressLabel,
      registeredAt: c.createdAt.toISOString(),
      orderCount: c.orderCount,
      spent: c.spent,
      lastOrderAt: c.lastOrderAt ? new Date(c.lastOrderAt).toISOString() : null,
    })),
  });
}
