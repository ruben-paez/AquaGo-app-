"use client";

import { useCallback, useEffect, useState } from "react";
import MapPicker from "@/components/MapPicker";
import { formatGs, timeAgo } from "@/lib/format";
import { DISPATCH_MODE_LABELS } from "@/lib/dispatch-shared";
import type { DriverLoad } from "@/lib/dispatch-shared";
import { IconCheck, IconClock, IconMapPin, IconPhone, IconTruck } from "@/components/icons";

interface Candidate {
  driverId: number;
  name: string;
  vehicle: string;
  distanceKm: number;
  etaMin: number;
  activeOrders: number;
  capacity: number;
  deliveredToday: number;
  score: number;
  breakdown: { distance: number; load: number; fairness: number };
  eligible: boolean;
  reason?: string;
}

interface QueueItem {
  id: number;
  code: string;
  addressLabel: string;
  zone: string;
  total: number;
  status: string;
  createdAt: string;
  candidates: Candidate[];
}

interface DispatchData {
  brand: { id: number; name: string; dispatchMode: string; autoAssign: boolean };
  brands: { id: number; name: string }[];
  drivers: DriverLoad[];
  queue: QueueItem[];
  fairness: number;
}

const VEHICLE_ICON: Record<string, string> = {
  moto: "🛵",
  camioneta: "🛻",
  camion: "🚚",
};

const DRIVER_STATUS: Record<string, { label: string; cls: string }> = {
  disponible: { label: "Disponible", cls: "bg-ok-soft text-ok" },
  ocupado: { label: "Ocupado", cls: "bg-warn-soft text-warn" },
  fuera_turno: { label: "Fuera de turno", cls: "bg-ink/10 text-ink-soft" },
};

export default function DispatchTab() {
  const [data, setData] = useState<DispatchData | null>(null);
  const [brandId, setBrandId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [openOrder, setOpenOrder] = useState<number | null>(null);

  const load = useCallback(async (bid?: string) => {
    try {
      const q = bid ? `?brandId=${bid}` : "";
      const res = await fetch(`/api/admin/dispatch${q}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setBrandId(String(d.brand.id));
      }
    } catch {
      // sin conexión
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      await load(brandId);
      return d;
    } finally {
      setBusy(false);
    }
  }

  async function assignAll() {
    const d = await post({ action: "assign_all", brandId: Number(brandId) });
    const ok = (d.results ?? []).filter((r: { ok: boolean }) => r.ok);
    setFlash(
      ok.length === 0
        ? "No había pedidos sin asignar."
        : `Se asignaron ${ok.length} pedidos: ${ok
            .slice(0, 3)
            .map((r: { orderCode: string; driverName: string }) => `${r.orderCode}→${r.driverName}`)
            .join(", ")}${ok.length > 3 ? "…" : ""}`
    );
  }

  async function assignOne(orderId: number, driverId?: number) {
    const d = await post({ action: "assign", orderId, driverId });
    const r = d.result;
    setFlash(
      r?.ok
        ? `${r.orderCode} → ${r.driverName} · ${r.distanceKm?.toFixed(1)} km · ~${r.etaMin} min`
        : r?.message ?? "No se pudo asignar."
    );
    setOpenOrder(null);
  }

  async function patchDriver(id: number, patch: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/admin/drivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await load(brandId);
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

  const maxDelivered = Math.max(1, ...data.drivers.map((d) => d.deliveredTotal));
  const totalActive = data.drivers.reduce((s, d) => s + d.activeOrders, 0);
  const available = data.drivers.filter(
    (d) => d.active && d.status !== "fuera_turno" && d.activeOrders < d.capacity
  ).length;

  return (
    <section className="mt-4 space-y-5">
      {/* Configuración */}
      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold">Motor de reparto</h3>
            <p className="mt-0.5 text-xs text-ink-soft">
              Cómo decide la app a quién le toca cada pedido.
            </p>
          </div>
          <select
            className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm font-bold outline-none focus:border-water-500"
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              load(e.target.value);
            }}
          >
            {data.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(Object.keys(DISPATCH_MODE_LABELS) as (keyof typeof DISPATCH_MODE_LABELS)[]).map((m) => {
            const active = data.brand.dispatchMode === m;
            const desc =
              m === "cercania"
                ? "Siempre el más cercano. Menos km, pero el reparto se concentra."
                : m === "equilibrado"
                  ? "Cercanía primero, corrigiendo por carga. El punto justo."
                  : "Todos facturan parecido, aunque a veces se viaje un poco más.";
            return (
              <button
                key={m}
                onClick={() => post({ action: "config", brandId: Number(brandId), dispatchMode: m })}
                disabled={busy}
                className={`rounded-xl border-2 p-3.5 text-left transition ${
                  active
                    ? "border-water-600 bg-water-50"
                    : "border-ink/10 bg-white hover:border-water-300"
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  {active && <IconCheck className="h-4 w-4 text-water-700" />}
                  {DISPATCH_MODE_LABELS[m]}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-soft">{desc}</span>
              </button>
            );
          })}
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2.5 border-t border-dashed border-ink/15 pt-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={data.brand.autoAssign}
            onChange={(e) =>
              post({ action: "config", brandId: Number(brandId), autoAssign: e.target.checked })
            }
            className="h-4 w-4 accent-water-700"
          />
          Asignar automáticamente apenas entra el pedido
          <span className="text-xs font-normal text-ink-soft">
            (si lo apagás, los pedidos esperan acá a que los despaches)
          </span>
        </label>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Repartidores" value={String(data.drivers.length)} />
        <Kpi label="Disponibles ahora" value={String(available)} accent="text-ok" />
        <Kpi label="Pedidos en curso" value={String(totalActive)} accent="text-warn" />
        <Kpi
          label="Índice de equidad"
          value={`${data.fairness} %`}
          accent={data.fairness >= 80 ? "text-ok" : data.fairness >= 60 ? "text-warn" : "text-danger"}
        />
      </div>

      {flash && (
        <p className="rounded-lg border border-water-200 bg-water-50 px-3 py-2.5 text-sm font-semibold text-water-800">
          {flash}
        </p>
      )}

      {/* Cola de despacho */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Pedidos sin repartidor ({data.queue.length})
          </h3>
          {data.queue.length > 0 && (
            <button
              onClick={assignAll}
              disabled={busy}
              className="rounded-lg bg-water-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-water-800 disabled:opacity-50"
            >
              {busy ? "Asignando…" : `Despachar los ${data.queue.length}`}
            </button>
          )}
        </div>

        {data.queue.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-center text-sm text-ink-soft">
            Todos los pedidos tienen repartidor asignado. 👌
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {data.queue.map((q) => {
              const best = q.candidates.find((c) => c.eligible);
              const open = openOrder === q.id;
              return (
                <div key={q.id} className="rounded-2xl border border-warn/30 bg-white p-4 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-base font-bold">{q.code}</p>
                        <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-bold text-ink-soft">
                          {q.zone}
                        </span>
                        <span className="text-xs font-semibold text-ink-soft">
                          {timeAgo(q.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {q.addressLabel} · {formatGs(q.total)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {best && (
                        <span className="rounded-lg bg-water-50 px-3 py-1.5 text-xs font-bold text-water-800">
                          Sugerido: {best.name} · {best.distanceKm} km · ~{best.etaMin} min
                        </span>
                      )}
                      <button
                        onClick={() => assignOne(q.id)}
                        disabled={busy || !best}
                        className="rounded-lg bg-ok px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-40"
                      >
                        Asignar
                      </button>
                      <button
                        onClick={() => setOpenOrder(open ? null : q.id)}
                        className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-ink-soft transition hover:border-water-400"
                      >
                        {open ? "Ocultar" : "Ver cálculo"}
                      </button>
                    </div>
                  </div>

                  {/* Por qué gana ese repartidor */}
                  {open && (
                    <div className="mt-3 overflow-x-auto rounded-xl border border-ink/10">
                      <table className="w-full min-w-[620px] text-xs">
                        <thead className="bg-paper text-left text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                          <tr>
                            <th className="p-2.5">Repartidor</th>
                            <th className="p-2.5 text-right">Distancia</th>
                            <th className="p-2.5 text-right">Carga</th>
                            <th className="p-2.5 text-right">Hoy</th>
                            <th className="p-2.5 text-right">Puntaje</th>
                            <th className="p-2.5"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {q.candidates.map((c, i) => (
                            <tr
                              key={c.driverId}
                              className={`border-t border-ink/6 ${
                                i === 0 && c.eligible ? "bg-ok-soft/40" : ""
                              } ${!c.eligible ? "opacity-50" : ""}`}
                            >
                              <td className="p-2.5 font-semibold">
                                {VEHICLE_ICON[c.vehicle]} {c.name}
                                {i === 0 && c.eligible && (
                                  <span className="ml-1.5 rounded-full bg-ok px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    gana
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-right tabular-nums">
                                {c.distanceKm} km
                                <span className="block text-[10px] text-ink-soft">
                                  +{c.breakdown.distance}
                                </span>
                              </td>
                              <td className="p-2.5 text-right tabular-nums">
                                {c.activeOrders}/{c.capacity}
                                <span className="block text-[10px] text-ink-soft">
                                  +{c.breakdown.load}
                                </span>
                              </td>
                              <td className="p-2.5 text-right tabular-nums">
                                {c.deliveredToday}
                                <span className="block text-[10px] text-ink-soft">
                                  +{c.breakdown.fairness}
                                </span>
                              </td>
                              <td className="p-2.5 text-right font-display font-bold tabular-nums">
                                {c.score}
                              </td>
                              <td className="p-2.5 text-right">
                                {c.eligible ? (
                                  <button
                                    onClick={() => assignOne(q.id, c.driverId)}
                                    disabled={busy}
                                    className="rounded-md border border-water-600/30 bg-water-50 px-2 py-1 text-[11px] font-bold text-water-700 hover:bg-water-100"
                                  >
                                    Elegir
                                  </button>
                                ) : (
                                  <span className="text-[11px] font-semibold text-danger">
                                    {c.reason}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="bg-paper p-2.5 text-[11px] text-ink-soft">
                        Menor puntaje gana. Puntaje = distancia + carga actual + entregas de hoy,
                        ponderado según el modo <strong>{data.brand.dispatchMode}</strong>.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Flota */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          Flota de {data.brand.name}
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {data.drivers.map((d) => {
            const st = DRIVER_STATUS[d.status] ?? DRIVER_STATUS.disponible;
            const loadPct = Math.min(100, (d.activeOrders / d.capacity) * 100);
            return (
              <div key={d.id} className="rounded-2xl border border-ink/10 bg-white p-4 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{VEHICLE_ICON[d.vehicle]}</span>
                    <div>
                      <p className="font-display text-sm font-bold">{d.name}</p>
                      <p className="text-[11px] text-ink-soft">
                        {d.plate} · {d.preferredZone}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-semibold text-ink-soft">
                    <span>Carga actual</span>
                    <span>
                      {d.activeOrders} / {d.capacity}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-water-50">
                    <div
                      className={`h-full rounded-full ${
                        loadPct >= 100 ? "bg-danger" : loadPct > 60 ? "bg-warn" : "bg-ok"
                      }`}
                      style={{ width: `${loadPct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between text-[11px] font-semibold text-ink-soft">
                    <span>Entregas totales</span>
                    <span>
                      {d.deliveredTotal} · hoy {d.deliveredToday}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-water-50">
                    <div
                      className="h-full rounded-full bg-water-500"
                      style={{ width: `${(d.deliveredTotal / maxDelivered) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-ink/15 pt-2.5">
                  <select
                    className="rounded-lg border border-ink/15 bg-white px-2 py-1 text-[11px] font-bold outline-none focus:border-water-500"
                    value={d.status}
                    onChange={(e) => patchDriver(d.id, { status: e.target.value })}
                  >
                    <option value="disponible">Disponible</option>
                    <option value="ocupado">Ocupado</option>
                    <option value="fuera_turno">Fuera de turno</option>
                  </select>
                  {d.phone && (
                    <a
                      href={`tel:${d.phone.replace(/\s/g, "")}`}
                      className="flex items-center gap-1 rounded-lg bg-water-50 px-2 py-1 text-[11px] font-bold text-water-700 hover:bg-water-100"
                    >
                      <IconPhone className="h-3 w-3" /> {d.phone}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mapa de la flota */}
      {data.drivers.some((d) => d.lat != null) && (
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-display text-base font-bold">
            <IconMapPin className="h-4 w-4 text-water-600" />
            Dónde está cada uno
          </h3>
          <div className="mt-3">
            <MapPicker
              center={[
                data.drivers.find((d) => d.lat != null)!.lat as number,
                data.drivers.find((d) => d.lng != null)!.lng as number,
              ]}
              heightClass="h-64"
              zoom={12}
            />
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            En producción, la app del repartidor manda su GPS cada pocos minutos y el motor usa esa
            posición real. Acá cada uno arranca en su zona habitual.
          </p>
        </div>
      )}

      <p className="rounded-xl bg-water-50 p-4 text-xs leading-relaxed text-ink-soft">
        <strong className="text-ink">Cómo funciona:</strong> cuando entra un pedido, el motor calcula
        la distancia real de cada repartidor al domicilio (fórmula de Haversine), le suma una
        penalización por los pedidos que ya tiene encima y otra por lo que lleva entregado hoy. Gana
        el de menor puntaje. Así el pedido va al que está cerca, pero sin que el mismo se lleve todo
        el trabajo.
      </p>
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
