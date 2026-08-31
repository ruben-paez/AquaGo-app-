"use client";

import { useEffect, useState } from "react";
import { dateShort, formatGs, timeShort } from "@/lib/format";
import { sessionHeaders } from "@/lib/session-client";

interface Delivery {
  code: string;
  time: string;
  addressLabel: string;
  total: number;
  paymentMethod: string;
  changeFrom: number | null;
  items: { name: string; quantity: number }[];
}

interface CloseData {
  driver: { name: string; vehicle: string; plate: string };
  date: string;
  deliveries: Delivery[];
  summary: {
    count: number;
    cashTotal: number;
    transferTotal: number;
    grandTotal: number;
    cashLabel: string;
    transferLabel: string;
    grandLabel: string;
  };
}

/**
 * Resumen de la venta del día, listo para imprimir / guardar como PDF.
 * La vista está pensada para el papel: fondo blanco, sin navegación.
 */
export default function DailyCloseView() {
  const [data, setData] = useState<CloseData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/driver/close", { headers: sessionHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("error"))))
      .then(setData)
      .catch(() => setError("No pudimos cargar tu cierre del día."));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="rounded-xl border border-danger/20 bg-danger-soft p-4 text-sm font-semibold text-danger">{error}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="mx-auto mt-10 h-64 max-w-2xl animate-pulse rounded-2xl bg-water-50" />;
  }

  const { driver, deliveries, summary } = data;

  return (
    <div className="mx-auto max-w-2xl p-4 print:max-w-none print:p-0">
      {/* Barra de acciones (no sale en el PDF) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <a
          href="/repartidor"
          className="rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm font-bold text-ink-soft transition hover:border-water-400"
        >
          ← Volver a mis entregas
        </a>
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-water-700 px-5 py-2.5 font-display text-sm font-bold text-white transition hover:bg-water-800"
        >
          📄 Descargar PDF / Imprimir
        </button>
      </div>

      {/* Hoja del cierre */}
      <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-card print:border-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b-2 border-water-700 pb-4">
          <div>
            <p className="font-display text-2xl font-bold text-water-800">AquaGo · Cierre del día</p>
            <p className="mt-0.5 text-sm text-ink-soft">
              {dateShort(data.date)} · generado {timeShort(data.date)}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-display font-bold">{driver.name}</p>
            <p className="text-xs text-ink-soft">
              {driver.vehicle} {driver.plate && `· ${driver.plate}`}
            </p>
          </div>
        </header>

        {deliveries.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-soft">
            No registrás entregas hoy todavía. Cuando entregues pedidos, el resumen se arma solo.
          </p>
        ) : (
          <>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-ink/20 text-left text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                  <th className="py-2">#</th>
                  <th className="py-2">Pedido</th>
                  <th className="py-2">Entrega</th>
                  <th className="py-2">Cobro</th>
                  <th className="py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d, i) => (
                  <tr key={d.code} className="border-b border-ink/10 align-top">
                    <td className="py-2 font-bold text-ink-soft">{i + 1}</td>
                    <td className="py-2">
                      <p className="font-display font-bold">{d.code}</p>
                      <p className="text-xs text-ink-soft">
                        {d.items.map((it) => `${it.quantity}× ${it.name}`).join(", ")}
                      </p>
                    </td>
                    <td className="py-2 text-xs">
                      {d.addressLabel}
                      <p className="text-ink-soft">{timeShort(d.time)} hs</p>
                    </td>
                    <td className="py-2 text-xs">
                      {d.paymentMethod === "efectivo" ? (
                        <>
                          Efectivo
                          {d.changeFrom ? <p className="text-ink-soft">vuelto de {formatGs(d.changeFrom)}</p> : null}
                        </>
                      ) : (
                        "Transferencia"
                      )}
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums">{formatGs(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 rounded-xl bg-paper p-4 text-sm">
              <div className="flex justify-between py-0.5">
                <span className="text-ink-soft">Entregas del día</span>
                <b>{summary.count}</b>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-ink-soft">Cobrado en efectivo (a rendir)</span>
                <b className="tabular-nums">{summary.cashLabel}</b>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-ink-soft">Transferencias (ya cobradas)</span>
                <b className="tabular-nums">{summary.transferLabel}</b>
              </div>
              <div className="mt-1 flex justify-between border-t border-ink/15 pt-1.5 font-display text-base font-bold">
                <span>Total facturado</span>
                <span className="text-water-700 tabular-nums">{summary.grandLabel}</span>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs text-ink-soft print:mt-16">
              <div className="border-t border-ink/30 pt-1">Firma del vendedor</div>
              <div className="border-t border-ink/30 pt-1">Conforme de la marca</div>
            </div>
          </>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-ink-soft print:hidden">
        En el diálogo de impresión elegí <b>“Guardar como PDF”</b> para descargarlo.
      </p>
    </div>
  );
}
