import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, appSettings } from "@/db/schema";
import {
  verifyPassword,
  createSession,
  toPublicUser,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";

/**
 * Candado anti fuerza bruta, guardado en app_settings (sin SQL nuevo):
 * tras MAX_ATTEMPTS contraseñas erróneas, el email queda bloqueado
 * LOCK_MINUTES minutos aunque la contraseña sea correcta.
 */
const MAX_ATTEMPTS = 8;
const LOCK_MINUTES = 15;

async function getSetting(key: string): Promise<string | null> {
  const rows = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

async function delSetting(key: string) {
  await db.delete(appSettings).where(eq(appSettings.key, key));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  // ¿Está bloqueado este email por intentos fallidos?
  const lockKey = `login_lock:${email}`;
  const failKey = `login_fail:${email}`;
  const lockedUntil = await getSetting(lockKey);
  if (lockedUntil) {
    const until = new Date(lockedUntil).getTime();
    if (Number.isFinite(until) && until > Date.now()) {
      const mins = Math.max(1, Math.ceil((until - Date.now()) / 60000));
      return NextResponse.json(
        { error: `Demasiados intentos. Probá de nuevo en ${mins} min.` },
        { status: 429 }
      );
    }
    // El bloqueo ya venció: limpiamos y seguimos.
    await delSetting(lockKey);
    await delSetting(failKey);
  }

  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];

  if (!user || !verifyPassword(password, user.passwordHash)) {
    // Sumamos el fallo; al llegar al tope, cerramos la puerta 15 minutos.
    const fails = Number((await getSetting(failKey)) ?? "0") + 1;
    if (fails >= MAX_ATTEMPTS) {
      await setSetting(lockKey, new Date(Date.now() + LOCK_MINUTES * 60000).toISOString());
      await delSetting(failKey);
    } else {
      await setSetting(failKey, String(fails));
    }
    return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
  }

  // Entró bien: limpiamos cualquier conteo previo.
  await delSetting(failKey);
  await delSetting(lockKey);

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
