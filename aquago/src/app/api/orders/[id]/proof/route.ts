import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, paymentProofs } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

/** Tope de subida: una foto de comprobante no necesita más que esto. */
const MAX_BYTES = 2_500_000;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** El cliente ve su comprobante; el admin, el de cualquier pedido. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const orderRows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = orderRows[0];
  if (!order) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  if (!user.isAdmin && order.userId !== user.id) {
    return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  }

  const proofs = await db
    .select()
    .from(paymentProofs)
    .where(eq(paymentProofs.orderId, orderId))
    .orderBy(desc(paymentProofs.createdAt));

  return NextResponse.json({
    proofs: proofs.map((p) => ({
      id: p.id,
      dataUrl: p.dataUrl,
      mimeType: p.mimeType,
      fileName: p.fileName,
      sizeBytes: p.sizeBytes,
      amountDeclared: p.amountDeclared,
      reference: p.reference,
      status: p.status,
      reviewNote: p.reviewNote,
      createdAt: p.createdAt.toISOString(),
      reviewedAt: p.reviewedAt ? p.reviewedAt.toISOString() : null,
    })),
  });
}

/** El cliente sube la foto del comprobante. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Debés iniciar sesión." }, { status: 401 });

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const orderRows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = orderRows[0];
  if (!order) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  if (order.userId !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "Ese pedido no es tuyo." }, { status: 403 });
  }
  if (order.paymentMethod !== "transferencia") {
    return NextResponse.json(
      { error: "Este pedido es en efectivo: no hace falta comprobante." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Petición inválida." }, { status: 400 });

  const dataUrl = String(body.dataUrl ?? "");
  const match = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    return NextResponse.json({ error: "Archivo inválido. Subí una imagen o PDF." }, { status: 400 });
  }

  const mimeType = match[1];
  if (!ALLOWED.includes(mimeType)) {
    return NextResponse.json(
      { error: "Formato no soportado. Usá JPG, PNG, WEBP o PDF." },
      { status: 400 }
    );
  }

  // base64 pesa ~4/3 del binario original
  const sizeBytes = Math.floor((match[2].length * 3) / 4);
  if (sizeBytes > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo pesa más de 2,5 MB. Sacá la foto con menos calidad." },
      { status: 400 }
    );
  }

  const amountDeclared = Number.isInteger(Number(body.amountDeclared))
    ? Number(body.amountDeclared)
    : order.total;

  const inserted = await db.transaction(async (tx) => {
    const [proof] = await tx
      .insert(paymentProofs)
      .values({
        orderId,
        userId: user.id,
        dataUrl,
        mimeType,
        fileName: String(body.fileName ?? "").slice(0, 120),
        sizeBytes,
        amountDeclared,
        reference: String(body.reference ?? "").trim().slice(0, 80),
        status: "pendiente",
      })
      .returning();

    await tx
      .update(orders)
      .set({ proofStatus: "pendiente", updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    return proof;
  });

  return NextResponse.json(
    { proof: { id: inserted.id, status: inserted.status } },
    { status: 201 }
  );
}

/** El local verifica o rechaza el comprobante. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const status = String(body?.status ?? "");
  if (!["verificado", "rechazado"].includes(status)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const proofRows = await db
    .select()
    .from(paymentProofs)
    .where(and(eq(paymentProofs.orderId, orderId), eq(paymentProofs.status, "pendiente")))
    .orderBy(desc(paymentProofs.createdAt))
    .limit(1);

  const proof = proofRows[0];
  if (!proof) {
    return NextResponse.json({ error: "No hay comprobante pendiente." }, { status: 404 });
  }

  const note = String(body?.note ?? "").trim().slice(0, 200);

  await db.transaction(async (tx) => {
    await tx
      .update(paymentProofs)
      .set({ status, reviewNote: note, reviewedAt: new Date(), reviewedBy: user.id })
      .where(eq(paymentProofs.id, proof.id));

    await tx
      .update(orders)
      .set({
        proofStatus: status,
        // Verificar el comprobante es lo que da por cobrada la transferencia.
        transferPaid: status === "verificado",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));
  });

  return NextResponse.json({ ok: true, status });
}
