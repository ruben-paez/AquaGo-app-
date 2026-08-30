import "./env";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import {
  brands,
  commissions,
  drivers,
  orderItems,
  orders,
  products,
  settlements,
  users,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/password";
import { computeOrderEconomics, collectionModeFor, getPlan } from "../src/lib/pricing";
import { ZONES, zoneFor } from "../src/lib/zones";
import { haversineKm } from "../src/lib/dispatch";

const BRAND_SEED = [
  {
    slug: "aquanat",
    name: "AQUAnat",
    tagline: "Puramente Encarnacena",
    city: "Encarnación",
    description:
      "Agua mineral natural embotellada en Encarnación. Recargas de bidón 20 L y bidones completos con envase.",
    etaMin: 30,
    etaMax: 60,
    deliveryFee: 0,
    rating: 49,
    active: true,
    comingSoon: false,
    sortOrder: 1,
    plan: "unico",
    payoutAlias: "AQUAnat SA · Banco Continental",
    dispatchMode: "equilibrado",
    autoAssign: true,
    baseLat: -27.3325,
    baseLng: -55.8712,
  },
  {
    slug: "manantial",
    name: "Manantial Itapúa",
    tagline: "Agua de vertiente",
    city: "Cambyretá",
    // Segunda marca de ejemplo: queda visible para mostrar cómo se vería el
    // marketplace con varias aguaterías, pero todavía no recibe pedidos.
    description: "",
    etaMin: 40,
    etaMax: 80,
    deliveryFee: 5000,
    rating: 46,
    active: true,
    comingSoon: true,
    sortOrder: 2,
    plan: "unico",
    payoutAlias: "Manantial SRL · Banco Familiar",
    dispatchMode: "cercania",
    autoAssign: true,
    baseLat: -27.3050,
    baseLng: -55.8300,
  },
];

const AQUANAT_PRODUCTS = [
  { name: "Recarga bidón 20 L", description: "Entregás tu bidón vacío y lo cambiamos por uno lleno.", category: "agua", volume: "20 L", price: 12000, sortOrder: 1, weight: 78 },
  { name: "Bidón 20 L completo", description: "Incluye el envase nuevo + los 20 litros de agua.", category: "agua", volume: "20 L", price: 50000, sortOrder: 2, weight: 16 },
  { name: "Bomba manual para bidón", description: "Dispensa sin levantar el bidón.", category: "accesorios", volume: "unidad", price: 45000, sortOrder: 3, weight: 6 },
];

const MANANTIAL_PRODUCTS = [
  { name: "Recarga bidón 20 L", description: "Recarga de agua de vertiente.", category: "agua", volume: "20 L", price: 13000, sortOrder: 1, weight: 70 },
  { name: "Bidón 20 L completo", description: "Envase nuevo + agua de vertiente.", category: "agua", volume: "20 L", price: 52000, sortOrder: 2, weight: 20 },
  { name: "Pack 12 botellas 1,5 L", description: "Caja de botellas para eventos.", category: "otros", volume: "12 × 1,5 L", price: 38000, sortOrder: 3, weight: 10 },
];

const DRIVER_SEED = [
  { name: "Diego Riquelme", vehicle: "moto", plate: "ABC 123", capacity: 3, zone: "Centro" },
  { name: "Aldo Meza", vehicle: "camioneta", plate: "BKT 204", capacity: 6, zone: "San Isidro" },
  { name: "Rubén Sosa", vehicle: "moto", plate: "CDE 456", capacity: 3, zone: "Ita Paso" },
  { name: "Fabio Cáceres", vehicle: "camioneta", plate: "FGH 789", capacity: 6, zone: "Kaʼaguy Rory" },
  { name: "Néstor Duarte", vehicle: "moto", plate: "IJK 012", capacity: 3, zone: "Buena Vista" },
  { name: "Emilio Franco", vehicle: "camioneta", plate: "LMN 345", capacity: 5, zone: "Chaipé" },
  { name: "Gustavo Ayala", vehicle: "camion", plate: "OPQ 678", capacity: 10, zone: "San Pedro" },
  { name: "Hugo Villalba", vehicle: "moto", plate: "RST 901", capacity: 3, zone: "Mboi Kaʼê" },
  { name: "Marcos Ortiz", vehicle: "camioneta", plate: "UVW 234", capacity: 5, zone: "Villa Angélica" },
  { name: "Víctor Bogado", vehicle: "moto", plate: "XYZ 567", capacity: 3, zone: "Quiteria" },
];

const MANANTIAL_DRIVERS = [
  { name: "Julio Vera", vehicle: "camioneta", plate: "MAN 111", capacity: 5, zone: "Centro" },
  { name: "Ramón Acosta", vehicle: "moto", plate: "MAN 222", capacity: 3, zone: "Buena Vista" },
];

const FIRST_NAMES = ["María", "Carlos", "Rosa", "Diego", "Lucía", "Javier", "Silvia", "Marcos", "Nadia", "Rubén", "Gloria", "Fabio", "Liz", "Óscar", "Patricia", "Hugo", "Celeste", "Ramón", "Andrea", "Víctor", "Belén", "Aldo", "Mirta", "Julio", "Karina", "Néstor", "Sofía", "Emilio", "Lorena", "Gustavo"];
const LAST_NAMES = ["Benítez", "González", "Rojas", "Cáceres", "Duarte", "Ayala", "Villalba", "Ortiz", "Ramírez", "Franco", "Sosa", "Acosta", "Giménez", "Vera", "Insfrán", "Molinas", "Bogado", "Escobar", "Ferreira", "Zárate"];
const STREETS = ["Av. Irrazábal", "Av. Caballero", "Gral. Artigas", "Curupayty", "Cerro Corá", "Villarrica", "Mcal. Estigarribia", "Tomás Romero Pereira", "Juan L. Mallorquín", "Carlos A. López"];

/** PRNG con semilla para que el dataset sea reproducible */
let seedState = 20260101;
function rnd(): number {
  seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
  return seedState / 0x7fffffff;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}
function weightedPick<T extends { weight: number }>(arr: T[]): T {
  const total = arr.reduce((s, a) => s + a.weight, 0);
  let r = rnd() * total;
  for (const a of arr) {
    r -= a.weight;
    if (r <= 0) return a;
  }
  return arr[0];
}

function orderCodeAt(i: number): string {
  return `AQG-H${i.toString(36).toUpperCase().padStart(4, "0")}`;
}

async function seedBrands() {
  for (const b of BRAND_SEED) {
    const plan = getPlan(b.plan);
    const values = {
      ...b,
      commissionBps: plan.commissionBps,
      monthlyFee: plan.monthlyFee,
      serviceFeeBps: b.comingSoon ? 0 : plan.serviceFeeBps,
      serviceFeeMin: b.comingSoon ? 0 : plan.serviceFeeMin,
      serviceFee: 0,
      billingCycle: "semanal",
      autoRetention: true,
      billingStatus: "al_dia",
    };
    const found = await db.select({ id: brands.id }).from(brands).where(eq(brands.slug, b.slug)).limit(1);
    if (found.length === 0) await db.insert(brands).values(values);
    else await db.update(brands).set(values).where(eq(brands.slug, b.slug));
  }
  console.log(`✔ ${BRAND_SEED.length} marcas listas.`);
}

async function seedProducts() {
  const all = await db.select().from(brands);
  const map = new Map(all.map((b) => [b.slug, b.id]));

  await db.delete(products);
  const aq = map.get("aquanat")!;
  const mn = map.get("manantial")!;
  await db.insert(products).values([
    ...AQUANAT_PRODUCTS.map(({ weight, ...p }) => ({ ...p, brandId: aq, active: true })),
    ...MANANTIAL_PRODUCTS.map(({ weight, ...p }) => ({ ...p, brandId: mn, active: true })),
  ]);
  console.log("✔ Catálogos de AQUAnat y Manantial cargados.");
  return { aq, mn };
}

async function seedDrivers(brandIds: { aq: number; mn: number }) {
  await db.delete(drivers);
  const zoneByName = new Map(ZONES.map((z) => [z.name, z]));

  const rows = [
    ...DRIVER_SEED.map((d) => ({ ...d, brandId: brandIds.aq })),
    ...MANANTIAL_DRIVERS.map((d) => ({ ...d, brandId: brandIds.mn })),
  ].map((d) => {
    const z = zoneByName.get(d.zone) ?? ZONES[0];
    return {
      brandId: d.brandId,
      name: d.name,
      phone: `+595 98${Math.floor(rnd() * 9)} ${Math.floor(rnd() * 900 + 100)} ${Math.floor(rnd() * 900 + 100)}`,
      vehicle: d.vehicle,
      plate: d.plate,
      capacity: d.capacity,
      preferredZone: d.zone,
      // Arrancan repartidos por la ciudad, cerca de su zona habitual
      lat: z.lat + (rnd() - 0.5) * 0.01,
      lng: z.lng + (rnd() - 0.5) * 0.01,
      status: "disponible",
      active: true,
    };
  });

  const inserted = await db.insert(drivers).values(rows).returning();
  console.log(`✔ ${inserted.length} repartidores cargados (10 AQUAnat + 2 Manantial).`);
  return inserted;
}

async function ensureUser(
  email: string,
  data: {
    name: string; phone: string; password: string; isAdmin?: boolean; role?: string;
    brandId?: number | null; addressLabel?: string; zone?: string; lat?: number; lng?: number;
    deliveryNotes?: string; createdAt?: Date;
  }
) {
  const values = {
    name: data.name,
    phone: data.phone,
    email,
    passwordHash: hashPassword(data.password),
    isAdmin: data.isAdmin ?? false,
    role: data.role ?? "cliente",
    brandId: data.brandId ?? null,
    addressLabel: data.addressLabel ?? "",
    zone: data.zone ?? "",
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    deliveryNotes: data.deliveryNotes ?? "",
    createdAt: data.createdAt ?? new Date(),
  };
  const found = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (found.length > 0) {
    const { passwordHash, ...rest } = values;
    await db.update(users).set(rest).where(eq(users.email, email));
    return found[0].id;
  }
  const [row] = await db.insert(users).values(values).returning();
  return row.id;
}

/** Genera clientes con cadencia propia y su historial de pedidos */
async function seedHistory(
  brandIds: { aq: number; mn: number },
  driverRows: { id: number; brandId: number; name: string; vehicle: string; lat: number | null; lng: number | null }[]
) {
  await db.delete(settlements);
  await db.delete(commissions);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(users).where(sql`email like 'demo.cliente%'`);

  const brandRows = await db.select().from(brands);
  const brandById = new Map(brandRows.map((b) => [b.id, b]));
  const productRows = await db.select().from(products);

  const catalog = {
    [brandIds.aq]: AQUANAT_PRODUCTS.map((p) => ({
      ...p,
      id: productRows.find((r) => r.brandId === brandIds.aq && r.name === p.name)!.id,
    })),
    [brandIds.mn]: MANANTIAL_PRODUCTS.map((p) => ({
      ...p,
      id: productRows.find((r) => r.brandId === brandIds.mn && r.name === p.name)!.id,
    })),
  } as Record<number, { id: number; name: string; price: number; weight: number }[]>;

  const DAYS = 90;
  const now = Date.now();
  let orderSeq = 1;
  const driverUsage = new Map<number, number>();
  let totalAssigned = 0;

  interface Pending {
    userId: number;
    brandId: number;
    when: Date;
    zone: string;
    lat: number;
    lng: number;
    address: string;
  }
  const pendingOrders: Pending[] = [];

  // 34 clientes sintéticos con cadencia y zona propias
  for (let i = 0; i < 34; i++) {
    const zone = ZONES[Math.floor(rnd() * ZONES.length)];
    const lat = zone.lat + (rnd() - 0.5) * 0.012;
    const lng = zone.lng + (rnd() - 0.5) * 0.012;
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const address = `${pick(STREETS)} ${Math.floor(rnd() * 2200 + 100)}`;
    const signupDaysAgo = Math.floor(rnd() * (DAYS - 5)) + 5;
    const createdAt = new Date(now - signupDaysAgo * 864e5);

    const userId = await ensureUser(`demo.cliente${i}@aquago.test`, {
      name,
      phone: `+595 98${Math.floor(rnd() * 9)} ${Math.floor(rnd() * 900 + 100)} ${Math.floor(rnd() * 900 + 100)}`,
      password: "demo1234",
      addressLabel: `${address}, ${zone.name}`,
      zone: zone.name,
      lat,
      lng,
      createdAt,
    });

    // Cadencia: hogares chicos ~18 días, familias/oficinas ~6 días
    const cadence = 5 + Math.floor(rnd() * 16);
    // 15 % son clientes que se enfriaron (dejaron de pedir hace tiempo)
    const churned = rnd() < 0.15;
    const stopAt = churned ? Math.floor(rnd() * 30) + 25 : 0;
    // La mayoría le compra a AQUAnat
    // Manantial figura como próxima marca: todavía no tiene pedidos.
    const brandId = brandIds.aq;

    let dayCursor = signupDaysAgo;
    while (dayCursor > stopAt) {
      const jitter = Math.floor((rnd() - 0.5) * 4);
      const when = new Date(now - dayCursor * 864e5);
      // Horario de reparto 7:00–19:00, pico a media mañana y tarde
      const hour = rnd() < 0.55 ? 8 + Math.floor(rnd() * 4) : 15 + Math.floor(rnd() * 4);
      when.setHours(hour, Math.floor(rnd() * 60), 0, 0);
      // Los domingos casi no se reparte
      if (!(when.getDay() === 0 && rnd() < 0.8)) {
        pendingOrders.push({ userId, brandId, when, zone: zone.name, lat, lng, address });
      }
      dayCursor -= Math.max(2, cadence + jitter);
    }
  }

  pendingOrders.sort((a, b) => a.when.getTime() - b.when.getTime());

  for (const po of pendingOrders) {
    const brand = brandById.get(po.brandId)!;
    const items = catalog[po.brandId];
    const chosen = weightedPick(items);
    const qty = rnd() < 0.75 ? 1 : rnd() < 0.8 ? 2 : 3;
    const subtotal = chosen.price * qty;

    const econ = computeOrderEconomics(subtotal, brand.commissionBps, {
      serviceFeeBps: brand.serviceFeeBps,
      serviceFeeMin: brand.serviceFeeMin,
      serviceFee: brand.serviceFee,
    });
    const paymentMethod = rnd() < 0.62 ? "efectivo" : "transferencia";
    const ageDays = (now - po.when.getTime()) / 864e5;
    const status = ageDays > 1 ? (rnd() < 0.04 ? "cancelada" : "entregada") : "en_camino";

    // Asignación histórica: el más cercano entre los de la marca, rotando
    // un poco la carga para que el reparto quede parejo.
    const brandDrivers = driverRows.filter((d) => d.brandId === po.brandId);
    let assigned: (typeof brandDrivers)[number] | undefined;
    let assignedKm: number | null = null;
    if (brandDrivers.length > 0) {
      const scored = brandDrivers.map((d) => {
        const km =
          d.lat != null && d.lng != null ? haversineKm(d.lat, d.lng, po.lat, po.lng) : 50;
        const used = driverUsage.get(d.id) ?? 0;
        const avg = totalAssigned / brandDrivers.length;
        // Penaliza a quien ya viene cargado respecto del promedio
        return { d, km, score: km + Math.max(0, used - avg) * 1.4 };
      });
      scored.sort((a, b) => a.score - b.score);
      assigned = scored[0].d;
      assignedKm = Math.round(scored[0].km * 10) / 10;
      driverUsage.set(assigned.id, (driverUsage.get(assigned.id) ?? 0) + 1);
      totalAssigned++;
    }

    const [order] = await db
      .insert(orders)
      .values({
        code: orderCodeAt(orderSeq++),
        userId: po.userId,
        brandId: po.brandId,
        status,
        paymentMethod,
        changeFrom: paymentMethod === "efectivo" && rnd() < 0.5 ? 50000 : null,
        transferPaid: paymentMethod === "transferencia",
        driverId: assigned?.id ?? null,
        driverName: assigned?.name ?? "",
        assignedAt: po.when,
        assignDistanceKm: assignedKm,
        assignReason: "equilibrado",
        addressLabel: `${po.address}, ${po.zone}`,
        zone: zoneFor(po.lat, po.lng),
        lat: po.lat,
        lng: po.lng,
        notes: "",
        subtotal: econ.subtotal,
        serviceFee: econ.serviceFee,
        total: econ.total,
        commissionBps: econ.commissionBps,
        commissionAmount: econ.commissionAmount,
        netToBrand: econ.netToBrand,
        createdAt: po.when,
        updatedAt: po.when,
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: order.id,
      productId: chosen.id,
      name: chosen.name,
      unitPrice: chosen.price,
      quantity: qty,
    });

    if (status !== "cancelada") {
      await db.insert(commissions).values({
        orderId: order.id,
        brandId: po.brandId,
        orderCode: order.code,
        gross: econ.subtotal,
        commissionBps: econ.commissionBps,
        commissionAmount: econ.commissionAmount,
        serviceFee: econ.serviceFee,
        platformRevenue: econ.platformRevenue,
        paymentMethod,
        collectionMode: collectionModeFor(paymentMethod),
        status: "pendiente",
        createdAt: po.when,
      });
    }
  }

  console.log(`✔ ${pendingOrders.length} pedidos históricos generados (90 días).`);
}

async function main() {
  await seedBrands();
  const brandIds = await seedProducts();
  const driverRows = await seedDrivers(brandIds);
  await seedHistory(brandIds, driverRows);

  await ensureUser("admin@aquago.com.py", {
    name: "Plataforma AquaGo",
    phone: "+595 985 123 456",
    password: "admin123",
    isAdmin: true,
    role: "plataforma",
    addressLabel: "Encarnación, Itapúa",
    lat: -27.3306,
    lng: -55.8667,
  });
  await ensureUser("marca@aquanat.com.py", {
    name: "Operaciones AQUAnat",
    phone: "+595 985 222 111",
    password: "marca123",
    isAdmin: true,
    role: "marca",
    brandId: brandIds.aq,
    addressLabel: "Planta AQUAnat, Encarnación",
    lat: -27.3325,
    lng: -55.8712,
  });
  await ensureUser("cliente@demo.com.py", {
    name: "María Benítez",
    phone: "+595 981 456 789",
    password: "cliente123",
    addressLabel: "Av. Irrazábal 1250 c/ Curupayty, Encarnación",
    zone: "Centro",
    lat: -27.3289,
    lng: -55.8623,
    deliveryNotes: "Portón blanco, tocar bocina.",
  });

  // Saldo de cuenta corriente coherente con las comisiones pendientes
  await db.execute(sql`
    update brands b set wallet_balance = -coalesce((
      select sum(c.platform_revenue) from commissions c
      where c.brand_id = b.id and c.status = 'pendiente'
    ),0)
  `);

  console.log("Seed finalizado.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
