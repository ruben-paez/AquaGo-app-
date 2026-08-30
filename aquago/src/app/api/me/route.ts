import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser, toPublicUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim().length >= 3) {
    patch.name = body.name.trim();
  }
  if (typeof body.phone === "string" && body.phone.trim().length >= 7) {
    patch.phone = body.phone.trim();
  }
  if (typeof body.addressLabel === "string") {
    patch.addressLabel = body.addressLabel.trim();
  }
  if (typeof body.deliveryNotes === "string") {
    patch.deliveryNotes = body.deliveryNotes.trim();
  }
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    patch.lat = lat;
    patch.lng = lng;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }

  const updated = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, user.id))
    .returning();

  return NextResponse.json({ user: toPublicUser(updated[0]) });
}
