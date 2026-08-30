"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MapPicker from "@/components/MapPicker";
import StatusBadge from "@/components/StatusBadge";
import { dateShort, formatGs, timeShort } from "@/lib/format";
import type { OrderView } from "@/lib/queries";
import { IconBank, IconBottle, IconCash, IconTruck } from "@/components/icons";
import { AquaNatMark } from "@/components/Brand";
import ProofUploader from "@/components/ProofUploader";

const TIMELINE = ["Recibido", "Aceptada", "En camino", "Entregada"];
const STEP_INDEX: Record<string, number> = {
  pendiente: 0,
  aceptada: 1,
  en_camino: 2,
  entregada: 3,
};

export default function OrdersTracker({
  initial,
  sessionToken,
}: {
  initial: OrderView[];
  sessionToken?: string | null;
}) {
  const [orders, setOrders] = useState<OrderView[]>(initial);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const mounted = useRef(false);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/orders", {
          headers: sessionToken ? { "x-aquago-session": sessionToken } : undefined,
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders ?? []);
          setUpdatedAt(new Date().toISOString());
        }
      } catch {
        // sin conexión: se mantiene la última vista
      }
    }, 12000);
    return () => clearInterval(id);
  }, []);

  const active = orders.filter((o) => ["pendiente", "aceptada", "en_camino"].includes(o.status));
  const history = orders.filter((o) => !["pendiente", "aceptada", "en_camino"].includes(o.status));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Mis pedidos</h1>
          {active.length > 0 ? (
            <p className="mt-1 text-sm font-semibold text-water-700">
              {active.length} pedido{active.length > 1 ? "s" : ""} en curso
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">El estado se actualiza solo cada 12 segundos.</p>
          )}
        </div>
        {updatedAt && (
          <span className="text-xs font-semibold text-ink-soft">Actualizado {timeShort(updatedAt)}</span>
        )}
      </div>

      {orders.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-water-100 text-water-700">
            <IconBottle className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold">Aún no tienes pedidos</h2>
          <p className="mt-1 text-sm text-ink-soft">Tu primera recarga está a un minuto.</p>
          <Link href="/pedir" className="mt-5 inline-block rounded-xl bg-water-700 px-5 py-3 font-display text-sm font-bold text-white transition hover:bg-water-800">
            Pedir mi primera recarga
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <section className="mt-6 space-y-4">
          {active.map((o) => (
            <OrderCard key={o.id} order={o} live token={sessionToken} />
          ))}
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Historial</h2>
          <div className="mt-3 space-y-3">
            {history.map((o) => (
              <OrderCard key={o.id} order={o} token={sessionToken} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OrderCard({
  order,
  live = false,
  token,
}: {
  order: OrderView;
  live?: boolean;
  token?: string | null;
}) {
  const stepIdx = STEP_INDEX[order.status] ?? 0;
  const cancelled = order.status === "cancelada";
  const hasMap = order.lat != null && order.lng != null;

  return (
    <article className={`rounded-2xl border bg-white p-5 shadow-card ${live ? "border-water-300" : "border-ink/10"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <p className="font-display text-base font-bold">{order.code}</p>
          <p className="text-xs font-semibold text-ink-soft">
            {dateShort(order.createdAt)} · {timeShort(order.createdAt)}
          </p>
        </div>
        <StatusBadge status={order.status} size="md" />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <AquaNatMark className="h-6 w-6" />
        <span className="text-sm font-bold text-water-800">{order.brandName ?? "AQUAnat"}</span>
      </div>

      {cancelled && (
        <p className="mt-3 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
          Este pedido fue cancelado.
        </p>
      )}

      {/* Timeline */}
      {!cancelled && (
        <ol className="mt-4 flex items-center">
          {TIMELINE.map((label, i) => {
            const done = i < stepIdx;
            const current = i === stepIdx;
            return (
              <li key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full border-2 text-[10px] font-bold ${
                      done
                        ? "border-ok bg-ok text-white"
                        : current
                          ? "border-water-600 bg-water-600 text-white"
                          : "border-ink/20 bg-white text-ink-soft"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={`mt-1 hidden text-[11px] font-semibold sm:block ${current ? "text-ink" : "text-ink-soft"}`}>
                    {label}
                  </span>
                </div>
                {i < TIMELINE.length - 1 && (
                  <span className={`mx-1 h-0.5 flex-1 sm:-mt-4 ${i < stepIdx ? "bg-ok" : "bg-ink/15"}`} />
                )}
              </li>
            );
          })}
        </ol>
      )}

      {live && order.driverName && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-cyan-50 px-3 py-2 text-sm">
          <span className="flex items-center gap-2 font-semibold text-cyan-900">
            <IconTruck className="h-4 w-4" />
            {order.status === "en_camino"
              ? `${order.driverName} va en camino`
              : `${order.driverName} tiene tu pedido`}
            {order.driverVehicle && (
              <span className="font-normal text-cyan-800">· {order.driverVehicle}</span>
            )}
          </span>
          {order.assignDistanceKm != null && (
            <span className="text-xs font-semibold text-cyan-800">
              salió a {order.assignDistanceKm.toFixed(1)} km de tu casa
            </span>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-paper p-3.5 text-sm">
          <ul className="space-y-1">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="text-ink-soft">{i.quantity} × {i.name}</span>
                <span className="font-semibold tabular-nums">{formatGs(i.quantity * i.unitPrice)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-ink/10 pt-2 font-display font-bold">
            <span>Total</span>
            <span className="text-water-700">{formatGs(order.total)}</span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
            {order.paymentMethod === "efectivo" ? (
              <>
                <IconCash className="h-3.5 w-3.5" />
                Efectivo
                {order.changeFrom ? ` · con ${formatGs(order.changeFrom)}` : ""}
              </>
            ) : (
              <>
                <IconBank className="h-3.5 w-3.5" />
                Transferencia {order.transferPaid && "· verificada"}
              </>
            )}
          </p>

          {order.paymentMethod === "transferencia" && order.status !== "cancelada" && (
            <ProofUploader
              orderId={order.id}
              orderTotal={order.total}
              proofStatus={order.proofStatus}
              sessionToken={token}
            />
          )}
        </div>

        <div className="text-sm">
          <p className="font-bold">{order.addressLabel || "Sin dirección"}</p>
          {order.notes && <p className="mt-1 text-xs text-ink-soft">“{order.notes}”</p>}
          {hasMap && live && (
            <div className="mt-3">
              <MapPicker center={[order.lat as number, order.lng as number]} heightClass="h-36" zoom={15} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
