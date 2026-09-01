"use client";

import { useEffect, useState } from "react";

interface TransferSettings {
  bank: string;
  account: string;
  holder: string;
  alias: string;
  note: string;
}

/**
 * Datos de transferencia que configura el admin de plataforma
 * (Panel → Ajustes). Mientras no haya nada cargado, muestra un aviso
 * genérico en lugar de datos inventados.
 */
export default function TransferInfo() {
  const [data, setData] = useState<TransferSettings | null>(null);

  useEffect(() => {
    fetch("/api/settings/transfer", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d?.settings ?? {}))
      .catch(() => setData({ bank: "", account: "", holder: "", alias: "", note: "" }));
  }, []);

  const empty = !data || (!data.bank && !data.alias && !data.account);

  if (empty) {
    return (
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-ink-soft ring-1 ring-ink/10">
          Los datos de la cuenta para transferir se confirman por WhatsApp al confirmar el pedido.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="grid gap-2 sm:grid-cols-3">
        {data!.alias && (
          <div>
            <p className="text-xs font-bold text-ink-soft">Alias</p>
            <p className="font-bold">{data!.alias}</p>
          </div>
        )}
        {data!.bank && (
          <div>
            <p className="text-xs font-bold text-ink-soft">Banco</p>
            <p className="font-bold">{data!.bank}</p>
          </div>
        )}
        {data!.account && (
          <div>
            <p className="text-xs font-bold text-ink-soft">Cuenta</p>
            <p className="font-bold tabular-nums">{data!.account}</p>
          </div>
        )}
        {data!.holder && (
          <div className="sm:col-span-3">
            <p className="text-xs font-bold text-ink-soft">Titular</p>
            <p className="font-bold">{data!.holder}</p>
          </div>
        )}
      </div>
      {data!.note && (
        <p className="rounded-lg bg-white px-3 py-2 text-xs text-ink-soft ring-1 ring-ink/10">{data!.note}</p>
      )}
    </div>
  );
}
