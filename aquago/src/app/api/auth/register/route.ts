import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  hashPassword,
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

  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const addressLabel = String(body.addressLabel ?? "").trim();
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const deliveryNotes = String(body.deliveryNotes ?? "").trim();

  if (name.length < 3) {
    return NextResponse.json({ error: "Ingresa tu nombre completo." }, { status: 400 });
  }
  if (phone.replace(/\D/g, "").length < 7) {
    return NextResponse.json({ error: "Ingresa un teléfono válido." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ingresa un email válido." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Marca tu dirección en el mapa." }, { status: 400 });
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Ese email ya está registrado. Inicia sesión." },
      { status: 409 }
    );
  }

  const inserted = await db
    .insert(users)
    .values({
      name,
      phone,
      email,
      passwordHash: hashPassword(password),
      addressLabel,
      lat,
      lng,
      deliveryNotes,
    })
    .returning();

  const token = await createSession(inserted[0].id, req.headers.get("user-agent") ?? "");

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());

  return NextResponse.json({ user: toPublicUser(inserted[0]), token }, { status: 201 });
}
