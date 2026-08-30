import Link from "next/link";
import { getSessionToken, getSessionUser } from "@/lib/auth";
import type { PublicUser } from "@/lib/auth";
import Nav from "@/components/Nav";
import OrderWizard from "./OrderWizard";
import { IconBottle } from "@/components/icons";

// Nunca servir una copia cacheada: el token de sesión viaja en el HTML y una
// versión vieja traería un token muerto (de ahí el "Debes iniciar sesión").
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = { title: "Pedir · AquaGo" };

export default async function PedirPage() {
  const user = (await getSessionUser()) as PublicUser | null;
  // Se lo pasamos al wizard como prop: es la vía más confiable, no depende
  // de cookies, del DOM ni de la URL.
  const sessionToken = await getSessionToken();

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Nav />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-water-100 text-water-700">
            <IconBottle className="h-8 w-8" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold">Para pedir, creá tu cuenta</h1>
          <p className="mt-2 text-ink-soft">
            Necesitamos tu nombre, teléfono y tu dirección en el mapa para que el
            repartidor te encuentre a la primera.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/registro"
              className="rounded-xl bg-water-700 px-5 py-3 font-display text-sm font-bold text-white shadow-card transition hover:bg-water-800"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-ink/15 bg-white px-5 py-3 font-display text-sm font-bold text-ink transition hover:border-water-400"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <OrderWizard user={user} sessionToken={sessionToken} />
      </main>
    </div>
  );
}
