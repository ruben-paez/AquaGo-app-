import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import DriverPanel from "./DriverPanel";

export const dynamic = "force-dynamic";

/**
 * Panel del vendedor / repartidor.
 * Requiere sesión con role = repartidor (usuario y contraseña que da la marca).
 */
export default async function RepartidorPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center">
        <h1 className="font-display text-xl font-bold">Panel de vendedores</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Entrá con el usuario y la contraseña que te dio tu marca para ver tus
          entregas, la ruta del día y compartir tu ubicación.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-xl bg-water-700 px-5 py-3 font-display text-sm font-bold text-white transition hover:bg-water-800"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (user.role !== "repartidor") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center">
        <h1 className="font-display text-xl font-bold">Panel de vendedores</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Entraste como <b>{user.email}</b> ({user.role}), que no es una cuenta de
          repartidor. Cerrá sesión y entrá con tu usuario de vendedor.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-xl bg-water-700 px-5 py-3 font-display text-sm font-bold text-white transition hover:bg-water-800"
        >
          Cambiar de cuenta
        </Link>
      </div>
    );
  }

  return <DriverPanel />;
}
