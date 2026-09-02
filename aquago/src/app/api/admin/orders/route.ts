import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAllOrders } from "@/lib/queries";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  }
  // La marca solo ve los pedidos de SU marca.
  const ordersList = await getAllOrders(
    user.role === "marca" ? user.brandId ?? -1 : undefined
  );
  return NextResponse.json({ orders: ordersList });
}
