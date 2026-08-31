import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { drivers, orderMessages, orders } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export interface ChatAccess {
  ok: boolean;
  /** rol desde el que participa: cliente | repartidor | marca | plataforma */
  chatRole: "cliente" | "repartidor" | "marca" | "plataforma" | null;
  orderId?: number;
}

/**
 * ¿Puede este usuario conversar sobre el pedido? Solo se permite cuando ya
 * hay un vendedor asignado: el chat es entre el cliente y su vendedor.
 * Devuelve además desde qué rol participa (para las burbujas).
 */
export async function chatAccessFor(orderId: number): Promise<ChatAccess> {
  const user = await getSessionUser();
  if (!user) return { ok: false, chatRole: null };

  const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) return { ok: false, chatRole: null };

  // Cliente dueño del pedido
  if (order.userId === user.id) {
    return { ok: order.driverId != null, chatRole: "cliente", orderId };
  }

  // Vendedor asignado
  if (order.driverId) {
    const dRows = await db
      .select({ userId: drivers.userId, brandId: drivers.brandId })
      .from(drivers)
      .where(eq(drivers.id, order.driverId))
      .limit(1);
    if (dRows[0]?.userId === user.id) {
      return { ok: true, chatRole: "repartidor", orderId };
    }
  }

  // Staff de la marca del pedido (o plataforma)
  if (user.role === "plataforma" || (user.role === "marca" && user.brandId === order.brandId)) {
    return { ok: true, chatRole: user.role === "plataforma" ? "plataforma" : "marca", orderId };
  }

  return { ok: false, chatRole: null };
}

/** Historial de mensajes del chat del pedido. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const access = await chatAccessFor(orderId);
  if (!access.ok) {
    return NextResponse.json(
      { error: "Este chat todavía no está disponible (falta asignar vendedor o no es tu pedido)." },
      { status: 403 }
    );
  }

  const rows = await db
    .select()
    .from(orderMessages)
    .where(eq(orderMessages.orderId, orderId))
    .orderBy(asc(orderMessages.createdAt), asc(orderMessages.id))
    .limit(300);

  return NextResponse.json({
    chatRole: access.chatRole,
    messages: rows.map((m) => ({
      id: m.id,
      senderRole: m.senderRole,
      senderName: m.senderName,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

/** Enviar un mensaje al chat del pedido. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const access = await chatAccessFor(orderId);
  const user = await getSessionUser();
  if (!access.ok || !user) {
    return NextResponse.json({ error: "No podés escribir en este chat." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (text.length < 1 || text.length > 1000) {
    return NextResponse.json({ error: "El mensaje debe tener entre 1 y 1000 caracteres." }, { status: 400 });
  }

  const [created] = await db
    .insert(orderMessages)
    .values({
      orderId,
      senderRole: access.chatRole!,
      senderName: user.name,
      body: text,
    })
    .returning();

  return NextResponse.json({
    message: {
      id: created.id,
      senderRole: created.senderRole,
      senderName: created.senderName,
      body: created.body,
      createdAt: created.createdAt.toISOString(),
    },
  }, { status: 201 });
}
