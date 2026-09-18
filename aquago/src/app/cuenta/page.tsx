import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Nav from "@/components/Nav";
import LogoutButton from "@/components/LogoutButton";
import PasswordForm from "./PasswordForm";
import { IconLock, IconLogout } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mi cuenta · AquaGo" };

/**
 * Cuenta del usuario (cualquier rol): datos personales, cambio de
 * contraseña, sesión y accesos legales. Es el destino del botón
 * "Cuenta" de la barra inferior.
 */
export default async function CuentaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rolLabel =
    user.role === "plataforma"
      ? "Equipo AquaGo"
      : user.role === "marca"
        ? "Marca aliada"
        : user.role === "repartidor"
          ? "Repartidor"
          : "Cliente";

  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Mi cuenta</h1>

        {/* Tarjeta de perfil */}
        <div className="mt-5 flex items-center gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#1B8AD6] font-display text-xl font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold text-ink">{user.name}</p>
            <p className="text-sm text-ink-soft">{user.phone}</p>
            <span className="mt-1 inline-block rounded-full bg-water-50 px-2.5 py-0.5 text-[11px] font-bold text-water-700">
              {rolLabel}
            </span>
          </div>
        </div>

        {/* Cambiar contraseña */}
        <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
          <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
            <IconLock className="h-4 w-4 text-water-600" />
            Cambiar contraseña
          </p>
          <PasswordForm />
        </div>

        {/* Sesión */}
        <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
          <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
            <IconLogout className="h-4 w-4 text-water-600" />
            Sesión
          </p>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>

        {/* Legal */}
        <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
          <p className="font-display text-sm font-bold text-ink">Información</p>
          <ul className="mt-2 space-y-1 text-sm font-semibold text-water-700">
            <li><a href="/ayuda" className="hover:underline">Ayuda y preguntas frecuentes</a></li>
            <li><a href="/terminos" className="hover:underline">Términos y condiciones</a></li>
            <li><a href="/privacidad" className="hover:underline">Política de privacidad</a></li>
          </ul>
        </div>

        <p className="mt-6 text-center text-xs text-ink-soft">
          AquaGo · agua a domicilio en Encarnación
        </p>
      </main>
    </div>
  );
}
