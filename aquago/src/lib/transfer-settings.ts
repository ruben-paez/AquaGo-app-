import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

const KEYS = ["transfer_bank", "transfer_account", "transfer_holder", "transfer_alias", "transfer_note"] as const;

export interface TransferSettings {
  bank: string;
  account: string;
  holder: string;
  alias: string;
  note: string;
}

/** Lee los datos de transferencia configurados por el admin (o vacíos). */
export async function readTransferSettings(): Promise<TransferSettings> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(inArray(appSettings.key, [...KEYS]));
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    bank: map.get("transfer_bank") ?? "",
    account: map.get("transfer_account") ?? "",
    holder: map.get("transfer_holder") ?? "",
    alias: map.get("transfer_alias") ?? "",
    note: map.get("transfer_note") ?? "",
  };
}
