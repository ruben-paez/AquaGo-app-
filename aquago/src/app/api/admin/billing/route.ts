import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBilling } from "@/lib/analytics";
import { runSettlements, markSettlementPaid, refreshOverdue } from "@/lib/settle";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  await refreshOverdue();
  // La marca solo ve su propia cuenta corriente.
  const data = await getBilling(user.role === "marca" ? user.brandId ?? -1 : undefined);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");

  if (action === "run") {
    const bodyBrand = Number.isInteger(Number(body?.brandId)) ? Number(body.brandId) : undefined;
    // La marca solo puede liquidar SU propia cuenta.
    const brandId = user.role === "marca" ? user.brandId ?? -1 : bodyBrand;
    const results = await runSettlements(brandId);
    return NextResponse.json({ results });
  }

  if (action === "pay") {
    // Registrar el pago es tarea exclusiva de la plataforma.
    if (user.role !== "plataforma") {
      return NextResponse.json({ error: "Solo la plataforma registra pagos." }, { status: 403 });
    }
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
