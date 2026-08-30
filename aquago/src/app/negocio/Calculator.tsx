"use client";

import { useMemo, useState } from "react";
import { formatGs, formatNumber } from "@/lib/format";
import { CASH_STEP, computeOrderEconomics, PLANS, projectMonth } from "@/lib/pricing";

export default function Calculator() {
  const [price, setPrice] = useState(12000);
  const [commissionPct, setCommissionPct] = useState(0);
  const [serviceFeePct, setServiceFeePct] = useState(10);
  const [brandsCount, setBrandsCount] = useState(4);
  const [ordersPerDay, setOrdersPerDay] = useState(25);

  const econ = useMemo(
    () =>
      computeOrderEconomics(price, Math.round(commissionPct * 100), {
        serviceFeeBps: Math.round(serviceFeePct * 100),
        serviceFeeMin: 0,
        serviceFee: 0,
      }),
    [price, commissionPct, serviceFeePct]
  );

  const projection = useMemo(() => {
    const plan = {
      ...PLANS[1],
      commissionBps: Math.round(commissionPct * 100),
      serviceFeeBps: Math.round(serviceFeePct * 100),
      serviceFeeMin: 0,
    };
    return projectMonth(brandsCount, ordersPerDay, price, plan);
  }, [brandsCount, ordersPerDay, price, commissionPct, serviceFeePct]);

  // Referencia: cuánto habría que subir el precio para ganar lo mismo sin comisión
  const priceIfMarkedUp = price + econ.platformRevenue;
  const markupPct = ((priceIfMarkedUp - price) / price) * 100;

  const brandPct = (econ.netToBrand / econ.total) * 100;
  const commPct = (econ.commissionAmount / econ.total) * 100;
  const feePct = (econ.serviceFee / econ.total) * 100;

  const sliderCls =
    "w-full accent-water-600 h-1.5 rounded-full bg-water-100 appearance-none cursor-pointer";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Controles */}
      <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-card">
        <h3 className="font-display text-lg font-bold">Ajustá los parámetros</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Cambiá los valores y mirá cómo se reparte cada guaraní.
        </p>

        <div className="mt-6 space-y-6">
          <div>
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-bold">Precio de lista del producto</label>
              <span className="font-display text-base font-bold text-water-700">{formatGs(price)}</span>
            </div>
            <input
              type="range"
              min={8000}
              max={60000}
              step={1000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className={`${sliderCls} mt-2`}
            />
            <div className="mt-1 flex justify-between text-[11px] font-semibold text-ink-soft">
              <span>8.000</span>
              <span>Recarga 12.000 · Bidón 50.000</span>
              <span>60.000</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-bold">Comisión a la marca</label>
              <span className="font-display text-base font-bold text-water-700">
                {commissionPct.toFixed(1)} %
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={commissionPct}
              onChange={(e) => setCommissionPct(Number(e.target.value))}
              className={`${sliderCls} mt-2`}
            />
            <p className="mt-1 text-[11px] font-semibold text-ink-soft">
              El modelo actual de AquaGo es 0 %: a la marca no se le cobra nada. Movelo solo para ver
              cuánto cambiaría si algún día decidieras cobrarle.
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-bold">Costo de servicio al cliente</label>
              <span className="font-display text-base font-bold text-water-700">
                {serviceFeePct} % · {formatGs(econ.serviceFee)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={25}
              step={1}
              value={serviceFeePct}
              onChange={(e) => setServiceFeePct(Number(e.target.value))}
              className={`${sliderCls} mt-2`}
            />
            <p className="mt-1 text-[11px] font-semibold text-ink-soft">
              Porcentaje sobre el pedido, visible en el checkout. No es un aumento del agua.
            </p>
          </div>

          <div className="grid gap-4 border-t border-dashed border-ink/15 pt-5 sm:grid-cols-2">
            <div>
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-bold">Marcas activas</label>
                <span className="font-display text-base font-bold">{brandsCount}</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={brandsCount}
                onChange={(e) => setBrandsCount(Number(e.target.value))}
                className={`${sliderCls} mt-2`}
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-bold">Pedidos/día por marca</label>
                <span className="font-display text-base font-bold">{ordersPerDay}</span>
              </div>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={ordersPerDay}
                onChange={(e) => setOrdersPerDay(Number(e.target.value))}
                className={`${sliderCls} mt-2`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="space-y-4">
        {/* Reparto del pedido */}
        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-bold">Un pedido, guaraní por guaraní</h3>
            <span className="rounded-full bg-water-50 px-3 py-1 text-xs font-bold text-water-700">
              El cliente paga {formatGs(econ.total)}
            </span>
          </div>

          {/* Barra de reparto */}
          <div className="mt-5 flex h-11 overflow-hidden rounded-xl">
            <div
              className="flex items-center justify-center bg-water-700 text-xs font-bold text-white"
              style={{ width: `${brandPct}%` }}
              title="Queda en la marca"
            >
              {brandPct > 22 && "Marca"}
            </div>
            <div
              className="flex items-center justify-center bg-water-400 text-xs font-bold text-white"
              style={{ width: `${commPct}%` }}
              title="Comisión AquaGo"
            >
              {commPct > 12 && "Comisión"}
            </div>
            <div
              className="flex items-center justify-center bg-ok text-xs font-bold text-white"
              style={{ width: `${feePct}%` }}
              title="Costo de servicio"
            >
              {feePct > 12 && "Servicio"}
            </div>
          </div>

          <dl className="mt-5 space-y-2.5 text-sm">
            <Row label="Precio de lista (no se toca)" value={formatGs(econ.subtotal)} strong />
            <Row
              label={`+ Costo de servicio (${serviceFeePct} % al cliente)`}
              value={formatGs(econ.serviceFee)}
              accent="ok"
            />
            <Row label="= Total que paga el cliente" value={formatGs(econ.total)} strong divider />
            <Row
              label={`− Comisión AquaGo (${commissionPct.toFixed(1)} % sobre lista)`}
              value={`− ${formatGs(econ.commissionAmount)}`}
              accent="water"
            />
            <Row label="→ Recibe la marca" value={formatGs(econ.netToBrand)} strong accent="brand" divider />
            <Row
              label="→ Gana AquaGo"
              value={formatGs(econ.platformRevenue)}
              strong
              accent="water"
            />
          </dl>

          <div className="mt-4 rounded-xl bg-paper p-4 text-sm">
            <p className="font-bold">
              Take rate real: {(econ.effectiveTakeRate * 100).toFixed(1)} % de lo que paga el cliente
            </p>
            <p className="mt-1 text-ink-soft">
              El total siempre queda en múltiplos de {CASH_STEP} Gs, así el repartidor no tiene que
              redondear a mano en la puerta.
            </p>
            <p className="mt-1 text-ink-soft">
              Si en vez del costo de servicio subieras el precio del bidón, tendría que costar{" "}
              <strong className="text-ink">{formatGs(priceIfMarkedUp)}</strong> ({markupPct.toFixed(1)} % más
              caro). Se prefiere el cargo aparte porque así el precio del agua queda igual que en el local
              y la marca cobra lo suyo completo.
            </p>
          </div>
        </div>

        {/* Proyección mensual */}
        <div className="rounded-2xl border border-water-200 bg-water-50 p-6">
          <h3 className="font-display text-lg font-bold">Proyección mensual de la plataforma</h3>
          <p className="mt-1 text-sm text-ink-soft">
            {brandsCount} marca{brandsCount > 1 ? "s" : ""} × {ordersPerDay} pedidos/día ={" "}
            <strong className="text-ink">{formatNumber(projection.ordersPerMonth)} pedidos/mes</strong>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Volumen transado (GMV)" value={formatGs(projection.grossVolume)} />
            <Metric label="Comisiones" value={formatGs(projection.commissionRevenue)} />
            <Metric label="Costos de servicio" value={formatGs(projection.serviceFeeRevenue)} />
            <Metric label="Abonos de plan" value={formatGs(projection.monthlyFeeRevenue)} />
          </div>
          <div className="mt-4 rounded-xl bg-water-700 p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-water-200">
              Ingreso mensual de AquaGo
            </p>
            <p className="font-display text-3xl font-bold">{formatGs(projection.platformRevenue)}</p>
            <p className="mt-1 text-xs text-water-100">
              Y las marcas se quedan con {formatGs(projection.brandRevenue)} de venta neta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  accent,
  divider,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: "ok" | "water" | "brand";
  divider?: boolean;
}) {
  const color =
    accent === "ok"
      ? "text-ok"
      : accent === "water"
        ? "text-water-600"
        : accent === "brand"
          ? "text-water-800"
          : "text-ink";
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        divider ? "border-t border-ink/10 pt-2.5" : ""
      }`}
    >
      <dt className={`${strong ? "font-bold" : ""} text-ink-soft`}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-display font-bold" : "font-semibold"} ${color}`}>
        {value}
      </dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold text-water-800">{value}</p>
    </div>
  );
}
