import { NextResponse } from "next/server";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, orders, users } from "@/db/schema";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Recordatorio de recarga: para cada cliente calcula su intervalo promedio
 * entre pedidos y, si ya pasó ese tiempo desde su última compra (y no tiene
 * pedidos en curso), le manda el aviso amigable. Lo llama el cron diario de
 * Vercel; si algún día querés otro horario, cambiás vercel.json.
 */
export async function GET(req: Request) {
  // Seguridad del cron: Vercel manda este header con el CRON_SECRET.
  const auth = req.headers.get("authorization") ?? "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  // Clientes con al menos 2 pedidos entregados (recién ahí hay promedio).
  const clients = await db
    .select({
      userId: orders.userId,
      name: users.name,
      count: sql<number>`count(*)::int`,
      lastDelivery: sql<string>`max(${orders.updatedAt})`,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.status, "entregada"))
    .groupBy(orders.userId, users.name)
    .having(sql`count(*) >= 2`);

  const now = Date.now();
  const notified: { userId: number; name: string; daysSince: number; avg: number }[] = [];

  for (const c of clients) {
    // ¿Tiene pedidos en curso? Entonces no molesta: ya está comprando.
    const active = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.userId, c.userId),
          inArray(orders.status, ["pendiente", "aceptada", "en_camino"])
        )
      )
      .limit(1);
    if (active[0]) continue;

    // Intervalo promedio real entre entregas (días).
    const history = await db
      .select({ at: orders.updatedAt })
      .from(orders)
      .where(and(eq(orders.userId, c.userId), eq(orders.status, "entregada")))
      .orderBy(desc(orders.updatedAt))
      .limit(20);
    const times = history.map((h) => h.at.getTime()).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < times.length; i++) {
      gaps.push(times[i] - times[i - 1]);
    }
    const avgDays = gaps.reduce((s, g) => s + g, 0) / gaps.length / 864e5;
    if (avgDays < 0.5 || avgDays > 90) continue; // sin ritmo claro: no molesta

    const daysSince = (now - times[times.length - 1]) / 864e5;
    if (daysSince < avgDays + 0.5) continue; // todavía no le toca

    // Un solo recordatorio por intento (evita spam diario): marcamos en ajustes.
    const key = `reminder_sent_${c.userId}`;
    const last = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .limit(1);
    if (last[0] && now - new Date(last[0].updatedAt).getTime() < Math.max(avgDays * 0.7, 3) * 864e5) {
      continue;
    }

    const sent = await sendPushToUser(c.userId, {
      title: "💧 ¡Hey! Tu próxima recarga está a solo un clic",
      body: `${c.name.split(" ")[0]}, ya va siendo hora de la recarga de tu bidón de 20 L. Pedila ahora y te la llevamos hoy.`,
      url: "/pedir",
      tag: "recordatorio",
    });

    await db
      .insert(appSettings)
      .values({ key, value: String(sent), updatedAt: new Date() })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: String(sent), updatedAt: new Date() } });

    if (sent > 0) notified.push({ userId: c.userId, name: c.name, daysSince: Math.round(daysSince), avg: Math.round(avgDays) });
  }

  return NextResponse.json({ ok: true, evaluados: clients.length, notificados: notified });
}
