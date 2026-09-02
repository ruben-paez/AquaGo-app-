"use client";

import { useEffect, useMemo, useState } from "react";
import MapPicker from "@/components/MapPicker";
import StatusBadge from "@/components/StatusBadge";
import {
  formatGs,
  ORDER_STATUSES,
  OrderStatus,
  STATUS_LABELS,
  timeAgo,
} from "@/lib/format";
import type { BrandView, OrderView } from "@/lib/queries";
import { IconBank, IconCash, IconCheck, IconMapPin, IconTruck } from "@/components/icons";
import { AquaNatMark } from "@/components/Brand";
import BillingTab from "./BillingTab";
import AnalyticsTab from "./AnalyticsTab";
import DispatchTab from "./DispatchTab";
import LiveTab from "./LiveTab";
import SettingsTab from "./SettingsTab";
import BrandsTab from "./BrandsTab";
import CustomersTab from "./CustomersTab";
import ProofReview from "./ProofReview";

interface AdminProduct {
  id: number;
  brandId: number;
  name: string;
  description: string;
  category: string;
  volume: string;
  price: number;
  active: boolean;
}

export default function AdminPanel({ userRole = "plataforma" }: { userRole?: string }) {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [brands, setBrands] = useState<BrandView[]>([]);
  const [tab, setTab] = useState<"pedidos" | "reparto" | "envivo" | "clientes" | "marcas" | "ajustes" | "productos" | "comisiones" | "datos">("pedidos");
  const [filter, setFilter] = useState<string>("todos");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const [oRes, pRes, bRes] = await Promise.all([
          fetch("/api/admin/orders"),
          fetch("/api/admin/products"),
          fetch("/api/brands"),
        ]);
        if (stop) return;
        if (oRes.ok) setOrders((await oRes.json()).orders ?? []);
        if (pRes.ok) setProducts((await pRes.json()).products ?? []);
        if (bRes.ok) setBrands((await bRes.json()).brands ?? []);
        setUpdatedAt(new Date().toISOString());
      } catch {
        // sin conexión
      } finally {
        if (!stop) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 10000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  async function reloadOrders() {
    try {
      const oRes = await fetch("/api/admin/orders");
      if (oRes.ok) setOrders((await oRes.json()).orders ?? []);
    } catch {
      // ignore
    }
  }

  async function patchOrder(id: number, patch: Record<string, unknown>) {
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await reloadOrders();
    } catch {
      // ignore
    }
  }

  async function patchProduct(id: number, patch: Record<string, unknown>) {
    try {
      await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const pRes = await fetch("/api/admin/products");
      if (pRes.ok) setProducts((await pRes.json()).products ?? []);
    } catch {
      // ignore
    }
  }

  const today = new Date().toDateString();
  const kpis = useMemo(() => {
    const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
    return {
      pendientes: orders.filter((o) => o.status === "pendiente").length,
      enReparto: orders.filter((o) => ["aceptada", "en_camino"].includes(o.status)).length,
      entregadasHoy: todayOrders.filter((o) => o.status === "entregada").length,
      ventasHoy: todayOrders
        .filter((o) => o.status !== "cancelada")
        .reduce((s, o) => s + o.total, 0),
      comisionHoy: todayOrders
        .filter((o) => o.status !== "cancelada")
        .reduce((s, o) => s + o.commissionAmount + o.serviceFee, 0),
    };
  }, [orders, today]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: orders.length };
    for (const s of ORDER_STATUSES) c[s] = orders.filter((o) => o.status === s).length;
    return c;
  }, [orders]);

  const visibleOrders = filter === "todos" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Panel del local</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Pedidos en vivo y catálogo. Se actualiza cada 10 segundos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PasswordButton />
          {updatedAt && (
            <span className="text-xs font-semibold text-ink-soft">
              Actualizado {new Date(updatedAt).toLocaleTimeString("es-CL")}
            </span>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "Pendientes", value: String(kpis.pendientes), accent: "text-warn" },
          { label: "En reparto", value: String(kpis.enReparto), accent: "text-cyan-700" },
          { label: "Entregadas hoy", value: String(kpis.entregadasHoy), accent: "text-ok" },
          { label: "Ventas de hoy", value: formatGs(kpis.ventasHoy), accent: "text-water-700" },
          { label: "Servicio de hoy", value: formatGs(kpis.comisionHoy), accent: "text-water-600" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-ink/10 bg-white p-4 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{k.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold ${k.accent}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(
          [
            ["pedidos", "Pedidos"],
            ["reparto", "Reparto"],
            ["envivo", "En vivo"],
            ["clientes", "Clientes"],
            ...(userRole === "plataforma" ? ([["marcas", "Marcas"], ["ajustes", "Ajustes"]] as const) : []),
            ["productos", "Catálogo"],
            ["comisiones", "Comisiones"],
            ["datos", "Datos"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              tab === k ? "bg-water-700 text-white" : "border border-ink/15 bg-white text-ink-soft hover:border-water-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "reparto" && <DispatchTab />}
      {tab === "envivo" && <LiveTab />}
      {tab === "clientes" && <CustomersTab />}
      {tab === "marcas" && <BrandsTab />}
      {tab === "ajustes" && <SettingsTab />}
      {tab === "comisiones" && <BillingTab />}
      {tab === "datos" && <AnalyticsTab brands={brands} />}

      {tab === "pedidos" ? (
        <section className="mt-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <FilterChip label="Todos" count={counts.todos} active={filter === "todos"} onClick={() => setFilter("todos")} />
            {ORDER_STATUSES.map((s) => (
              <FilterChip key={s} label={STATUS_LABELS[s]} count={counts[s]} active={filter === s} onClick={() => setFilter(s)} />
            ))}
          </div>

          {loading ? (
            <div className="mt-4 space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-water-50" />
              ))}
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center text-sm text-ink-soft">
              No hay pedidos {filter !== "todos" ? `con estado «${STATUS_LABELS[filter as OrderStatus]}` : ""} por ahora.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {visibleOrders.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  onPatch={(patch) => patchOrder(o.id, patch)}
                  onRefresh={reloadOrders}
                />
              ))}
            </div>
          )}
        </section>
      ) : tab === "productos" ? (
        <ProductsTab products={products} brands={brands} onPatch={(id, patch) => patchProduct(id, patch)} onAdd={async (data) => {
          try {
            await fetch("/api/admin/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const pRes = await fetch("/api/admin/products");
            if (pRes.ok) setProducts((await pRes.json()).products ?? []);
          } catch {
            // ignore
          }
        }} />
      ) : null}
    </div>
  );
}

function FilterChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
        active ? "border-water-700 bg-water-700 text-white" : "border-ink/15 bg-white text-ink-soft hover:border-water-400"
      }`}
    >
      {label} <span className={active ? "text-water-200" : "text-ink-soft/60"}>{count}</span>
    </button>
  );
}

function OrderRow({
  order,
  onPatch,
  onRefresh,
}: {
  order: OrderView;
  onPatch: (patch: Record<string, unknown>) => void;
  onRefresh: () => void;
}) {
  const [driver, setDriver] = useState(order.driverName);
  const [showMap, setShowMap] = useState(false);
  const closed = order.status === "entregada" || order.status === "cancelada";

  function saveDriver() {
    if (driver.trim() !== order.driverName) onPatch({ driverName: driver });
  }

  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-card sm:p-5 ${order.status === "pendiente" ? "border-warn/40" : "border-ink/10"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="font-display text-base font-bold">{order.code}</p>
          <span className="text-xs font-semibold text-ink-soft">{timeAgo(order.createdAt)}</span>
          <span className="flex items-center gap-1 rounded-full bg-water-50 px-2 py-0.5 text-xs font-bold text-water-800">
            <AquaNatMark className="h-4 w-4" />
            {order.brandName ?? "AQUAnat"}
          </span>
          <span className="text-xs font-semibold text-ink-soft">
            {order.customerName ?? `Cliente #${order.userId}`} · {order.customerPhone}
          </span>
        </div>
        <StatusBadge status={order.status} size="md" />
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        {/* Dirección */}
        <div className="text-sm">
          <p className="flex items-center gap-1.5 font-bold">
            <IconMapPin className="h-4 w-4 text-water-600" />
            {order.addressLabel || "Sin dirección"}
          </p>
          {order.notes && <p className="mt-1 text-xs text-ink-soft">“{order.notes}”</p>}
          {order.lat != null && order.lng != null && (
            <button onClick={() => setShowMap((v) => !v)} className="mt-1.5 text-xs font-bold text-water-700 hover:underline">
              {showMap ? "Ocultar mapa" : "Ver mapa"}
            </button>
          )}
          {showMap && order.lat != null && order.lng != null && (
            <div className="mt-2">
              <MapPicker center={[order.lat, order.lng]} heightClass="h-40" zoom={15} />
            </div>
          )}
        </div>

        {/* Ítems */}
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
          <div className="mt-1 flex justify-between text-[11px] font-semibold text-ink-soft">
            <span>Servicio AquaGo (10 %)</span>
            <span className="tabular-nums">
              {formatGs(order.commissionAmount + order.serviceFee)} · marca recibe {formatGs(order.netToBrand)}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-ink-soft">
            {order.paymentMethod === "efectivo" ? (
              <>
                <IconCash className="h-3.5 w-3.5" /> Efectivo
                {order.changeFrom
                  ? ` · abona ${formatGs(order.changeFrom)} · vuelto ${formatGs(
                      Math.max(0, order.changeFrom - order.total)
                    )}`
                  : " · justo"}
              </>
            ) : (
              <>
                <IconBank className="h-3.5 w-3.5" /> Transferencia
                {order.transferPaid && (
                  <span className="flex items-center gap-1 text-ok">
                    <IconCheck className="h-3.5 w-3.5" /> cobrada
                  </span>
                )}
                <ProofReview
                  orderId={order.id}
                  orderTotal={order.total}
                  proofStatus={order.proofStatus}
                  onReviewed={onRefresh}
                />
              </>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="space-y-3 text-sm">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Estado</label>
            <select
              value={order.status}
              disabled={closed}
              onChange={(e) => onPatch({ status: e.target.value })}
              className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-water-500 disabled:bg-paper disabled:text-ink-soft"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-ink-soft">
              <IconTruck className="h-3.5 w-3.5" /> Repartidor
            </label>
            <input
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              onBlur={saveDriver}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              placeholder="Nombre del repartidor"
              className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-water-500"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function ProductsTab({
  products,
  brands,
  onPatch,
  onAdd,
}: {
  products: AdminProduct[];
  brands: BrandView[];
  onPatch: (id: number, patch: Record<string, unknown>) => void;
  onAdd: (data: {
    name: string;
    price: number;
    volume: string;
    category: string;
    description: string;
    brandId: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [volume, setVolume] = useState("");
  const [category, setCategory] = useState("agua");
  const [description, setDescription] = useState("");
  const [brandId, setBrandId] = useState<number>(0);
  const [adding, setAdding] = useState(false);
  const [priceDraft, setPriceDraft] = useState<Record<number, string>>({});

  const inputCls =
    "rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm outline-none transition focus:border-water-500 focus:ring-2 focus:ring-water-200";

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const p = Number(price);
    if (!name.trim() || !Number.isFinite(p) || p <= 0) return;
    setAdding(true);
    try {
      const targetBrand = brandId || brands.find((b) => !b.comingSoon)?.id || 1;
      await onAdd({ name, price: p, volume, category, description, brandId: targetBrand });
      setName(""); setPrice(""); setVolume(""); setDescription(""); setCategory("agua");
    } finally {
      setAdding(false);
    }
  }

  function savePrice(p: AdminProduct) {
    const draft = priceDraft[p.id];
    if (draft === undefined) return;
    const v = Number(draft);
    if (Number.isFinite(v) && v > 0 && Math.round(v) !== p.price) {
      onPatch(p.id, { price: Math.round(v) });
    }
  }

  return (
    <section className="mt-4 space-y-4">
      <form onSubmit={add} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
        <h2 className="font-display text-base font-bold">Agregar producto (nueva línea)</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-12">
          <select
            className={`${inputCls} md:col-span-3`}
            value={brandId || brands.find((b) => !b.comingSoon)?.id || 1}
            onChange={(e) => setBrandId(Number(e.target.value))}
          >
            {brands
              .filter((b) => !b.comingSoon)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
          <input className={`${inputCls} md:col-span-3`} placeholder="Nombre · ej. Bidón 10 L" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={`${inputCls} md:col-span-2`} placeholder="Precio en Gs" value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="1" required />
          <input className={`${inputCls} md:col-span-2`} placeholder="Volumen · 10 L" value={volume} onChange={(e) => setVolume(e.target.value)} />
          <select className={`${inputCls} md:col-span-2`} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="agua">Agua</option>
            <option value="accesorios">Accesorios</option>
            <option value="otros">Otros</option>
          </select>
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-water-700 px-4 py-2 font-display text-sm font-bold text-white transition hover:bg-water-800 disabled:opacity-50 md:col-span-12 lg:col-span-2"
          >
            {adding ? "Guardando…" : "Agregar"}
          </button>
          <input className={`${inputCls} md:col-span-12`} placeholder="Descripción corta (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-card">
        {products.map((p, i) => (
          <div key={p.id} className={`flex flex-wrap items-center gap-3 p-4 ${i > 0 ? "border-t border-ink/8" : ""} ${!p.active ? "opacity-55" : ""}`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-sm font-bold">{p.name}</p>
                {p.volume && <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-bold text-ink-soft">{p.volume}</span>}
                <span className="rounded-full bg-water-50 px-2 py-0.5 text-[11px] font-bold text-water-700">
                  {p.category === "agua" ? "Agua" : p.category === "accesorios" ? "Accesorios" : "Otros"}
                </span>
              </div>
              {p.description && <p className="mt-0.5 truncate text-xs text-ink-soft">{p.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink-soft">Gs</span>
              <input
                type="number"
                min="1"
                className="w-24 rounded-lg border border-ink/15 bg-paper px-2.5 py-1.5 text-sm font-bold tabular-nums outline-none focus:border-water-500"
                value={priceDraft[p.id] ?? String(p.price)}
                onChange={(e) => setPriceDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                onBlur={() => savePrice(p)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              />
              <button
                onClick={() => onPatch(p.id, { active: !p.active })}
                className={`w-24 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  p.active
                    ? "bg-ok-soft text-ok hover:bg-ok/20"
                    : "bg-danger-soft text-danger hover:bg-danger/20"
                }`}
              >
                {p.active ? "Visible" : "Oculto"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-soft">
        Al ocultar un producto deja de aparecer en la app del cliente, pero los pedidos ya creados conservan su precio.
      </p>
    </section>
  );
}

/**
 * Cambio de contraseña de la propia cuenta logueada. Lo usa sobre todo el
 * admin de plataforma para rotar su clave tras recibir el acceso temporal.
 */
function PasswordButton() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (newPassword !== repeat) {
      setMsg("Las contraseñas nuevas no coinciden.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await res.json();
      if (res.ok) {
        setMsg("✓ Contraseña actualizada");
        setCurrent("");
        setNext("");
        setRepeat("");
        setTimeout(() => {
          setOpen(false);
          setMsg("");
        }, 1500);
      } else {
        setMsg(d.error ?? "No se pudo cambiar.");
      }
    } catch {
      setMsg("Sin conexión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl border border-ink/15 bg-white px-3.5 py-2 text-xs font-bold text-ink-soft transition hover:border-water-400"
      >
        🔑 Mi contraseña
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold">Cambiar mi contraseña</h3>
            <div className="mt-4 space-y-2">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Contraseña actual"
                className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-sm outline-none focus:border-water-500"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNext(e.target.value)}
                placeholder="Contraseña nueva (mín. 8, letras y números)"
                className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-sm outline-none focus:border-water-500"
              />
              <input
                type="password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                placeholder="Repetir contraseña nueva"
                className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-sm outline-none focus:border-water-500"
              />
            </div>
            {msg && <p className="mt-2 text-xs font-semibold text-ink-soft">{msg}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setMsg("");
                }}
                className="rounded-xl border border-ink/15 px-4 py-2 text-sm font-bold text-ink-soft"
              >
                Cerrar
              </button>
              <button
                onClick={submit}
                disabled={busy || !currentPassword || newPassword.length < 8}
                className="rounded-xl bg-water-700 px-4 py-2 font-display text-sm font-bold text-white transition hover:bg-water-800 disabled:opacity-50"
              >
                {busy ? "…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
