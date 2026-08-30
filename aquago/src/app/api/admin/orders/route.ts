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
  const ordersList = await getAllOrders();
  return NextResponse.json({ orders: ordersList });
}
