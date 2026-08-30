import Link from "next/link";
import Nav from "@/components/Nav";
import Calculator from "./Calculator";
import { PLANS, bpsToPct } from "@/lib/pricing";
import { formatGs } from "@/lib/format";
import {
  IconBank,
  IconCash,
  IconCheck,
  IconClock,
  IconMapPin,
  IconTruck,
  IconUser,
} from "@/components/icons";

export const metadata = { title: "Modelo de negocio · AquaGo" };

export default function NegocioPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />

      <main className="flex-1">
        {/* HERO */}
        <section className="border-b border-ink/8 bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-water-300/60 bg-water-50 px-3 py-1 text-xs font-semibold text-water-700">
              Modelo de negocio
            </span>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              AquaGo gana <span className="text-water-600">sin cobrarle nada a la marca</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
              Una sola fuente de ingreso: <strong className="text-ink">el 10 % de costo de servicio</strong>{" "}
              que paga el cliente por el envío. La aguatería cobra su precio de lista completo —la recarga
              sigue siendo de <strong className="text-ink">12.000 Gs</strong>— y no paga comisión ni abono.
            </p>
          </div>
        </section>

        {/* FUENTE ÚNICA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight">Una sola fuente de ingreso</h2>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Nada de comisiones escondidas ni abonos. El cliente paga el agua a precio de lista más un
            10 % por el servicio de traérsela, y ese 10 % es AquaGo.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border-2 border-water-500 bg-white p-6 shadow-card md:col-span-1">
              <p className="text-xs font-bold uppercase tracking-wider text-water-600">Lo paga el cliente</p>
              <h3 className="mt-1 font-display text-lg font-bold">Costo de servicio</h3>
              <p className="mt-3 font-display text-4xl font-bold text-water-700">10 %</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Se muestra como línea aparte en el checkout, antes de confirmar. Sobre una recarga de
                12.000 Gs son 1.000 Gs.
              </p>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-paper p-6 md:col-span-2">
              <h3 className="font-display text-lg font-bold">Lo que NO se cobra</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  ["0 % de comisión por venta", "La marca cobra íntegro su precio de lista."],
                  ["0 Gs de abono mensual", "No hay cuota fija ni costo de alta."],
                  ["0 Gs por el panel", "Pedidos, reparto, comprobantes y datos incluidos."],
                ].map(([t, d]) => (
                  <li key={t} className="flex gap-3">
                    <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
                    <span>
                      <strong className="font-bold">{t}</strong>
                      <span className="block text-ink-soft">{d}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl bg-white p-4 text-sm leading-relaxed text-ink-soft">
                <strong className="text-ink">Por qué conviene así:</strong> si a la aguatería le cobrás
                comisión, tarde o temprano le conviene atender por teléfono y esquivar la app. Cobrándole
                cero, la app es ganancia pura para ella: pedidos que antes no tenía, sin resignar margen.
                El costo lo asume quien recibe la comodidad —el cliente— igual que el envío de cualquier
                delivery.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {[
              { l: "Recarga 20 L", v: "12.000 Gs", c: "bg-white" },
              { l: "+ servicio 10 %", v: "1.000 Gs", c: "bg-water-50 text-water-800" },
              { l: "Paga el cliente", v: "13.000 Gs", c: "bg-water-700 text-white" },
              { l: "Recibe la marca", v: "12.000 Gs", c: "bg-ok-soft text-ok" },
            ].map((x) => (
              <div key={x.l} className={`rounded-xl border border-ink/10 p-4 ${x.c}`}>
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">{x.l}</p>
                <p className="mt-0.5 font-display text-xl font-bold tabular-nums">{x.v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SIMULADOR */}
        <section className="border-y border-ink/8 bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="font-display text-3xl font-bold tracking-tight">Simulador</h2>
            <p className="mt-2 max-w-xl text-ink-soft">
              Movés los controles y ves exactamente quién recibe qué en cada pedido.
            </p>
            <div className="mt-8">
              <Calculator />
            </div>
          </div>
        </section>

        {/* PLANES */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight">Cómo se suma una aguatería</h2>
          <p className="mt-2 max-w-xl text-ink-soft">
            Una sola condición, igual para todos: sin comisión ni abono.
          </p>
          <div className="mt-8 grid gap-4 md:max-w-md">
            {PLANS.map((p, i) => (
              <div
                key={p.key}
                className={`rounded-2xl border p-6 shadow-card ${
                  i === 1 ? "border-water-500 bg-white ring-2 ring-water-200" : "border-ink/10 bg-white"
                }`}
              >
                {i === 1 && (
                  <span className="mb-3 inline-block rounded-full bg-water-700 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                    Más elegido
                  </span>
                )}
                <h3 className="font-display text-xl font-bold">{p.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">{p.bestFor}</p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-ok">
                    {bpsToPct(p.commissionBps)}
                  </span>
                  <span className="text-sm font-semibold text-ink-soft">de comisión por venta</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-ink-soft">
                  {p.monthlyFee === 0 ? "Sin abono mensual" : `+ ${formatGs(p.monthlyFee)} / mes`}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-ink-soft">
                  Cliente paga {(p.serviceFeeBps / 100).toFixed(0)} % de servicio
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex gap-2">
                      <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                      <span className="text-ink-soft">{perk}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 border-t border-dashed border-ink/15 pt-3 text-xs font-semibold text-ink-soft">
                  La marca solo le transfiere a AquaGo el 10 % de los pedidos que cobró en efectivo.
                  En los pagos por transferencia ya se retiene solo.
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AUTOMATIZACIÓN DEL COBRO */}
        <section className="border-y border-ink/8 bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="font-display text-3xl font-bold tracking-tight">
              Cómo se cobra la comisión, solo
            </h2>
            <p className="mt-2 max-w-2xl text-ink-soft">
              El truco está en el medio de pago. Cuando el dinero pasa por AquaGo, el 10 % se retiene
              solo. Cuando la marca cobra el total en efectivo, ese 10 % queda como cuenta corriente y se
              liquida por período.
            </p>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {/* Camino A */}
              <div className="rounded-2xl border-2 border-ok/30 bg-ok-soft/40 p-6">
                <div className="flex items-center gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-ok text-white">
                    <IconBank className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold">Pago por transferencia</h3>
                    <p className="text-xs font-bold uppercase tracking-wider text-ok">
                      Cobro 100 % automático
                    </p>
                  </div>
                </div>
                <ol className="mt-5 space-y-3 text-sm">
                  {[
                    "El cliente transfiere a la cuenta recaudadora de AquaGo.",
                    "La plataforma retiene el 10 % de costo de servicio.",
                    "El neto se transfiere a la marca en el payout del período.",
                    "La marca nunca tuvo que pagarte nada: ya salió descontado.",
                  ].map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ok text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="text-ink-soft">{s}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-ink-soft">
                  Este es el camino a empujar: mientras más pagos digitales, menos cobranza manual.
                </p>
              </div>

              {/* Camino B */}
              <div className="rounded-2xl border-2 border-warn/30 bg-warn-soft/40 p-6">
                <div className="flex items-center gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-warn text-white">
                    <IconCash className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold">Pago en efectivo</h3>
                    <p className="text-xs font-bold uppercase tracking-wider text-warn">
                      Cuenta corriente + liquidación
                    </p>
                  </div>
                </div>
                <ol className="mt-5 space-y-3 text-sm">
                  {[
                    "El repartidor cobra en la puerta: la plata queda en la marca.",
                    "AquaGo registra ese 10 % como saldo a favor en el libro mayor.",
                    "Al cierre del ciclo se emite la liquidación con 3 días de plazo.",
                    "Si no paga: aviso, luego pausa de la marca en la app hasta regularizar.",
                  ].map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-warn text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="text-ink-soft">{s}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-ink-soft">
                  La palanca real: si la marca vende bien por la app, no se arriesga a que la pausen.
                </p>
              </div>
            </div>

            {/* Compensación */}
            <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-6 shadow-card">
              <h3 className="font-display text-lg font-bold">
                La jugada maestra: compensación automática
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Cuando una marca tiene pedidos por transferencia <em>y</em> por efectivo, AquaGo no le cobra
                nada: <strong className="text-ink">descuenta el 10 % del efectivo</strong> contra la plata
                digital que le tiene que transferir. La marca recibe un solo pago neto y la cobranza queda
                resuelta sin perseguir a nadie.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                {[
                  { l: "Venta por transferencia", v: "600.000 Gs", c: "bg-water-50 text-water-800" },
                  { l: "Servicio de esos pedidos", v: "− 60.000 Gs", c: "bg-water-50 text-water-800" },
                  { l: "Servicio del efectivo", v: "− 40.000 Gs", c: "bg-warn-soft text-warn" },
                  { l: "Payout neto a la marca", v: "500.000 Gs", c: "bg-ok-soft text-ok" },
                ].map((x) => (
                  <div key={x.l} className={`rounded-xl p-3 ${x.c}`}>
                    <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">{x.l}</p>
                    <p className="mt-0.5 font-display text-lg font-bold tabular-nums">{x.v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { icon: <IconClock className="h-5 w-5" />, t: "Cierre automático", d: "Un proceso diario junta las comisiones pendientes y emite la liquidación del ciclo (semanal, quincenal o mensual)." },
                { icon: <IconTruck className="h-5 w-5" />, t: "Sin fricción diaria", d: "Nadie factura pedido por pedido: la marca ve un único resumen con el detalle de cada código." },
                { icon: <IconCheck className="h-5 w-5" />, t: "Mora gestionada", d: "Vencida la liquidación, el estado cambia solo y la marca puede pausarse hasta que regularice." },
              ].map((x) => (
                <div key={x.t} className="rounded-xl border border-ink/10 bg-white p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-water-700 text-white">
                    {x.icon}
                  </span>
                  <h4 className="mt-3 font-display text-base font-bold">{x.t}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{x.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* EL ACTIVO: LOS DATOS */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            El activo que se construye solo: los datos
          </h2>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Cada pedido deja rastro. A los seis meses AquaGo sabe más del consumo de agua de Encarnación que
            cualquier aguatería individual — y eso vale tanto como la comisión.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <IconUser className="h-5 w-5" />, t: "Padrón de clientes", d: "Nombre, teléfono, dirección exacta y método de pago preferido. La marca sola nunca lo tuvo ordenado." },
              { icon: <IconClock className="h-5 w-5" />, t: "Frecuencia de consumo", d: "Cada cuántos días pide cada hogar. Permite avisar «se te está por acabar» y disparar la recompra." },
              { icon: <IconMapPin className="h-5 w-5" />, t: "Mapa de demanda", d: "Qué barrios piden más, a qué hora y con qué ticket. Define dónde poner la próxima camioneta." },
              { icon: <IconTruck className="h-5 w-5" />, t: "Rendimiento por marca", d: "Quién entrega a tiempo, quién cancela, quién crece. Ordena a quién darle prioridad en la app." },
            ].map((x) => (
              <div key={x.t} className="rounded-xl border border-ink/10 bg-white p-5 shadow-card">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-water-100 text-water-700">
                  {x.icon}
                </span>
                <h3 className="mt-3 font-display text-base font-bold">{x.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{x.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-water-950 p-8 text-white">
            <h3 className="font-display text-xl font-bold">Cómo esa data se convierte en plata</h3>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {[
                { t: "Recompra dirigida", d: "Si el promedio de un cliente es cada 10 días y van 14, se le manda un recordatorio. Sube la frecuencia sin gastar en publicidad." },
                { t: "Rescate de inactivos", d: "La app lista sola quiénes dejaron de pedir. Un mensaje con un incentivo chico recupera clientes que la marca ya daba por perdidos." },
                { t: "Venta de visibilidad", d: "Con el mapa de demanda podés cobrarle a una marca por aparecer primero en los barrios donde más se vende." },
              ].map((x) => (
                <div key={x.t}>
                  <p className="font-display text-base font-bold text-water-300">{x.t}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/70">{x.d}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 rounded-xl bg-white/10 p-4 text-sm leading-relaxed text-white/80">
              <strong className="text-white">Ojo con el encuadre legal y comercial:</strong> los datos del
              cliente son de AquaGo y del cliente, no de la marca. Conviene dejarlo escrito en el contrato de
              alta y en los términos de uso, junto con el consentimiento para enviar avisos de recompra.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-xl bg-water-700 px-6 py-3.5 font-display text-base font-bold text-white shadow-card transition hover:bg-water-800"
            >
              Ver el panel con datos reales
            </Link>
            <Link
              href="/pedir"
              className="rounded-xl border border-ink/15 bg-white px-6 py-3.5 font-display text-base font-bold text-ink transition hover:border-water-400"
            >
              Probar la app del cliente
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/8 bg-white/60 py-8">
        <p className="text-center text-xs text-ink-soft">
          AquaGo · esquema económico del prototipo — valores en guaraníes (Gs)
        </p>
      </footer>
    </div>
  );
}
