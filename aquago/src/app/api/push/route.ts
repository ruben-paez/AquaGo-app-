import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { pushConfigured } from "@/lib/push";

/** Clave pública VAPID para que el navegador se suscriba. */
export async function GET() {
  if (!pushConfigured()) {
    return NextResponse.json({ configured: false, publicKey: null });
  }
  return NextResponse.json({
    configured: true,
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });
}

/** Guarda la suscripción del dispositivo logueado. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint = String(body?.endpoint ?? "");
  const p256dh = String(body?.keys?.p256dh ?? "");
  const auth = String(body?.keys?.auth ?? "");
  if (!endpoint.startsWith("https://") || !p256dh || !auth) {
    return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 });
  }

  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);

  if (existing[0]) {
    await db
      .update(pushSubscriptions)
      .set({ userId: user.id, p256dh, auth })
      .where(eq(pushSubscriptions.id, existing[0].id));
  } else {
    await db.insert(pushSubscriptions).values({
      userId: user.id,
      endpoint,
      p256dh,
      auth,
      userAgent: (req.headers.get("user-agent") ?? "").slice(0, 200),
    });
  }

  return NextResponse.json({ ok: true });
}

/** Quita una suscripción (el usuario apagó las notificaciones). */
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  const endpoint = String(body?.endpoint ?? "");
  if (!endpoint) return NextResponse.json({ error: "Falta endpoint." }, { status: 400 });
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  return NextResponse.json({ ok: true });
}
