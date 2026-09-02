"use client";

import { useEffect, useMemo, useState } from "react";
import { formatGs, formatNumber, dateShort } from "@/lib/format";
import { bpsToPct } from "@/lib/pricing";
import type { AnalyticsPayload } from "@/lib/analytics";
import type { BrandView } from "@/lib/queries";
import { IconClock, IconMapPin, IconPhone, IconUser } from "@/components/icons";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function AnalyticsTab({ brands }: { brands: BrandView[] }) {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [brandId, setBrandId] = useState<string>("todas");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?brandId=${brandId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [brandId]);

  const maxSeries = useMemo(
    () => Math.max(1, ...(data?.series ?? []).map((s) => s.gmv)),
    [data]
  );
  const maxZone = useMemo(() => Math.max(1, ...(data?.zones ?? []).map((z) => z.orders)), [data]);
  const maxHour = useMemo(() => Math.max(1, ...(data?.hours ?? []).map((h) => h.orders)), [data]);
  const maxWd = useMemo(() => Math.max(1, ...(data?.weekdays ?? []).map((w) => w.orders)), [data]);

  if (loading && !data) {
    return (
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-water-50" />
        ))}
      </div>
    );
  }
  if (!data) return null;

  const k = data.kpis;
  const totalPay = data.paymentMix.reduce((s, p) => s + p.orders, 0) || 1;

  return (
    <section className="mt-4 space-y-5">
      {/* Filtro de marca */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">Marca:</span>
        <button
          onClick={() => setBrandId("todas")}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
            brandId === "todas"
              ? "border-water-700 bg-water-700 text-white"
              : "border-ink/15 bg-white text-ink-soft hover:border-water-400"
          }`}
        >
          Todas
        </button>
        {brands
          .filter((b) => !b.comingSoon)
          .map((b) => (
            <button
              key={b.id}
              onClick={() => setBrandId(String(b.id))}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                brandId === String(b.id)
                  ? "border-water-700 bg-water-700 text-white"
                  : "border-ink/15 bg-white text-ink-soft hover:border-water-400"
              }`}
            >
              {b.name}
            </button>
          ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Pedidos (30 d)" value={formatNumber(k.orders30)} />
        <Kpi label="Volumen transado" value={formatGs(k.gmv30)} />
        <Kpi label="Ingreso plataforma" value={formatGs(k.platformRevenue30)} accent="text-water-700" />
        <Kpi label="Ticket promedio" value={formatGs(k.avgTicket)} />
        <Kpi label="Clientes activos" value={formatNumber(k.activeCustomers30)} />
        <Kpi label="Clientes nuevos" value={formatNumber(k.newCustomers30)} accent="text-ok" />
        <Kpi label="Tasa de recompra" value={`${(k.repeatRate * 100).toFixed(0)} %`} accent="text-ok" />
        <Kpi label="Litros repartidos" value={`${formatNumber(k.litersDelivered30)} L`} />
      </div>

      {/* Frecuencia destacada */}
      <div className="rounded-2xl border border-water-200 bg-water-50 p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-water-700">
              Frecuencia de consumo
            </p>
            <p className="font-display text-3xl font-bold text-water-800">
              {k.avgDaysBetweenOrders} días
            </p>
            <p className="text-xs font-semibold text-ink-soft">promedio entre pedidos de un mismo cliente</p>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-ink-soft">
            Este número es el corazón del negocio: si sabés que un hogar pide cada{" "}
            {Math.round(k.avgDaysBetweenOrders)} días, podés avisarle justo antes de que se quede sin agua y
            adelantar la recompra. Subir la frecuencia un solo día por cliente mueve la facturación entera.
          </p>
        </div>
      </div>

      {/* Serie diaria */}
      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-base font-bold">Venta diaria (30 días)</h3>
          <span className="text-xs font-semibold text-ink-soft">barra = GMV · línea base = pedidos</span>
        </div>
        <div className="mt-4 flex h-40 items-end gap-[3px]">
          {data.series.map((s) => (
            <div key={s.date} className="group relative flex-1">
              <div
                className="w-full rounded-t bg-water-500 transition group-hover:bg-water-700"
                style={{ height: `${Math.max(2, (s.gmv / maxSeries) * 150)}px` }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-white group-hover:block">
                {dateShort(s.date)} · {s.orders} ped. · {formatGs(s.gmv)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] font-semibold text-ink-soft">
          <span>{dateShort(data.series[0].date)}</span>
          <span>{dateShort(data.series[data.series.length - 1].date)}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Zonas */}
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-display text-base font-bold">
            <IconMapPin className="h-4 w-4 text-water-600" />
            Dónde se vende más
          </h3>
          <div className="mt-4 space-y-2.5">
            {data.zones.map((z) => (
              <div key={z.zone}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold">{z.zone}</span>
                  <span className="text-xs font-semibold text-ink-soft">
                    {z.orders} ped. · {z.customers} clientes · {formatGs(z.gmv)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-water-50">
                  <div
                    className="h-full rounded-full bg-water-500"
                    style={{ width: `${(z.orders / maxZone) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-paper px-3 py-2 text-xs text-ink-soft">
            Con esto decidís dónde conviene sumar una camioneta o a qué barrio empujar promociones.
          </p>
        </div>

        {/* Horas + días */}
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-display text-base font-bold">
            <IconClock className="h-4 w-4 text-water-600" />
            Cuándo piden
          </h3>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-ink-soft">Por hora</p>
          <div className="mt-2 flex h-24 items-end gap-1">
            {Array.from({ length: 24 }, (_, h) => {
              const row = data.hours.find((x) => x.hour === h);
              const v = row?.orders ?? 0;
              return (
                <div key={h} className="group relative flex-1">
                  <div
                    className={`w-full rounded-t ${v > 0 ? "bg-water-400" : "bg-water-50"}`}
                    style={{ height: `${Math.max(2, (v / maxHour) * 88)}px` }}
                  />
                  {v > 0 && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-white group-hover:block">
                      {h}:00 · {v}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] font-semibold text-ink-soft">
            <span>0h</span>
            <span>12h</span>
            <span>23h</span>
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-ink-soft">Por día</p>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d, i) => {
              const v = data.weekdays.find((x) => x.weekday === i)?.orders ?? 0;
              return (
                <div key={d} className="text-center">
                  <div
                    className="mx-auto w-full rounded-lg bg-water-500"
                    style={{ height: `${Math.max(6, (v / maxWd) * 56)}px`, opacity: 0.35 + (v / maxWd) * 0.65 }}
                  />
                  <p className="mt-1 text-[10px] font-bold text-ink-soft">{d}</p>
                  <p className="text-[10px] font-semibold tabular-nums">{v}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Productos */}
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
          <h3 className="font-display text-base font-bold">Qué se vende</h3>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {data.topProducts.map((p) => (
                <tr key={p.name} className="border-b border-ink/6 last:border-0">
                  <td className="py-2 font-semibold">{p.name}</td>
                  <td className="py-2 text-right tabular-nums text-ink-soft">{p.quantity} u.</td>
                  <td className="py-2 text-right font-display font-bold tabular-nums text-water-700">
                    {formatGs(p.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 className="mt-5 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Medios de pago
          </h4>
          <div className="mt-2 flex h-8 overflow-hidden rounded-lg">
            {data.paymentMix.map((p) => (
              <div
                key={p.method}
                className={`flex items-center justify-center text-[11px] font-bold text-white ${
                  p.method === "efectivo" ? "bg-warn" : "bg-ok"
                }`}
                style={{ width: `${(p.orders / totalPay) * 100}%` }}
              >
                {((p.orders / totalPay) * 100).toFixed(0)}%
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-4 text-xs font-semibold text-ink-soft">
            {data.paymentMix.map((p) => (
              <span key={p.method} className="flex items-center gap-1.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${p.method === "efectivo" ? "bg-warn" : "bg-ok"}`}
                />
                {p.method} · {p.orders} ped.
              </span>
            ))}
          </div>
          <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-xs text-ink-soft">
            Cuanto más alto el porcentaje de transferencia, más comisión se cobra sola.
          </p>
        </div>

        {/* Marcas */}
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
          <h3 className="font-display text-base font-bold">Rendimiento por marca</h3>
          <div className="mt-3 space-y-3">
            {data.brandsPerf.map((b) => (
              <div key={b.id} className="rounded-xl bg-paper p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold">{b.name}</span>
                  <span className="rounded-full bg-water-100 px-2 py-0.5 text-[11px] font-bold text-water-700">
                    comisión {bpsToPct(b.commissionBps)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="font-bold text-ink-soft">Pedidos</p>
                    <p className="font-display text-sm font-bold tabular-nums">{b.orders}</p>
                  </div>
                  <div>
                    <p className="font-bold text-ink-soft">GMV</p>
                    <p className="font-display text-sm font-bold tabular-nums">{formatGs(b.gmv)}</p>
                  </div>
                  <div>
                    <p className="font-bold text-ink-soft">Te dejó</p>
                    <p className="font-display text-sm font-bold tabular-nums text-water-700">
                      {formatGs(b.commission)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clientes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-display text-base font-bold">
            <IconUser className="h-4 w-4 text-water-600" />
            Mejores clientes
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  <th className="pb-2">Cliente</th>
                  <th className="pb-2">Zona</th>
                  <th className="pb-2 text-right">Ped.</th>
                  <th className="pb-2 text-right">Cada</th>
                  <th className="pb-2 text-right">Gastó</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((c) => (
                  <tr key={c.id} className="border-t border-ink/6">
                    <td className="py-2 font-semibold">{c.name}</td>
                    <td className="py-2 text-xs text-ink-soft">{c.zone || "—"}</td>
                    <td className="py-2 text-right tabular-nums">{c.ordersCount}</td>
                    <td className="py-2 text-right text-xs tabular-nums text-ink-soft">
                      {c.avgDays ? `${c.avgDays} d` : "—"}
                    </td>
                    <td className="py-2 text-right font-display font-bold tabular-nums text-water-700">
                      {formatGs(c.spent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-warn/30 bg-warn-soft/40 p-5">
          <h3 className="font-display text-base font-bold">Clientes que se están enfriando</h3>
          <p className="mt-1 text-xs text-ink-soft">
            Pasaron más del 150 % de su tiempo habitual sin pedir. Son los que hay que llamar hoy.
          </p>
          {data.atRisk.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">Nadie en riesgo por ahora. 👌</p>
          ) : (
            <div className="mt-3 space-y-2">
              {data.atRisk.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3"
                >
                  <div>
                    <p className="text-sm font-bold">{c.name}</p>
                    <p className="text-xs text-ink-soft">
                      {c.zone || "—"} · pedía cada {c.avgDays} días · {c.ordersCount} pedidos
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
                      {c.daysSince} días sin pedir
                    </span>
                    <a
                      href={`tel:${c.phone.replace(/\s/g, "")}`}
                      className="flex items-center gap-1 rounded-lg bg-water-700 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-water-800"
                    >
                      <IconPhone className="h-3.5 w-3.5" /> Llamar
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </section>
  );
}

function Kpi({ label, value, accent = "text-ink" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
