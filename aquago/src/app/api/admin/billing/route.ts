import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBilling } from "@/lib/analytics";
import { runSettlements, markSettlementPaid, refreshOverdue } from "@/lib/settle";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  await refreshOverdue();
  const data = await getBilling();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");

  if (action === "run") {
    const brandId = Number.isInteger(Number(body?.brandId)) ? Number(body.brandId) : undefined;
    const results = await runSettlements(brandId);
    return NextResponse.json({ results });
  }

  if (action === "pay") {
    const id = Number(body?.settlementId);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Liquidación inválida." }, { status: 400 });
    }
    const ok = await markSettlementPaid(id);
    if (!ok) return NextResponse.json({ error: "No se pudo registrar el pago." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
}
