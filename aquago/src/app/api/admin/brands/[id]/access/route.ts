import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, users } from "@/db/schema";
import { getSessionUser, hashPassword } from "@/lib/auth";

/**
 * Crea (o resetea) el acceso de una marca: usuario con role = marca e
 * isAdmin = true, vinculado a la marca. Con eso la marca entra al panel
 * y ve únicamente lo suyo. Solo la plataforma puede usarlo.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (user.role !== "plataforma") {
    return NextResponse.json({ error: "Solo la plataforma gestiona accesos." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const brandId = Number(id);
  if (!Number.isInteger(brandId)) {
    return NextResponse.json({ error: "Marca inválida." }, { status: 400 });
  }

  const bRows = await db.select().from(brands).where(eq(brands.id, brandId)).limit(1);
  const brand = bRows[0];
  if (!brand) {
    return NextResponse.json({ error: "Marca no encontrada." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ingresá un email válido." }, { status: 400 });
  }

  // ¿Ya existe un usuario de esta marca?
  const current = await db
    .select()
    .from(users)
    .where(and(eq(users.role, "marca"), eq(users.brandId, brandId)))
    .limit(1);

  if (current[0]) {
    // Reset de contraseña (y opcionalmente del email)
    if (!password) {
      return NextResponse.json({ error: "Escribí la nueva contraseña." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
    }
    // El email nuevo no puede pertenecer a otra cuenta
    if (email !== current[0].email) {
      const taken = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (taken[0]) {
        return NextResponse.json({ error: "Ese email ya pertenece a otra cuenta." }, { status: 400 });
      }
    }
    await db
      .update(users)
      .set({ email, passwordHash: hashPassword(password) })
      .where(eq(users.id, current[0].id));
    return NextResponse.json({
      ok: true,
      message: `Acceso actualizado: ${email}. Pasaselo a la marca junto con la contraseña.`,
      email,
    });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
  }
  const taken = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (taken[0]) {
    return NextResponse.json({ error: "Ese email ya pertenece a otra cuenta." }, { status: 400 });
  }

  const [created] = await db
    .insert(users)
    .values({
      name: brand.name,
      phone: "+595",
      email,
      passwordHash: hashPassword(password),
      role: "marca",
      isAdmin: true,
      brandId,
    })
    .returning();

  return NextResponse.json(
    {
      ok: true,
      message: `Acceso creado: ${email}. Pasaselo a la marca junto con la contraseña.`,
      userId: created.id,
      email,
    },
    { status: 201 }
  );
}
