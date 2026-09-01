import { NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { readTransferSettings } from "@/lib/transfer-settings";

/** Ver los datos actuales (solo plataforma). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (user.role !== "plataforma") {
    return NextResponse.json({ error: "Solo la plataforma." }, { status: 403 });
  }
  return NextResponse.json({ settings: await readTransferSettings() });
}

/** Guardar los datos (solo plataforma). No toca ninguna lógica de dinero. */
export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (user.role !== "plataforma") {
    return NextResponse.json({ error: "Solo la plataforma." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Petición inválida." }, { status: 400 });

  const keys = ["transfer_bank", "transfer_account", "transfer_holder", "transfer_alias", "transfer_note"] as const;
  for (const key of keys) {
    const value = String(body[key.slice("transfer_".length)] ?? "").trim().slice(0, 200);
    await db
      .insert(appSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  return NextResponse.json({ ok: true, settings: await readTransferSettings() });
}
