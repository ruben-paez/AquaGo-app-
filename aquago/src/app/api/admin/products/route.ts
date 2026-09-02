import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { roundToCashStep } from "@/lib/pricing";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  }
  // La marca solo ve los productos de SU catálogo.
  const rows = await db
    .select()
    .from(products)
    .where(user.role === "marca" ? eq(products.brandId, user.brandId ?? -1) : undefined)
    .orderBy(asc(products.sortOrder), asc(products.id));
  return NextResponse.json({ products: rows });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const price = Number(body.price);
  const description = String(body.description ?? "").trim();
  const volume = String(body.volume ?? "").trim();
  const category =
    body.category === "accesorios" || body.category === "otros" ? body.category : "agua";
  // La marca solo puede crear productos en SU catálogo.
  const brandId =
    user.role === "marca" ? user.brandId ?? -1 : Number.isInteger(Number(body.brandId)) ? Number(body.brandId) : 1;

  if (name.length < 3) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Precio inválido." }, { status: 400 });
  }

  const max = await db
    .select({ m: products.sortOrder })
    .from(products)
    .orderBy(desc(products.sortOrder))
    .limit(1);

  const inserted = await db
    .insert(products)
    .values({
      brandId,
      name,
      description,
      volume,
      category,
      price: roundToCashStep(price),
      sortOrder: (max[0]?.m ?? 0) + 1,
    })
    .returning();

  return NextResponse.json({ product: inserted[0] }, { status: 201 });
}
