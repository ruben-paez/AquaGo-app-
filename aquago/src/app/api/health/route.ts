import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, demoMode: process.env.DEMO_MODE === "on" });
  } catch {
    return Response.json({ ok: false, demoMode: false }, { status: 500 });
  }
}
