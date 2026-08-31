import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";

/**
 * Cambio de contraseña de la propia cuenta. Pide la contraseña actual:
 * sirve para que el admin (y cualquier usuario) rote su clave sin SQL.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "La contraseña nueva debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }
  if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return NextResponse.json(
      { error: "La contraseña nueva debe mezclar letras y números." },
      { status: 400 }
    );
  }

  const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const me = rows[0];
  if (!me || !verifyPassword(currentPassword, me.passwordHash)) {
    return NextResponse.json({ error: "La contraseña actual no coincide." }, { status: 400 });
  }

  await db.update(users).set({ passwordHash: hashPassword(newPassword) }).where(eq(users.id, user.id));

  // Cerramos las demás sesiones por seguridad (esta no: para no expulsar al usuario).
  const token = await (async () => {
    const { cookies, headers } = await import("next/headers");
    const store = await cookies();
    let t = store.get("aquago_sid")?.value;
    if (!t) t = (await headers()).get("x-aquago-session") ?? undefined;
    return t;
  })();

  const { and, ne, lt } = await import("drizzle-orm");
  if (token) {
    await db
      .delete(sessions)
      .where(and(eq(sessions.userId, user.id), ne(sessions.token, token)));
  } else {
    await db.delete(sessions).where(eq(sessions.userId, user.id));
  }

  return NextResponse.json({ ok: true });
}
