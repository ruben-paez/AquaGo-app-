import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import { AquaGoLogo } from "./Brand";

export default async function Nav() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/8 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <AquaGoLogo className="h-9" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/#marcas" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-water-100 hover:text-ink">
            Marcas
          </Link>
          <Link href="/negocio" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-water-100 hover:text-ink">
            Negocio
          </Link>
          {user && (
            <Link href="/mis-pedidos" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-water-100 hover:text-ink">
              Mis pedidos
            </Link>
          )}
          {user?.isAdmin && (
            <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-water-100 hover:text-ink">
              Panel
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden items-center gap-2 rounded-full border border-ink/10 bg-white py-1 pl-1 pr-3 text-sm font-semibold sm:flex">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-water-100 font-display text-xs text-water-700">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                {user.name.split(" ")[0]}
              </span>
              <LogoutButton />
              <Link
                href="/pedir"
                className="rounded-lg bg-water-700 px-4 py-2 text-sm font-bold text-white shadow-card transition hover:bg-water-800"
              >
                Pedir ahora
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-water-100 hover:text-ink"
              >
                Ingresar
              </Link>
              <Link
                href="/pedir"
                className="rounded-lg bg-water-700 px-4 py-2 text-sm font-bold text-white shadow-card transition hover:bg-water-800"
              >
                Pedir ahora
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
