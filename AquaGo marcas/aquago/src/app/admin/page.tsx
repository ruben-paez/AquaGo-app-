import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import Nav from "@/components/Nav";
import AdminPanel from "./AdminPanel";
import { IconTruck } from "@/components/icons";

// Nunca servir una copia cacheada: el token de sesión viaja en el HTML y una
// versión vieja traería un token muerto (de ahí el "Debes iniciar sesión").
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = { title: "Panel · AquaGo" };

export default async function AdminPage() {
  const user = await getSessionUser();

  if (!user || !user.isAdmin) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Nav />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-water-100 text-water-700">
            <IconTruck className="h-8 w-8" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold">Área del local</h1>
          <p className="mt-2 text-ink-soft">
            Este panel es solo para el equipo de AQUAnat. Ingresá con la cuenta
            de administración para gestionar pedidos y productos.
          </p>
          <Link
            href="/login"
            className="mt-6 rounded-xl bg-water-700 px-5 py-3 font-display text-sm font-bold text-white shadow-card transition hover:bg-water-800"
          >
            Ingresar
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <AdminPanel userRole={user.role} />
      </main>
    </div>
  );
}
