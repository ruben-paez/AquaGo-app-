"use client";

import { useCallback, useEffect, useState } from "react";
import { sessionHeaders } from "@/lib/session-client";

interface BrandAdmin {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  city: string;
  description: string;
  etaMin: number;
  etaMax: number;
  deliveryFee: number;
  plan: string;
  commissionBps: number;
  serviceFeeBps: number;
  serviceFeeMin: number;
  active: boolean;
  comingSoon: boolean;
  dispatchMode: string;
  autoAssign: boolean;
  baseLat: number | null;
  baseLng: number | null;
  driverCount: number;
}

interface VendorUser {
  id: number;
  email: string;
}

interface Vendor {
  id: number;
  brandId: number;
  name: string;
  phone: string;
  vehicle: string;
  plate: string;
  status: string;
  active: boolean;
  capacity: number;
  preferredZone: string;
  user: VendorUser | null;
}

const VEHICLE_ICON: Record<string, string> = { moto: "🛵", camioneta: "🛻", camion: "🚚" };
const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)} %`;

export default function BrandsTab() {
  const [brands, setBrands] = useState<BrandAdmin[] | null>(null);
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [newBrandOpen, setNewBrandOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [bRes, dRes] = await Promise.all([
        fetch("/api/admin/brands", { headers: sessionHeaders() }),
        fetch("/api/admin/drivers?brandId=todas", { headers: sessionHeaders() }),
        fetch("/api/admin/brands", { headers: sessionHeaders() }),
      ]);
      if (bRes.ok) setBrands((await bRes.json()).brands ?? []);
      if (dRes.ok) setVendors((await dRes.json()).drivers ?? []);
    } catch {
      // sin conexión
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!brands || !vendors) {
    return <div className="h-64 animate-pulse rounded-2xl bg-water-50" />;
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">Marcas y vendedores</h2>
          <p className="text-xs text-ink-soft">
            Dá de alta aguaterías, creá sus vendedores y generales usuario y contraseña para que entren a su panel.
          </p>
        </div>
        <button
          onClick={() => setNewBrandOpen((v) => !v)}
          className="rounded-xl bg-water-700 px-4 py-2.5 font-display text-sm font-bold text-white transition hover:bg-water-800"
        >
          {newBrandOpen ? "Cerrar" : "＋ Nueva marca"}
        </button>
      </div>

      {newBrandOpen && (
        <NewBrandForm
          onCreated={async (b) => {
            setNewBrandOpen(false);
            await load();
            setExpanded(b.id);
          }}
        />
      )}

      {brands.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center">
          <h3 className="font-display font-bold">Todavía no hay marcas</h3>
          <p className="mt-1 text-sm text-ink-soft">Creá la primera con el botón de arriba.</p>
        </div>
      )}

      {brands.map((b) => {
        const isOpen = expanded === b.id;
        const list = vendors.filter((v) => v.brandId === b.id);
        return (
          <div key={b.id} className="rounded-2xl border border-ink/10 bg-white shadow-card">
            <button
              onClick={() => setExpanded(isOpen ? null : b.id)}
              className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
            >
              <div>
                <p className="font-display font-bold">
                  {b.name}{" "}
                  {b.active ? (
                    <span className="ml-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 ring-1 ring-teal-200">ACTIVA</span>
                  ) : (
                    <span className="ml-1 rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-ink-soft ring-1 ring-ink/10">PAUSADA</span>
                  )}
                </p>
                <p className="text-xs text-ink-soft">
                  {b.city} · {b.tagline || b.slug} · comisión {pct(b.commissionBps)} · servicio {pct(b.serviceFeeBps)} (mín. {"Gs " + b.serviceFeeMin.toLocaleString("es-PY")})
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="rounded-full bg-water-50 px-3 py-1 text-xs font-bold text-water-700 ring-1 ring-water-200">
                  {b.driverCount} vendedor{b.driverCount === 1 ? "" : "es"}
                </span>
                <span className="text-ink-soft">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {isOpen && (
              <div className="space-y-4 border-t border-ink/10 p-4">
                <BrandEditForm brand={b} onSaved={load} />
                <div className="border-t border-dashed border-ink/15 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Vendedores ({list.length})
                  </p>
                  <div className="mt-2 space-y-2">
                    {list.map((v) => (
                      <VendorRow key={v.id} vendor={v} onChanged={load} />
                    ))}
                    <NewVendorForm brandId={b.id} onCreated={load} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────── Formulario de marca nueva ─────────────── */

function NewBrandForm({ onCreated }: { onCreated: (b: { id: number }) => void }) {
  const [f, setF] = useState({
    name: "",
    city: "Encarnación",
    tagline: "",
    commissionPct: 0,
    serviceFeePct: 10,
    serviceFeeMin: 3500,
    etaMin: 30,
    etaMax: 60,
    baseLat: -27.3306,
    baseLng: -55.8667,
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function submit() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: sessionHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(f),
      });
      const d = await res.json();
      if (res.ok) onCreated(d.brand);
      else setMsg(d.error ?? "No se pudo crear la marca.");
    } catch {
      setMsg("Sin conexión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-water-200 bg-water-50/60 p-4">
      <p className="font-display text-sm font-bold">Nueva aguatería</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nombre *" value={f.name} onChange={set("name")} placeholder="Ej: Aguas del Sur" />
        <Field label="Ciudad" value={f.city} onChange={set("city")} />
        <Field label="Eslogan" value={f.tagline} onChange={set("tagline")} placeholder="Agua purificada a domicilio" />
        <Field label="Comisión % (a la marca)" value={f.commissionPct} onChange={set("commissionPct")} type="number" />
        <Field label="Servicio % (al cliente)" value={f.serviceFeePct} onChange={set("serviceFeePct")} type="number" />
        <Field label="Servicio mínimo Gs" value={f.serviceFeeMin} onChange={set("serviceFeeMin")} type="number" />
        <Field label="ETA mín (min)" value={f.etaMin} onChange={set("etaMin")} type="number" />
        <Field label="ETA máx (min)" value={f.etaMax} onChange={set("etaMax")} type="number" />
        <Field label="Latitud base" value={f.baseLat} onChange={set("baseLat")} type="number" />
        <Field label="Longitud base" value={f.baseLng} onChange={set("baseLng")} type="number" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={busy || f.name.trim().length < 3}
          className="rounded-xl bg-water-700 px-4 py-2 font-display text-sm font-bold text-white transition hover:bg-water-800 disabled:opacity-50"
        >
          {busy ? "Creando…" : "Crear marca"}
        </button>
        {msg && <p className="text-xs font-semibold text-danger">{msg}</p>}
      </div>
    </div>
  );
}

/* ─────────────── Editar marca ─────────────── */

function BrandEditForm({ brand, onSaved }: { brand: BrandAdmin; onSaved: () => void }) {
  const [f, setF] = useState({
    name: brand.name,
    tagline: brand.tagline,
    city: brand.city,
    commissionPct: brand.commissionBps / 100,
    serviceFeePct: brand.serviceFeeBps / 100,
    serviceFeeMin: brand.serviceFeeMin,
    active: brand.active,
    autoAssign: brand.autoAssign,
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/brands/${brand.id}`, {
        method: "PATCH",
        headers: sessionHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(f),
      });
      const d = await res.json();
      setMsg(res.ok ? "✓ Guardado" : (d.error ?? "Error al guardar"));
      if (res.ok) onSaved();
    } catch {
      setMsg("Sin conexión.");
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Datos de la marca</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nombre" value={f.name} onChange={set("name")} />
        <Field label="Eslogan" value={f.tagline} onChange={set("tagline")} />
        <Field label="Ciudad" value={f.city} onChange={set("city")} />
        <Field label="Comisión %" value={f.commissionPct} onChange={set("commissionPct")} type="number" />
        <Field label="Servicio %" value={f.serviceFeePct} onChange={set("serviceFeePct")} type="number" />
        <Field label="Servicio mín Gs" value={f.serviceFeeMin} onChange={set("serviceFeeMin")} type="number" />
        <label className="flex items-center gap-2 self-end pb-1 text-sm font-semibold">
          <input type="checkbox" checked={f.active} onChange={set("active")} className="h-4 w-4 accent-[#105c88]" />
          Marca activa
        </label>
        <label className="flex items-center gap-2 self-end pb-1 text-sm font-semibold">
          <input type="checkbox" checked={f.autoAssign} onChange={set("autoAssign")} className="h-4 w-4 accent-[#105c88]" />
          Auto-asignar pedidos
        </label>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-water-700 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-water-800 disabled:opacity-50"
        >
          {busy ? "…" : "Guardar cambios"}
        </button>
        {msg && <p className="text-xs font-semibold text-ink-soft">{msg}</p>}
      </div>
    </div>
  );
}

/* ─────────────── Fila de vendedor ─────────────── */

function VendorRow({ vendor, onChanged }: { vendor: Vendor; onChanged: () => void }) {
  const [open, setOpen] = useState<"edit" | "access" | null>(null);
  const [email, setEmail] = useState(vendor.user?.email ?? "");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: vendor.name,
    phone: vendor.phone,
    vehicle: vendor.vehicle,
    plate: vendor.plate,
    capacity: vendor.capacity,
    preferredZone: vendor.preferredZone,
    active: vendor.active,
  });

  async function saveAccess() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/drivers/${vendor.id}/access`, {
        method: "POST",
        headers: sessionHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ email, password: pass }),
      });
      const d = await res.json();
      if (res.ok) {
        setMsg(d.message ?? "✓ Acceso listo. Pasale los datos al vendedor.");
        setPass("");
        onChanged();
      } else {
        setMsg(d.error ?? "No se pudo guardar el acceso.");
      }
    } catch {
      setMsg("Sin conexión.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/drivers/${vendor.id}`, {
        method: "PATCH",
        headers: sessionHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(f),
      });
      if (res.ok) {
        setOpen(null);
        onChanged();
      } else {
        const d = await res.json();
        setMsg(d.error ?? "Error al guardar.");
      }
    } finally {
      setBusy(false);
    }
  }

  const ef = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  return (
    <div className="rounded-xl border border-ink/10 bg-paper p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold">
            {VEHICLE_ICON[vendor.vehicle] ?? "🛵"} {vendor.name}
            {!vendor.active && (
              <span className="ml-2 rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-ink-soft">INACTIVO</span>
            )}
          </p>
          <p className="text-[11px] text-ink-soft">
            {vendor.phone || "sin teléfono"} {vendor.plate && `· ${vendor.plate}`} · zona: {vendor.preferredZone || "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {vendor.user ? (
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700 ring-1 ring-teal-200">
              🔑 {vendor.user.email}
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
              sin acceso
            </span>
          )}
          <button
            onClick={() => setOpen(open === "access" ? null : "access")}
            className="rounded-lg bg-water-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-water-800"
          >
            {vendor.user ? "🔑 Resetear acceso" : "🔑 Crear acceso"}
          </button>
          <button
            onClick={() => setOpen(open === "edit" ? null : "edit")}
            className="rounded-lg border border-ink/15 bg-white px-2.5 py-1 text-[11px] font-bold text-ink-soft hover:border-water-400"
          >
            ✏️ Editar
          </button>
        </div>
      </div>

      {open === "access" && (
        <div className="mt-2 rounded-lg bg-white p-2.5">
          <div className="flex flex-wrap gap-1.5">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@del-vendedor.com"
              className="min-w-0 flex-1 rounded-md border border-ink/15 bg-white px-2 py-1 text-xs outline-none focus:border-water-500"
            />
            <input
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder={vendor.user ? "nueva contraseña (opcional)" : "contraseña"}
              className="w-40 rounded-md border border-ink/15 bg-white px-2 py-1 text-xs outline-none focus:border-water-500"
            />
            <button
              onClick={saveAccess}
              disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (!vendor.user && pass.length < 6)}
              className="rounded-md bg-teal-600 px-3 py-1 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {busy ? "…" : "Guardar"}
            </button>
          </div>
          {msg && <p className="mt-1.5 text-[11px] font-semibold text-ink-soft">{msg}</p>}
        </div>
      )}

      {open === "edit" && (
        <div className="mt-2 rounded-lg bg-white p-2.5">
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Nombre" value={f.name} onChange={ef("name")} />
            <Field label="Teléfono" value={f.phone} onChange={ef("phone")} />
            <Field label="Placa" value={f.plate} onChange={ef("plate")} />
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Vehículo</label>
              <select
                value={f.vehicle}
                onChange={ef("vehicle")}
                className="mt-0.5 w-full rounded-md border border-ink/15 bg-white px-2 py-1.5 text-xs outline-none focus:border-water-500"
              >
                <option value="moto">Moto</option>
                <option value="camioneta">Camioneta</option>
                <option value="camion">Camión</option>
              </select>
            </div>
            <Field label="Capacidad (pedidos)" value={f.capacity} onChange={ef("capacity")} type="number" />
            <Field label="Zona preferida" value={f.preferredZone} onChange={ef("preferredZone")} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold">
              <input type="checkbox" checked={f.active} onChange={ef("active")} className="h-3.5 w-3.5 accent-[#105c88]" />
              Activo (recibe pedidos)
            </label>
            <button
              onClick={saveEdit}
              disabled={busy}
              className="rounded-lg bg-water-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-water-800 disabled:opacity-50"
            >
              {busy ? "…" : "Guardar"}
            </button>
            {msg && <p className="text-[11px] font-semibold text-danger">{msg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Vendedor nuevo ─────────────── */

function NewVendorForm({ brandId, onCreated }: { brandId: number; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: "",
    phone: "",
    vehicle: "moto",
    plate: "",
    capacity: 4,
    preferredZone: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: sessionHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ...f, brandId }),
      });
      const d = await res.json();
      if (res.ok) {
        setOpen(false);
        setF({ name: "", phone: "", vehicle: "moto", plate: "", capacity: 4, preferredZone: "" });
        onCreated();
      } else {
        setMsg(d.error ?? "No se pudo crear.");
      }
    } catch {
      setMsg("Sin conexión.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-ink/20 py-2.5 text-xs font-bold text-water-700 transition hover:border-water-400 hover:bg-water-50"
      >
        ＋ Agregar vendedor a esta marca
      </button>
    );
  }

  const ef = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <div className="rounded-xl border border-water-200 bg-water-50/60 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Nombre *" value={f.name} onChange={ef("name")} placeholder="Nombre y apellido" />
        <Field label="Teléfono" value={f.phone} onChange={ef("phone")} placeholder="+595 98..." />
        <Field label="Placa" value={f.plate} onChange={ef("plate")} />
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Vehículo</label>
          <select
            value={f.vehicle}
            onChange={ef("vehicle")}
            className="mt-0.5 w-full rounded-md border border-ink/15 bg-white px-2 py-1.5 text-xs outline-none focus:border-water-500"
          >
            <option value="moto">Moto</option>
            <option value="camioneta">Camioneta</option>
            <option value="camion">Camión</option>
          </select>
        </div>
        <Field label="Capacidad" value={f.capacity} onChange={ef("capacity")} type="number" />
        <Field label="Zona preferida" value={f.preferredZone} onChange={ef("preferredZone")} placeholder="Centro, Obrero…" />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={busy || f.name.trim().length < 3}
          className="rounded-lg bg-water-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-water-800 disabled:opacity-50"
        >
          {busy ? "Creando…" : "Crear vendedor"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-xs font-bold text-ink-soft"
        >
          Cancelar
        </button>
        {msg && <p className="text-[11px] font-semibold text-danger">{msg}</p>}
      </div>
    </div>
  );
}

/* ─────────────── Input reutilizable ─────────────── */

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-0.5 w-full rounded-md border border-ink/15 bg-white px-2 py-1.5 text-xs outline-none focus:border-water-500"
      />
    </div>
  );
}
