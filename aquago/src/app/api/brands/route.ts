import { NextResponse } from "next/server";
import { getBrands } from "@/lib/queries";
import { refreshOverdue } from "@/lib/settle";

export async function GET() {
  // Antes de mostrar el listado revisamos vencimientos: si una marca entró en
  // mora profunda queda suspendida y deja de aparecer como disponible.
  try {
    await refreshOverdue();
  } catch {
    // Si falla la revisión igual devolvemos el catálogo.
  }
  const brands = await getBrands();
  return NextResponse.json({ brands });
}
