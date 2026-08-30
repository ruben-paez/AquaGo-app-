import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  verifyPassword,
  createSession,
  toPublicUser,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
  }

  // Cada login abre su propia sesión: no pisa las de otras pestañas ni
  // dispositivos. Antes se sobrescribía un único token y la pestaña vieja
  // quedaba muerta.
  const token = await createSession(user.id, req.headers.get("user-agent") ?? "");

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());

  // El token también va en el cuerpo: si el navegador descarta la cookie
  // (iframe), el cliente lo arrastra por la URL.
  return NextResponse.json({ user: toPublicUser(user), token });
}
