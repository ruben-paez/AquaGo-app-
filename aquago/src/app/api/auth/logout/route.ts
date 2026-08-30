import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession, getSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  // Cierra solo esta sesión: si el usuario tiene la app abierta en otro
  // dispositivo, esa sigue viva.
  const token = await getSessionToken();
  if (token) await destroySession(token);

  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
