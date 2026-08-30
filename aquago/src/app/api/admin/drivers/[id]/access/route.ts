import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { drivers, users } from "@/db/schema";
import { getSessionUser, hashPassword } from "@/lib/auth";

/**
 * Crea (o reenlaza) el acceso de un repartidor: genera un usuario con
 * role = repartidor y lo vincula al perfil del driver. Lo usa la marca
 * desde el panel para darles usuario y contraseña a sus vendedores.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const driverId = Number(id);
  if (!Number.isInteger(driverId)) {
    return NextResponse.json({ error: "Repartidor inválido." }, { status: 400 });
  }

  const dRows = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  const driver = dRows[0];
  if (!driver) {
    return NextResponse.json({ error: "Repartidor no encontrado." }, { status: 404 });
  }
  // La marca solo gestiona a sus propios repartidores.
  if (user.role === "marca" && user.brandId && driver.brandId !== user.brandId) {
    return NextResponse.json({ error: "Ese repartidor es de otra marca." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ingresá un email válido." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres." },
      { status: 400 }
    );
  }

  // ¿El email ya está en uso?
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    const eu = existing[0];
    if (eu.role !== "repartidor") {
      return NextResponse.json(
        { error: "Ese email ya pertenece a otra cuenta." },
        { status: 400 }
      );
    }
    // Reenlazamos el repartidor existente a este driver (traslado de marca).
    await db.update(drivers).set({ userId: eu.id }).where(eq(drivers.id, driverId));
    return NextResponse.json({ ok: true, userId: eu.id, linked: true });
  }

  // Si el driver ya tenía otro usuario, lo desvinculamos (1 usuario = 1 driver).
  const [created] = await db
    .insert(users)
    .values({
      name: driver.name,
      phone: driver.phone || "+595",
      email,
      passwordHash: hashPassword(password),
      role: "repartidor",
      isAdmin: false,
    })
    .returning();

  await db.update(drivers).set({ userId: created.id }).where(eq(drivers.id, driverId));

  return NextResponse.json({ ok: true, userId: created.id, linked: false }, { status: 201 });
}
