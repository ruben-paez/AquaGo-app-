"use client";

import { useRef, useState } from "react";
import { formatGs } from "@/lib/format";
import { IconBank, IconCheck, IconClock } from "./icons";
import { getStoredToken } from "@/lib/session-client";

interface ProofUploaderProps {
  orderId: number;
  orderTotal: number;
  proofStatus: string;
  /** token que viene del servidor: no depende de cookies ni del DOM */
  sessionToken?: string | null;
  onDone?: () => void;
}

const STATUS_UI: Record<string, { label: string; cls: string; icon: "clock" | "check" | "x" }> = {
  pendiente: {
    label: "Comprobante enviado · esperando verificación",
    cls: "border-warn/30 bg-warn-soft text-warn",
    icon: "clock",
  },
  verificado: {
    label: "Pago verificado por el local",
    cls: "border-ok/30 bg-ok-soft text-ok",
    icon: "check",
  },
  rechazado: {
    label: "El comprobante fue rechazado. Subí otro.",
    cls: "border-danger/30 bg-danger-soft text-danger",
    icon: "x",
  },
};

export default function ProofUploader({
  orderId,
  orderTotal,
  proofStatus,
  sessionToken,
  onDone,
}: ProofUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(proofStatus);

  function pickFile(file: File) {
    setError("");
    if (file.size > 2_500_000) {
      setError("La foto pesa más de 2,5 MB. Sacala con menos calidad.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(String(reader.result));
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function send() {
    if (!preview) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/proof`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken || getStoredToken()
            ? { "x-aquago-session": (sessionToken || getStoredToken()) as string }
            : {}),
        },
        body: JSON.stringify({
          dataUrl: preview,
          fileName,
          reference,
          amountDeclared: orderTotal,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No pudimos subir el comprobante.");
        return;
      }
      setStatus("pendiente");
      setPreview(null);
      setReference("");
      onDone?.();
    } catch {
      setError("No pudimos conectar. Probá de nuevo.");
    } finally {
      setSending(false);
    }
  }

  const ui = STATUS_UI[status];
  const canUpload = status === "sin_comprobante" || status === "rechazado";

  return (
    <div className="mt-3 rounded-xl border border-ink/10 bg-paper p-3.5">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft">
        <IconBank className="h-3.5 w-3.5" />
        Comprobante de transferencia
      </p>

      {ui && (
        <p className={`mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${ui.cls}`}>
          {ui.icon === "check" ? (
            <IconCheck className="h-4 w-4 shrink-0" />
          ) : ui.icon === "clock" ? (
            <IconClock className="h-4 w-4 shrink-0" />
          ) : (
            <span className="font-bold">✕</span>
          )}
          {ui.label}
        </p>
      )}

      {canUpload && (
        <div className="mt-2.5">
          <p className="text-xs text-ink-soft">
            Subí la captura de la transferencia por{" "}
            <strong className="text-ink">{formatGs(orderTotal)}</strong> y el local la verifica.
          </p>

          {preview ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              {preview.startsWith("data:application/pdf") ? (
                <div className="grid h-20 w-20 place-items-center rounded-lg border border-ink/15 bg-white text-xs font-bold text-ink-soft">
                  PDF
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Comprobante"
                  className="h-20 w-20 rounded-lg border border-ink/15 object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{fileName}</p>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="N° de operación (opcional)"
                  className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-water-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={send}
                  disabled={sending}
                  className="rounded-lg bg-ok px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {sending ? "Enviando…" : "Enviar"}
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-bold text-ink-soft"
                >
                  Cambiar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-2 w-full rounded-lg border-2 border-dashed border-water-300 bg-white px-3 py-4 text-sm font-bold text-water-700 transition hover:border-water-500 hover:bg-water-50"
            >
              📎 Elegir foto del comprobante
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
