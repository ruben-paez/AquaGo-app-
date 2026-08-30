import "dotenv/config";
import type { Config } from "drizzle-kit";

/**
 * Configuración de Drizzle Kit.
 *
 * Lee la conexión de `DATABASE_URL`, así el mismo archivo sirve para tu
 * PostgreSQL local y para el de producción (Neon, Supabase, Railway…).
 */
const url =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

export default {
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
} satisfies Config;
