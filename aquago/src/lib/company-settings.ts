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

export interface PromoSettings {
  /** cartel de lanzamiento visible en la portada y en Pedir */
  active: boolean;
  text: string;
}

const PROMO_TEXT_KEY = "promo_text";
const PROMO_ACTIVE_KEY = "promo_active";
export const PROMO_DEFAULT_TEXT = "🎉 Lanzamiento: envío sin cargo + seguimiento en vivo";

/**
 * Cartel editable de promo de lanzamiento. Es puramente informativo:
 * no modifica precios ni lógica de dinero. Si la base no está lista,
 * vuelve el valor por defecto (apagado).
 */
export async function getPromo(): Promise<PromoSettings> {
  try {
    const rows = await db
      .select({ key: appSettings.key, value: appSettings.value })
      .from(appSettings)
      .where(inArray(appSettings.key, [PROMO_TEXT_KEY, PROMO_ACTIVE_KEY]));
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      active: map.get(PROMO_ACTIVE_KEY) === "1",
      text: map.get(PROMO_TEXT_KEY) || PROMO_DEFAULT_TEXT,
    };
  } catch {
    return { active: false, text: PROMO_DEFAULT_TEXT };
  }
}
