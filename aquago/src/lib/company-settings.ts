import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

const KEYS = ["company_name", "support_email", "support_phone"] as const;

export interface CompanySettings {
  name: string;
  email: string;
  phone: string;
}

/** Datos legales/de contacto de AquaGo, editables por el admin de plataforma. */
export async function getCompanySettings(): Promise<CompanySettings> {
  try {
    const rows = await db
      .select()
      .from(appSettings)
      .where(inArray(appSettings.key, [...KEYS]));
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      name: map.get("company_name") || "AquaGo",
      email: map.get("support_email") || "aquagocompany@gmail.com",
      phone: map.get("support_phone") || "0991 945 969",
    };
  } catch {
    // La app nunca se cae por esto: valores por defecto.
    return { name: "AquaGo", email: "aquagocompany@gmail.com", phone: "0991 945 969" };
  }
}
