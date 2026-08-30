import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, SESSION_COOKIE, sessionCookieOptions, toPublicUser } from "@/lib/auth";

/**
 * Acceso de demostración.
 *
 * Existe para que la app se pueda probar embebida (donde el navegador bloquea
 * cookies) y para poder reconectar sola si la sesión se pierde en medio de un
 * pedido. Solo abre sesión en las cuentas de demo: no acepta emails
 * arbitrarios ni contraseñas.
 *
 * En producción con usuarios reales, esta ruta se elimina o se protege detrás
 * de una variable de entorno.
 */
const DEMO_ACCOUNTS: Record<string, string> = {
  cliente: "cliente@demo.com.py",
  plataforma: "admin@aquago.com.py",
  marca: "marca@aquanat.com.py",
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const role = String(body?.role ?? "cliente");
  const email = DEMO_ACCOUNTS[role];

  if (!email) {
    return NextResponse.json({ error: "Rol de demo inválido." }, { status: 400 });
  }

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: "La cuenta de demo no existe." }, { status: 404 });
  }

  const token = await createSession(user.id, req.headers.get("user-agent") ?? "");

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());

  return NextResponse.json({ user: toPublicUser(user), token, role });
}
