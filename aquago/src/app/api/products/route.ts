import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, products } from "@/db/schema";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("brand");

  let brandId: number | null = null;
  if (slug) {
    const found = await db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.slug, slug))
      .limit(1);
    if (found.length === 0) {
      return NextResponse.json({ error: "Marca no encontrada." }, { status: 404 });
    }
    brandId = found[0].id;
  }

  const rows = await db
    .select()
    .from(products)
    .where(
      brandId
        ? and(eq(products.active, true), eq(products.brandId, brandId))
        : eq(products.active, true)
    )
    .orderBy(asc(products.sortOrder), asc(products.id));

  return NextResponse.json({
    products: rows.map((p) => ({
      id: p.id,
      brandId: p.brandId,
      name: p.name,
      description: p.description,
      category: p.category,
      volume: p.volume,
      price: p.price,
    })),
  });
}
