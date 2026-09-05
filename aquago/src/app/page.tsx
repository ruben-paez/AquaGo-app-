import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import StatusBadge from "@/components/StatusBadge";
import { AquaGoLogo, AquaNatLogo, AquaNatMark, BidonSVG } from "@/components/Brand";
import { formatGs, formatRating } from "@/lib/format";
import { getActiveProducts, getBrands } from "@/lib/queries";
import type { BrandView } from "@/lib/queries";
import {
  IconBank,
  IconCash,
  IconClock,
  IconDroplet,
  IconMapPin,
  IconPhone,
  IconTruck,
  IconUser,
} from "@/components/icons";

/**
 * Portada en modo oscuro (identidad "agua de noche"): azul noche #0A1930,
 * tarjetas de vidrio #10233E, acento cian #56CCF2, botón principal #1B9CE3
 * y coral #F87E6D para el "Pedir ahora" del encabezado.
 * El resto de la app sigue con su tema claro de siempre.
 */

const FALLBACK_BRANDS: BrandView[] = [
  {
    id: 1,
    slug: "aquanat",
    name: "AQUAnat",
    tagline: "Puramente Encarnacena",
    city: "Encarnación",
    description: "Agua mineral natural. Recargas de bidón 20 L y bidones completos.",
    etaMin: 30,
    etaMax: 60,
    deliveryFee: 0,
    rating: 49,
    comingSoon: false,
    serviceFeeBps: 1000,
    serviceFeeMin: 1000,
    serviceFee: 0,
  },
];

const FALLBACK_PRODUCTS = [
  { name: "Recarga bidón 20 L", description: "Entregás tu bidón vacío y lo cambiamos por uno lleno.", category: "agua", volume: "20 L", price: 12000 },
  { name: "Bidón 20 L completo", description: "Incluye el envase nuevo + los 20 litros de agua.", category: "agua", volume: "20 L", price: 50000 },
];

const CATEGORY_LABEL: Record<string, string> = {
  agua: "Agua",
  accesorios: "Accesorios",
  otros: "Otros",
};

export default async function Home() {
  let brands: BrandView[] = FALLBACK_BRANDS;
  let products: { name: string; description: string; category: string; volume: string; price: number }[] =
    FALLBACK_PRODUCTS;

  try {
    const rows = await getBrands();
    if (rows.length > 0) brands = rows;
    const aquanat = rows.find((b) => b.slug === "aquanat");
    const prods = await getActiveProducts(aquanat?.id);
    if (prods.length > 0) products = prods;
  } catch {
    // BD aún no lista: se muestran datos de referencia
  }

  const featured = brands.find((b) => !b.comingSoon) ?? brands[0];
  const user = await getSessionUser();

  return (
    <div className="flex min-h-dvh flex-col bg-[#0A1930]">
      {/* ENCABEZADO OSCURO (solo la portada; el resto de la app usa Nav claro) */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A1930]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <AquaGoLogo className="h-9 brightness-0 invert" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link href="/#marcas" className="rounded-lg px-3 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">
              Marcas
            </Link>
            {user && (
              <Link href="/mis-pedidos" className="rounded-lg px-3 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">
                Mis pedidos
              </Link>
            )}
            {user?.isAdmin && (
              <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">
                Panel
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-3 text-sm font-semibold text-white sm:flex">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#1B9CE3] font-display text-xs text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  {user.name.split(" ")[0]}
                </span>
                <LogoutButton />
                <Link
                  href="/pedir"
                  className="rounded-xl bg-[#F87E6D] px-4 py-2 text-sm font-bold text-white shadow-card transition hover:bg-[#f96a55]"
                >
                  Pedir ahora
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  Ingresar
                </Link>
                <Link
                  href="/pedir"
                  className="rounded-xl bg-[#F87E6D] px-4 py-2 text-sm font-bold text-white shadow-card transition hover:bg-[#f96a55]"
                >
                  Pedir ahora
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Navegación móvil */}
        <nav className="flex items-center justify-center gap-1 border-t border-white/10 px-2 pb-1.5 pt-1 md:hidden">
          <Link href="/" className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">
            Inicio
          </Link>
          <Link href="/pedir" className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">
            Pedir
          </Link>
          {user && (
            <Link href="/mis-pedidos" className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">
              Mis pedidos
            </Link>
          )}
          {user?.isAdmin && (
            <Link href="/admin" className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">
              Panel
            </Link>
          )}
        </nav>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[28rem] w-[28rem] rounded-full bg-[#56CCF2]/10 blur-3xl" />
          <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-20">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
                <IconMapPin className="h-3.5 w-3.5 text-[#56CCF2]" />
                Encarnación, Itapúa · reparto hoy
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
                Tu bidón de agua mineral de 20 L,{" "}
                <span className="text-[#56CCF2]">a domicilio</span> en Encarnación.
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/70">
                AquaGo es la app de reparto de agua. Elegís la aguatería —hoy{" "}
                <strong className="font-bold text-white">AQUAnat</strong>—, pedís tu recarga y pagás
                en efectivo o por transferencia.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-xl border border-white/10 bg-[#10233E] px-4 py-3 shadow-card">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Recarga 20 L</p>
                  <p className="font-display text-2xl font-bold text-[#56CCF2]">{formatGs(12000)}</p>
                  <p className="text-[11px] font-semibold text-white/50">
                    {formatGs(13000)} con el servicio
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#10233E] px-4 py-3 shadow-card">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Bidón completo</p>
                  <p className="font-display text-2xl font-bold text-[#56CCF2]">{formatGs(50000)}</p>
                  <p className="text-[11px] font-semibold text-white/50">
                    {formatGs(55000)} con el servicio
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/pedir"
                  className="rounded-xl bg-[#1B9CE3] px-6 py-3.5 font-display text-base font-bold text-white shadow-pop transition hover:bg-[#3aaef0]"
                >
                  Pedir mi recarga
                </Link>
                <a
                  href="#marcas"
                  className="rounded-xl border border-white/25 bg-transparent px-6 py-3.5 font-display text-base font-bold text-white transition hover:border-[#56CCF2] hover:text-[#56CCF2]"
                >
                  Ver marcas
                </a>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/70">
                <li className="flex items-center gap-2">
                  <IconTruck className="h-4 w-4 text-[#56CCF2]" /> Entrega 30–60 min
                </li>
                <li className="flex items-center gap-2">
                  <IconCash className="h-4 w-4 text-[#56CCF2]" /> Efectivo con vuelto
                </li>
                <li className="flex items-center gap-2">
                  <IconBank className="h-4 w-4 text-[#56CCF2]" /> Transferencia
                </li>
              </ul>
            </div>

            {/* Ticket de pedido en vivo */}
            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -left-10 -top-8 hidden opacity-95 lg:block">
                <BidonSVG className="h-64 -rotate-6 drop-shadow-xl" />
              </div>
              <div className="relative rounded-2xl border border-white/10 bg-[#10233E] p-5 shadow-pop lg:ml-20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Pedido</p>
                    <p className="font-display text-lg font-bold text-white">AQG-7K2M</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#56CCF2]/50 bg-[#56CCF2]/10 px-3 py-1 text-xs font-bold text-[#56CCF2]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#56CCF2]" />
                    En camino
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white">
                    <AquaNatMark className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-bold text-white">AQUAnat</span>
                  <span className="text-xs font-semibold text-white/50">Puramente Encarnacena</span>
                </div>

                <div className="mt-4 flex gap-4">
                  <div className="relative w-1 shrink-0">
                    <span className="absolute left-1/2 top-1 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full bg-[#56CCF2]/15 text-[#56CCF2]">
                      <IconDroplet className="h-4 w-4" />
                    </span>
                    <span className="absolute left-1/2 top-8 h-[104px] w-0.5 -translate-x-1/2 border-l-2 border-dashed border-white/25" />
                    <span className="animate-ride absolute left-1/2 top-14 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full bg-[#1B9CE3] text-white shadow-card">
                      <IconTruck className="h-3.5 w-3.5" />
                    </span>
                    <span className="absolute left-1/2 top-[132px] grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
                      <IconMapPin className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="flex-1 space-y-3 text-sm">
                    <p className="font-semibold leading-tight text-white">
                      Planta AQUAnat
                      <span className="block text-xs font-medium text-white/50">Salida 08:42</span>
                    </p>
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-white/70">
                      <p className="font-medium text-white/90">2 × Recarga bidón 20 L</p>
                      <p className="mt-1 flex justify-between text-xs">
                        <span>Subtotal</span>
                        <span className="font-semibold tabular-nums">{formatGs(24000)}</span>
                      </p>
                      <p className="flex justify-between text-xs">
                        <span>Servicio 10 %</span>
                        <span className="font-semibold tabular-nums">{formatGs(2500)}</span>
                      </p>
                    </div>
                    <p className="font-semibold leading-tight text-white">
                      Av. Irrazábal 1250
                      <span className="block text-xs font-medium text-white/50">Encarnación · portón blanco</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-dashed border-white/15 pt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1B9CE3] font-display text-xs font-bold text-white">
                      DR
                    </span>
                    <div className="leading-tight">
                      <p className="text-sm font-bold text-white">Diego va en camino</p>
                      <p className="text-xs text-white/50">Camioneta · chapa ABC 123</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-white/50">Total</p>
                    <p className="font-display text-lg font-bold text-[#56CCF2]">{formatGs(26500)}</p>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs font-semibold text-white/50 lg:ml-20">
                Así ves tu pedido dentro de la app.
              </p>
            </div>
          </div>
        </section>

        {/* MARCAS */}
        <section id="marcas" className="border-t border-white/10 bg-white/[0.03]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white">Elegí tu aguatería</h2>
            <p className="mt-2 max-w-xl text-white/60">
              AquaGo funciona como un delivery de marcas: cada aguatería tiene su catálogo, sus
              precios y sus repartidores.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {brands.map((b) => (
                <div
                  key={b.id}
                  className={`rounded-2xl border p-6 shadow-card transition ${
                    b.comingSoon
                      ? "border-dashed border-white/20 bg-white/[0.02]"
                      : "border-white/10 bg-[#10233E] hover:-translate-y-0.5 hover:border-[#56CCF2]/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {b.slug === "aquanat" ? (
                      <span className="inline-block rounded-xl bg-white px-3 py-2">
                        <AquaNatLogo className="h-12" />
                      </span>
                    ) : (
                      <div>
                        <p className="font-display text-xl font-bold text-white/80">{b.name}</p>
                        <p className="text-sm text-white/50">{b.tagline}</p>
                      </div>
                    )}
                    {b.comingSoon ? (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/60">
                        Próximamente
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                        Abierto
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-white/60">{b.description}</p>

                  {!b.comingSoon && (
                    <>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-white/60">
                        <span className="flex items-center gap-1.5">
                          <IconClock className="h-4 w-4 text-[#56CCF2]" />
                          {b.etaMin}–{b.etaMax} min
                        </span>
                        <span className="flex items-center gap-1.5">
                          <IconMapPin className="h-4 w-4 text-[#56CCF2]" />
                          {b.city}
                        </span>
                        <span className="flex items-center gap-1.5">
                          ⭐ {formatRating(b.rating)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <IconTruck className="h-4 w-4 text-[#56CCF2]" />
                          {b.deliveryFee === 0 ? "Envío sin cargo" : formatGs(b.deliveryFee)}
                        </span>
                      </div>
                      <Link
                        href="/pedir"
                        className="mt-5 inline-block rounded-xl bg-[#1B9CE3] px-5 py-3 font-display text-sm font-bold text-white transition hover:bg-[#3aaef0]"
                      >
                        Pedir a {b.name}
                      </Link>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CATÁLOGO AQUANAT */}
        <section id="catalogo" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-white">
                Catálogo de {featured?.name ?? "AQUAnat"}
              </h2>
            </div>
            <Link
              href="/pedir"
              className="rounded-lg border border-[#56CCF2]/40 bg-[#56CCF2]/10 px-4 py-2 text-sm font-bold text-[#56CCF2] transition hover:bg-[#56CCF2]/20"
            >
              Pedir ahora
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <div
                key={i}
                className="group rounded-xl border border-white/10 bg-[#10233E] p-5 shadow-card transition hover:-translate-y-0.5 hover:border-[#56CCF2]/50"
              >
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                  <span className="rounded-full bg-[#56CCF2]/10 px-2.5 py-1 text-[#56CCF2]">
                    {CATEGORY_LABEL[p.category] ?? "Agua"}
                  </span>
                  {p.volume && (
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-white/50">{p.volume}</span>
                  )}
                </div>
                <h3 className="mt-3 font-display text-base font-bold text-white">{p.name}</h3>
                <p className="mt-1.5 min-h-10 text-sm leading-relaxed text-white/60">{p.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display text-xl font-bold text-[#56CCF2]">{formatGs(p.price)}</span>
                  {p.category !== "agua" && (
                    <span className="text-xs font-semibold text-white/50">Línea extra</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como" className="border-t border-white/10 bg-white/[0.03]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white">Cómo funciona</h2>
            <p className="mt-2 max-w-xl text-white/60">
              Cuatro pasos y el bidón está en tu casa. Sin llamadas, sin esperar en línea.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {[
                {
                  icon: <IconUser className="h-6 w-6" />,
                  title: "Registrate",
                  text: "Nombre, teléfono y tu dirección marcada en el mapa de Encarnación.",
                },
                {
                  icon: <IconDroplet className="h-6 w-6" />,
                  title: "Elegí la marca",
                  text: "Hoy AQUAnat. A medida que se sumen aguaterías, aparecen acá.",
                },
                {
                  icon: <IconCash className="h-6 w-6" />,
                  title: "Pedí y pagá",
                  text: "Recarga a 12.000 Gs o bidón completo a 50.000 Gs, en efectivo o transferencia.",
                },
                {
                  icon: <IconTruck className="h-6 w-6" />,
                  title: "Seguí el reparto",
                  text: "Ves cuando lo aceptan, cuando sale y cuando llega a tu puerta.",
                },
              ].map((s, i) => (
                <div key={i} className="relative rounded-xl border border-white/10 bg-[#10233E] p-6 shadow-card">
                  <span className="absolute right-5 top-4 font-display text-4xl font-bold text-white/10">
                    {i + 1}
                  </span>
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#1B9CE3] text-white">
                    {s.icon}
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#081426] text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <AquaGoLogo className="h-9 brightness-0 invert" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/60">
              La app de reparto de agua de Encarnación. Primera marca aliada: AQUAnat, puramente
              encarnacena.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-display text-sm font-bold uppercase tracking-wider text-[#56CCF2]">Contacto</p>
            <ul className="mt-3 space-y-2 text-white/80">
              <li>
                <a
                  href="tel:+595991945969"
                  className="flex items-center gap-2 transition hover:text-white"
                >
                  <IconPhone className="h-4 w-4 text-[#56CCF2]" /> +595 991 945 969
                </a>
              </li>
              <li className="flex items-center gap-2">
                <IconMapPin className="h-4 w-4 text-[#56CCF2]" /> Encarnación, Itapúa — Paraguay
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-display text-sm font-bold uppercase tracking-wider text-[#56CCF2]">Horario</p>
            <ul className="mt-3 space-y-2 text-white/80">
              <li>Lunes a viernes · 07:00 – 17:00</li>
              <li>Sábados · 07:00 – 14:00</li>
              <li>Entrega estimada: 30–60 min</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/40">
          © {new Date().getFullYear()} AquaGo · agua a domicilio en Encarnación — precios en guaraníes (Gs)
        </div>
      </footer>
    </div>
  );
}
