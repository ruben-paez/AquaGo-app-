import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

export interface PushPayload {
  title: string;
  body: string;
  /** página a abrir al tocar la notificación */
  url?: string;
  /** agrupa reemplazando la anterior del mismo tema */
  tag?: string;
}

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";

/** ¿Está configurado el envío de push en este entorno? */
export function pushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
}

let configured = false;
function ensureVapid() {
  if (!pushConfigured()) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_CONTACT ?? "mailto:hola@aquago.com.py",
      VAPID_PUBLIC,
      VAPID_PRIVATE
    );
    configured = true;
  }
  return true;
}

/**
 * Envía una notificación push a todas las suscripciones del usuario.
 * Borra las que quedaron muertas (404/410 del navegador). Nunca lanza:
 * el push es "best effort" y no debe tumbar la operación principal.
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<number> {
  if (!ensureVapid()) return 0;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        // La suscripción ya no existe en el navegador: se limpia.
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }
  return sent;
}
