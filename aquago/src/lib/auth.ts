import { cookies, headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { hashPassword, verifyPassword, randomToken } from "./password";

export { hashPassword, verifyPassword, randomToken };

export const SESSION_COOKIE = "aquago_sid";
export const SESSION_DAYS = 30;

/** Crea una sesión nueva sin tocar las que ya existen. */
export async function createSession(userId: number, userAgent = ""): Promise<string> {
  const token = randomToken();
  await db.insert(sessions).values({
    token,
    userId,
    userAgent: userAgent.slice(0, 200),
    expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5),
  });
  return token;
}

/** Cierra una sesión puntual (solo la de este dispositivo). */
export async function destroySession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

/** Busca el usuario dueño de un token vigente. */
async function userForToken(token: string) {
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
}
/** Cabecera y parámetro usados cuando el navegador bloquea las cookies. */
export const SESSION_HEADER = "x-aquago-session";
export const SESSION_PARAM = "s";

export interface PublicUser {
  id: number;
  name: string;
  phone: string;
  email: string;
  addressLabel: string;
  lat: number | null;
  lng: number | null;
  deliveryNotes: string;
  isAdmin: boolean;
  createdAt: string;
}

export function toPublicUser(u: {
  id: number;
  name: string;
  phone: string;
  email: string;
  addressLabel: string;
  lat: number | null;
  lng: number | null;
  deliveryNotes: string;
  isAdmin: boolean;
  createdAt: Date;
}): PublicUser {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    addressLabel: u.addressLabel,
    lat: u.lat,
    lng: u.lng,
    deliveryNotes: u.deliveryNotes,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt.toISOString(),
  };
}

/**
 * Devuelve el token de sesión crudo (cookie o cabecera), sin tocar la base.
 * Se usa para inyectarlo en el HTML: así el cliente siempre tiene el mismo
 * token con el que el servidor renderizó la página.
 */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  let token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    const h = await headers();
    token = h.get(SESSION_HEADER) ?? undefined;
  }
  if (!token) return null;

  // Solo se inyecta si la sesión sigue viva.
  const user = await userForToken(token);
  return user ? token : null;
}

/**
 * Busca la sesión en tres lugares, en orden:
 *
 *   1. La cookie (camino normal, fuera de un iframe).
 *   2. La cabecera `x-aquago-session`, que inyecta el middleware cuando la
 *      URL trae `?s=`, o que manda el fetch del cliente.
 *
 * El fallback existe porque dentro de un iframe de otro dominio los
 * navegadores bloquean las cookies y la sesión nunca llegaría al servidor.
 */
export async function getSessionUser(): Promise<PublicUser | null> {
  const store = await cookies();
  let token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    const h = await headers();
    token = h.get(SESSION_HEADER) ?? undefined;
  }
  if (!token) return null;
  const u = await userForToken(token);
  return u ? toPublicUser(u) : null;
}

/**
 * La vista previa se muestra dentro de un iframe de otro dominio. En ese
 * contexto el navegador descarta las cookies `SameSite=Lax`, así que el login
 * respondía 200 pero la sesión nunca se guardaba.
 *
 * `SameSite=None` + `Secure` es lo único que el navegador acepta dentro de un
 * iframe cross-site. En desarrollo local (http) se usa `Lax`, porque `None`
 * exige HTTPS.
 */
export function sessionCookieOptions() {
  const embeddable = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: embeddable ? ("none" as const) : ("lax" as const),
    secure: embeddable,
    // CHIPS: cookie particionada por sitio incrustador. Es lo que permite que
    // Chrome la acepte dentro de un iframe aun con las cookies de terceros
    // bloqueadas. Los navegadores que no la entienden la ignoran sin romper.
    partitioned: embeddable,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}
