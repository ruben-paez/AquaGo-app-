"use client";

import { useEffect, useState } from "react";
import { formatGs, dateShort } from "@/lib/format";
import { bpsToPct, PLANS } from "@/lib/pricing";
import { IconBank, IconCash, IconCheck, IconClock } from "@/components/icons";

interface BillingBrand {
  id: number;
  name: string;
  slug: string;
  plan: string;
  commissionBps: number;
  monthlyFee: number;
  serviceFeeBps: number;
  serviceFeeMin: number;
  serviceFee: number;
  billingCycle: string;
  autoRetention: boolean;
  billingStatus: string;
  walletBalance: number;
  pendingCommission: number;
  pendingRetained: number;
  pendingOrders: number;
}

interface Settlement {
  id: number;
  brandId: number;
  brandName: string;
  code: string;
  periodStart: string;
  periodEnd: string;
  ordersCount: number;
  grossSales: number;
  commissionTotal: number;
  serviceFeeTotal: number;
  monthlyFee: number;
  retainedAmount: number;
  amountDue: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
}

interface BillingData {
  brands: BillingBrand[];
  settlements: Settlement[];
  totals: { pendingToCollect: number; settledThisMonth: number; overdue: number };
}

const STATUS_STYLE: Record<string, string> = {
  emitida: "bg-water-100 text-water-700",
  pagada: "bg-ok-soft text-ok",
  vencida: "bg-danger-soft text-danger",
};

const BILLING_STATUS: Record<string, { label: string; cls: string }> = {
  al_dia: { label: "Al día", cls: "bg-ok-soft text-ok" },
  por_vencer: { label: "Por vencer", cls: "bg-warn-soft text-warn" },
  suspendida: { label: "⛔ Suspendida", cls: "bg-danger-soft text-danger" },
};

export default function BillingTab() {
  const [data, setData] = useState<BillingData | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/admin/billing");
      if (res.ok) setData(await res.json());
    } catch {
      // sin conexión
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runSettlement(brandId?: number) {
    setBusy(true);
    setFlash("");
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", brandId }),
      });
      const d = await res.json();
      const created = (d.results ?? []).filter((r: { created: boolean }) => r.created);
      setFlash(
        created.length === 0
          ? "No había comisiones pendientes para liquidar."
          : `Se emitieron ${created.length} liquidación(es) por ${formatGs(
              created.reduce((s: number, r: { amountDue: number }) => s + r.amountDue, 0)
            )}.`
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function pay(settlementId: number) {
    setBusy(true);
    try {
      await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay", settlementId }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function patchBrand(id: number, patch: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/admin/brands/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="mt-4 space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-water-50" />
        ))}
      </div>
    );
  }

  const selectCls =
    "rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-water-500";

  return (
    <section className="mt-4 space-y-5">
      {/* Totales */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Servicio por cobrar" value={formatGs(data.totals.pendingToCollect)} accent="text-warn" />
        <Kpi label="Cobrado este mes" value={formatGs(data.totals.settledThisMonth)} accent="text-ok" />
        <Kpi label="En mora" value={formatGs(data.totals.overdue)} accent="text-danger" />
        <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Cierre de período</p>
          <button
            onClick={() => runSettlement()}
            disabled={busy}
            className="mt-2 w-full rounded-lg bg-water-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-water-800 disabled:opacity-50"
          >
            {busy ? "Procesando…" : "Correr liquidación"}
          </button>
        </div>
      </div>

      {flash && (
        <p className="rounded-lg border border-water-200 bg-water-50 px-3 py-2.5 text-sm font-semibold text-water-800">
          {flash}
        </p>
      )}

      {/* Marcas y su cuenta corriente */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          Cuenta corriente por marca
        </h3>
        <div className="mt-3 space-y-3">
          {data.brands.map((b) => {
            const st = BILLING_STATUS[b.billingStatus] ?? BILLING_STATUS.al_dia;
            const porCobrar = b.pendingCommission - b.pendingRetained;
            return (
              <div key={b.id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base font-bold">{b.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
                    <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-bold text-ok">
                      {bpsToPct(b.commissionBps)} de comisión
                    </span>
                  </div>
                  <button
                    onClick={() => runSettlement(b.id)}
                    disabled={busy || b.pendingOrders === 0}
                    className="rounded-lg border border-water-600/30 bg-water-50 px-3 py-1.5 text-xs font-bold text-water-700 transition hover:bg-water-100 disabled:opacity-40"
                  >
                    Liquidar {b.pendingOrders > 0 ? `(${b.pendingOrders})` : ""}
                  </button>
                </div>

                {b.billingStatus === "suspendida" && (
                  <p className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
                    Fuera de la app por mora. No recibe pedidos nuevos hasta registrar el pago;
                    ahí se reactiva sola.
                  </p>
                )}
                {b.billingStatus === "por_vencer" && (
                  <p className="mt-3 rounded-lg border border-warn/30 bg-warn-soft px-3 py-2 text-xs font-semibold text-warn">
                    Tiene una liquidación vencida. Si no paga, la app la suspende automáticamente.
                  </p>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <Cell label="Servicio pendiente" value={formatGs(b.pendingCommission)} />
                  <Cell
                    label="Ya retenido (transf.)"
                    value={formatGs(b.pendingRetained)}
                    icon={<IconBank className="h-3.5 w-3.5" />}
                    tone="ok"
                  />
                  <Cell
                    label="A cobrar (efectivo)"
                    value={formatGs(porCobrar)}
                    icon={<IconCash className="h-3.5 w-3.5" />}
                    tone="warn"
                  />
                  <Cell
                    label="Saldo cuenta corriente"
                    value={formatGs(b.walletBalance)}
                    tone={b.walletBalance < 0 ? "warn" : "ok"}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-ink/15 pt-3">
                  <label className="text-xs font-bold text-ink-soft">Plan</label>
                  <select
                    className={selectCls}
                    value={b.plan}
                    onChange={(e) => patchBrand(b.id, { plan: e.target.value })}
                  >
                    {PLANS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.name} · {bpsToPct(p.commissionBps)}
                      </option>
                    ))}
                  </select>

                  <label className="ml-2 text-xs font-bold text-ink-soft">Ciclo</label>
                  <select
                    className={selectCls}
                    value={b.billingCycle}
                    onChange={(e) => patchBrand(b.id, { billingCycle: e.target.value })}
                  >
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                  </select>

                  <label className="ml-2 text-xs font-bold text-ink-soft">Estado</label>
                  <select
                    className={selectCls}
                    value={b.billingStatus}
                    onChange={(e) => patchBrand(b.id, { billingStatus: e.target.value })}
                  >
                    <option value="al_dia">Al día</option>
                    <option value="por_vencer">Por vencer</option>
                    <option value="suspendida">Suspendida</option>
                  </select>

                  <span className="ml-auto text-xs font-semibold text-ink-soft">
                    Costo de servicio al cliente: {(b.serviceFeeBps / 100).toFixed(0)} % · mínimo{" "}
                    {formatGs(b.serviceFeeMin)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Liquidaciones */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          Liquidaciones emitidas
        </h3>
        {data.settlements.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-center text-sm text-ink-soft">
            Todavía no hay liquidaciones. Tocá «Correr liquidación» para cerrar el período con las
            comisiones acumuladas.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-card">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs font-bold uppercase tracking-wider text-ink-soft">
                  <th className="p-3">Código</th>
                  <th className="p-3">Marca</th>
                  <th className="p-3">Período</th>
                  <th className="p-3 text-right">Pedidos</th>
                  <th className="p-3 text-right">Comisión</th>
                  <th className="p-3 text-right">Retenido</th>
                  <th className="p-3 text-right">A cobrar</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.settlements.map((s) => (
                  <tr key={s.id} className="border-b border-ink/6 last:border-0">
                    <td className="p-3 font-display text-xs font-bold">{s.code}</td>
                    <td className="p-3 font-semibold">{s.brandName}</td>
                    <td className="p-3 text-xs text-ink-soft">
                      {dateShort(s.periodStart)} – {dateShort(s.periodEnd)}
                    </td>
                    <td className="p-3 text-right tabular-nums">{s.ordersCount}</td>
                    <td className="p-3 text-right tabular-nums font-semibold">
                      {formatGs(s.commissionTotal + s.serviceFeeTotal + s.monthlyFee)}
                    </td>
                    <td className="p-3 text-right tabular-nums text-ok">{formatGs(s.retainedAmount)}</td>
                    <td className="p-3 text-right font-display font-bold tabular-nums text-water-700">
                      {formatGs(s.amountDue)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          STATUS_STYLE[s.status] ?? "bg-paper text-ink-soft"
                        }`}
                      >
                        {s.status}
                      </span>
                      {s.status !== "pagada" && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-ink-soft">
                          <IconClock className="h-3 w-3" />
                          vence {dateShort(s.dueDate)}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {s.status !== "pagada" ? (
                        <button
                          onClick={() => pay(s.id)}
                          disabled={busy}
                          className="rounded-lg bg-ok px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                        >
                          Registrar pago
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-ok">
                          <IconCheck className="h-3.5 w-3.5" /> cobrada
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="rounded-xl bg-water-50 p-4 text-xs leading-relaxed text-ink-soft">
        <strong className="text-ink">Automatización:</strong> «Correr liquidación» cierra el período y
        emite el resumen. Cada vez que abrís esta pantalla, la app además revisa los vencimientos:
        pasada la fecha marca la liquidación como vencida, y a los 5 días de mora{" "}
        <strong className="text-ink">suspende la marca sola</strong> —deja de recibir pedidos— hasta que
        se registre el pago. En producción todo esto lo dispara un cron diario que además avisa a la marca.
      </p>
    </section>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function Cell({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "ok" | "warn";
}) {
  const color = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <div className="rounded-xl bg-paper p-3">
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
        {icon}
        {label}
      </p>
      <p className={`mt-0.5 font-display text-base font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
