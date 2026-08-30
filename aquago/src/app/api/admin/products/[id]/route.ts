import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { roundToCashStep } from "@/lib/pricing";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Producto inválido." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim().length >= 3) {
    patch.name = body.name.trim();
  }
  if (typeof body.description === "string") {
    patch.description = body.description.trim();
  }
  if (typeof body.volume === "string") {
    patch.volume = body.volume.trim();
  }
  if (typeof body.category === "string" && ["agua", "accesorios", "otros"].includes(body.category)) {
    patch.category = body.category;
  }
  if (typeof body.price === "number" && body.price > 0) {
    patch.price = roundToCashStep(body.price);
  }
  if (typeof body.active === "boolean") {
    patch.active = body.active;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }

  const updated = await db
    .update(products)
    .set(patch)
    .where(eq(products.id, productId))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ product: updated[0] });
}
