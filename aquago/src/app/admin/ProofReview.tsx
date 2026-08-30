"use client";

import { useEffect, useState } from "react";
import { formatGs, timeAgo } from "@/lib/format";
import { IconCheck, IconClock } from "@/components/icons";

interface Proof {
  id: number;
  dataUrl: string;
  mimeType: string;
  fileName: string;
  amountDeclared: number;
  reference: string;
  status: string;
  reviewNote: string;
  createdAt: string;
}

/**
 * Revisión del comprobante desde el panel: se abre dentro de la tarjeta del
 * pedido, muestra la imagen y deja verificar o rechazar en un clic.
 */
export default function ProofReview({
  orderId,
  orderTotal,
  proofStatus,
  onReviewed,
}: {
  orderId: number;
  orderTotal: number;
  proofStatus: string;
  onReviewed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [proofs, setProofs] = useState<Proof[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!open || proofs) return;
    fetch(`/api/orders/${orderId}/proof`)
      .then((r) => r.json())
      .then((d) => setProofs(d.proofs ?? []))
      .catch(() => setProofs([]));
  }, [open, orderId, proofs]);

  async function review(status: "verificado" | "rechazado") {
    setBusy(true);
    try {
      await fetch(`/api/orders/${orderId}/proof`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          note: status === "rechazado" ? "El monto o el comprobante no coincide." : "",
        }),
      });
      setProofs(null);
      setOpen(false);
      onReviewed();
    } finally {
      setBusy(false);
    }
  }

  if (proofStatus === "sin_comprobante") {
    return (
      <span className="text-[11px] font-semibold text-ink-soft">· sin comprobante aún</span>
    );
  }

  const badge =
    proofStatus === "pendiente"
      ? { label: "comprobante por revisar", cls: "bg-warn-soft text-warn" }
      : proofStatus === "verificado"
        ? { label: "comprobante verificado", cls: "bg-ok-soft text-ok" }
        : { label: "comprobante rechazado", cls: "bg-danger-soft text-danger" };

  const latest = proofs?.[0];

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`ml-1 rounded-md px-2 py-0.5 text-[11px] font-bold transition hover:brightness-95 ${badge.cls}`}
      >
        {badge.label} {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-2 w-full rounded-xl border border-ink/10 bg-white p-3">
          {proofs === null ? (
            <div className="h-24 animate-pulse rounded-lg bg-water-50" />
          ) : proofs.length === 0 ? (
            <p className="text-xs text-ink-soft">No hay comprobantes cargados.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {latest!.mimeType === "application/pdf" ? (
                <a
                  href={latest!.dataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-28 w-24 place-items-center rounded-lg border border-ink/15 bg-paper text-xs font-bold text-water-700"
                >
                  Ver PDF
                </a>
              ) : (
                <button onClick={() => setZoom(true)} className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={latest!.dataUrl}
                    alt="Comprobante"
                    className="h-28 w-24 rounded-lg border border-ink/15 object-cover transition hover:brightness-95"
                  />
                </button>
              )}

              <div className="min-w-0 flex-1 text-xs">
                <p className="flex items-center gap-1.5 font-semibold text-ink-soft">
                  <IconClock className="h-3.5 w-3.5" />
                  Subido {timeAgo(latest!.createdAt)}
                </p>
                <p className="mt-1">
                  Declara:{" "}
                  <strong
                    className={
                      latest!.amountDeclared === orderTotal ? "text-ok" : "text-danger"
                    }
                  >
                    {formatGs(latest!.amountDeclared)}
                  </strong>{" "}
                  <span className="text-ink-soft">· pedido {formatGs(orderTotal)}</span>
                </p>
                {latest!.amountDeclared !== orderTotal && (
                  <p className="mt-0.5 font-bold text-danger">
                    ⚠ El monto no coincide con el total
                  </p>
                )}
                {latest!.reference && (
                  <p className="mt-0.5 text-ink-soft">Operación: {latest!.reference}</p>
                )}

                {proofStatus === "pendiente" ? (
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={() => review("verificado")}
                      disabled={busy}
                      className="flex items-center gap-1 rounded-lg bg-ok px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                    >
                      <IconCheck className="h-3.5 w-3.5" /> Verificar pago
                    </button>
                    <button
                      onClick={() => review("rechazado")}
                      disabled={busy}
                      className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-1.5 text-xs font-bold text-danger transition hover:bg-danger/20 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-bold text-ink-soft">
                    Revisado: {proofStatus}
                    {latest!.reviewNote && ` · ${latest!.reviewNote}`}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {zoom && latest && (
        <div
          onClick={() => setZoom(false)}
          className="fixed inset-0 z-[1000] grid place-items-center bg-ink/80 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={latest.dataUrl}
            alt="Comprobante"
            className="max-h-[85vh] max-w-full rounded-xl shadow-pop"
          />
        </div>
      )}
    </>
  );
}
