import { NextResponse } from "next/server";
import { readTransferSettings } from "@/lib/transfer-settings";

export const dynamic = "force-dynamic";

/**
 * Datos de transferencia visibles para el cliente en el checkout.
 * Es información pública que configura el admin de plataforma.
 */
export async function GET() {
  const settings = await readTransferSettings();
  // Si nunca se configuró, no devolvemos texto viejo: el cliente muestra
  // aviso de contactar a la marca.
  const empty = !settings.bank && !settings.alias && !settings.account;
  return NextResponse.json({ settings, empty });
}
