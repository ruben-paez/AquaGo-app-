"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { dateShort, formatGs, timeAgo } from "@/lib/format";
import { sessionHeaders } from "@/lib/session-client";

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  addressLabel: string;
  registeredAt: string;
  orderCount: number;
  spent: number;
  lastOrderAt: string | null;
}

const DAY = 864e5;

/**
 * Base de clientes con métricas: totales, nuevos de la semana/mes, activos
 * de los últimos 30 días y buscador. La marca ve solo a sus compradores
 * (lo decide el servidor).
 */
export default function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/customers", { headers: sessionHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((d) => setCustomers(d.customers ?? []))
      .catch(() => setCustomers([]));
  }, []);

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [customers, query]);

  const kpis = useMemo(() => {
    if (!customers) return { total: 0, week: 0, month: 0, active: 0 };
    const now = Date.now();
    return {
      total: customers.length,
      week: customers.filter((c) => now - new Date(c.registeredAt).getTime() < 7 * DAY).length,
      month: customers.filter((c) => now - new Date(c.registeredAt).getTime() < 30 * DAY).length,
      active: customers.filter(
        (c) => c.lastOrderAt && now - new Date(c.lastOrderAt).getTime() < 30 * DAY
      ).length,
    };
  }, [customers]);

  if (!customers) return <div className="mt-4 h-64 animate-pulse rounded-2xl bg-water-50" />;

  return (
    <div className="mt-4 space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold">Clientes</h2>
        <p className="text-xs text-ink-soft">
          Tu base de clientes registrados, con su actividad de compra.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Registrados", value: kpis.total, cls: "text-water-700" },
          { label: "Nuevos (7 días) ⭐", value: kpis.week, cls: "text-teal-700" },
          { label: "Nuevos (30 días)", value: kpis.month, cls: "text-water-600" },
          { label: "Activos (últ. 30 días)", value: kpis.active, cls: "text-ok" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-ink/10 bg-white p-4 shadow-card">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{k.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold ${k.cls}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre, teléfono o email…"
        className="w-full max-w-md rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-water-500"
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center">
          <h3 className="font-display font-bold">
            {customers.length === 0 ? "Todavía no hay clientes registrados" : "Sin resultados para esa búsqueda"}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            Cuando la gente cree su cuenta, aparece acá automáticamente.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-card">
          {/* Encabezado solo en pantallas grandes */}
          <div className="hidden grid-cols-[2fr_1.2fr_1fr_1fr_1fr] gap-2 border-b border-ink/10 bg-paper px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft lg:grid">
            <span>Cliente</span>
            <span>Contacto</span>
            <span className="text-right">Pedidos</span>
            <span className="text-right">Total gastado</span>
            <span className="text-right">Último pedido</span>
          </div>
          <div className="divide-y divide-ink/5">
            {filtered.map((c) => {
              const isNew = Date.now() - new Date(c.registeredAt).getTime() < 7 * DAY;
              const inactive = !c.lastOrderAt || Date.now() - new Date(c.lastOrderAt).getTime() >= 30 * DAY;
              return (
                <div
                  key={c.id}
                  className="grid gap-1 px-4 py-3 text-sm lg:grid-cols-[2fr_1.2fr_1fr_1fr_1fr] lg:items-center lg:gap-2"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-bold">
                      <span className="truncate">{c.name}</span>
                      {isNew && (
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 ring-1 ring-teal-200">
                          ⭐ nuevo
                        </span>
                      )}
                      {inactive && c.orderCount > 0 && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                          inactivo
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[11px] text-ink-soft">
                      desde {dateShort(c.registeredAt)} · {c.addressLabel || "sin dirección"}
                    </p>
                    {/* en móvil se ven los datos aquí */}
                    <p className="text-[11px] text-ink-soft lg:hidden">
                      {c.phone} · {c.orderCount} pedidos · {formatGs(c.spent)}
                      {c.lastOrderAt ? ` · último ${timeAgo(c.lastOrderAt)}` : " · sin pedidos"}
                    </p>
                  </div>
                  <div className="hidden text-xs lg:block">
                    <p>{c.phone}</p>
                    <p className="truncate text-ink-soft">{c.email}</p>
                  </div>
                  <div className="hidden text-right font-semibold tabular-nums lg:block">{c.orderCount}</div>
                  <div className="hidden text-right font-semibold tabular-nums text-water-700 lg:block">
                    {formatGs(c.spent)}
                  </div>
                  <div className="hidden text-right text-xs lg:block">
                    {c.lastOrderAt ? timeAgo(c.lastOrderAt) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
