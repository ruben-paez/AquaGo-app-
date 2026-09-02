import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAnalytics } from "@/lib/analytics";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const brandParam = searchParams.get("brandId");
  const brandId = brandParam && brandParam !== "todas" ? Number(brandParam) : undefined;

  // La marca siempre ve solo sus propios datos.
  const scope = user.role === "marca" ? user.brandId ?? -1 : Number.isInteger(brandId) ? brandId : undefined;
  const data = await getAnalytics(scope);
  return NextResponse.json(data);
}
