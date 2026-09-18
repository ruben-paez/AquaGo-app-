"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  IconHome,
  IconBottle,
  IconBox,
  IconUser,
  IconRoute,
  IconBolt,
  IconWallet,
  IconUsers,
  IconTag,
  IconGear,
  IconTruck,
  IconChart,
} from "./icons";

/**
 * Barra de navegación inferior, igual para todos los roles.
 * Usa iconos de línea propios (nada de emojis) y se resalta el sector
 * activo. Se renderiza desde el layout, una sola vez en toda la app.
 */

interface NavItem {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
  /** pathname + query del tab para el resaltado */
  isActive: (path: string, tab: string | null) => boolean;
}

function adminItem(tab: string, label: string, Icon: NavItem["Icon"]): NavItem {
  return {
    href: `/admin?tab=${tab}`,
    label,
    Icon,
    isActive: (p, t) => p === "/admin" && (t ?? "pedidos") === tab,
  };
}

function itemsFor(role: string | null): NavItem[] {
  if (role === "repartidor") {
    return [
      { href: "/repartidor", label: "Hoy", Icon: IconTruck, isActive: (p) => p === "/repartidor" },
      { href: "/repartidor/cierre", label: "Cierre", Icon: IconChart, isActive: (p) => p.startsWith("/repartidor/cierre") },
      { href: "/cuenta", label: "Cuenta", Icon: IconUser, isActive: (p) => p.startsWith("/cuenta") },
    ];
  }
  if (role === "plataforma") {
    return [
      adminItem("pedidos", "Pedidos", IconBox),
      adminItem("reparto", "Reparto", IconRoute),
      adminItem("clientes", "Clientes", IconUsers),
      adminItem("marcas", "Marcas", IconTag),
      adminItem("ajustes", "Ajustes", IconGear),
    ];
  }
  if (role === "marca") {
    return [
      adminItem("pedidos", "Pedidos", IconBox),
      adminItem("reparto", "Reparto", IconRoute),
      adminItem("envivo", "En vivo", IconBolt),
      adminItem("comisiones", "Comisiones", IconWallet),
      adminItem("clientes", "Clientes", IconUsers),
    ];
  }
  // Cliente (o visitante sin sesión)
  return [
    { href: "/", label: "Inicio", Icon: IconHome, isActive: (p) => p === "/" },
    { href: "/pedir", label: "Pedir", Icon: IconBottle, isActive: (p) => p.startsWith("/pedir") },
    { href: "/mis-pedidos", label: "Mis pedidos", Icon: IconBox, isActive: (p) => p.startsWith("/mis-pedidos") },
    { href: "/cuenta", label: "Cuenta", Icon: IconUser, isActive: (p) => p.startsWith("/cuenta") },
  ];
}

export default function BottomNav({ role }: { role: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const items = itemsFor(role);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8EDF2] bg-white/95 backdrop-blur-md">
      <div
        className="mx-auto grid max-w-2xl"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, label, Icon, isActive }) => {
          const active = isActive(pathname, tab);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition ${
                active ? "text-[#1B8AD6]" : "text-[#9AA8BC] hover:text-[#5B6B82]"
              }`}
            >
              <span
                className={`grid h-8 w-12 place-items-center rounded-full transition ${
                  active ? "bg-[#E3F1FB]" : ""
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
      {/* Respeta la barra de gestos del celular */}
      <div style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}
