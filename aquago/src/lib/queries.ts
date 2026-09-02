import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, users, products, brands, drivers } from "@/db/schema";

export interface BrandView {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  city: string;
  description: string;
  etaMin: number;
  etaMax: number;
  deliveryFee: number;
  rating: number;
  comingSoon: boolean;
  billingStatus?: string;
  suspended?: boolean;
  /** costo de servicio: el cliente lo ve antes de confirmar */
  serviceFeeBps: number;
  serviceFeeMin: number;
  serviceFee: number;
}

export interface OrderView {
  id: number;
  code: string;
  userId: number;
  brandId: number;
  brandName?: string;
  status: string;
  paymentMethod: string;
  changeFrom: number | null;
  transferPaid: boolean;
  proofStatus: string;
  driverName: string;
  driverId: number | null;
  driverPhone?: string;
  driverVehicle?: string;
  assignDistanceKm: number | null;
  assignReason: string;
  addressLabel: string;
  lat: number | null;
  lng: number | null;
  notes: string;
  zone: string;
  subtotal: number;
  serviceFee: number;
  total: number;
  commissionBps: number;
  commissionAmount: number;
  netToBrand: number;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  customerPhone?: string;
  items: { id: number; name: string; unitPrice: number; quantity: number }[];
}

interface OrderRow {
  id: number;
  code: string;
  userId: number;
  brandId: number;
  status: string;
  paymentMethod: string;
  changeFrom: number | null;
  transferPaid: boolean;
  proofStatus: string;
  driverName: string;
  driverId: number | null;
  driverPhone?: string | null;
  driverVehicle?: string | null;
  assignDistanceKm: number | null;
  assignReason: string;
  addressLabel: string;
  lat: number | null;
  lng: number | null;
  notes: string;
  zone: string;
  subtotal: number;
  serviceFee: number;
  total: number;
  commissionBps: number;
  commissionAmount: number;
  netToBrand: number;
  createdAt: Date;
  updatedAt: Date;
  brandName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
}

function mapOrder(
  row: OrderRow,
  items: { id: number; orderId: number; name: string; unitPrice: number; quantity: number }[]
): OrderView {
  return {
    id: row.id,
    code: row.code,
    userId: row.userId,
    brandId: row.brandId,
    brandName: row.brandName ?? undefined,
    status: row.status,
    paymentMethod: row.paymentMethod,
    changeFrom: row.changeFrom,
    transferPaid: row.transferPaid,
    proofStatus: row.proofStatus,
    driverName: row.driverName,
    driverId: row.driverId,
    driverPhone: row.driverPhone ?? undefined,
    driverVehicle: row.driverVehicle ?? undefined,
    assignDistanceKm: row.assignDistanceKm,
    assignReason: row.assignReason,
    addressLabel: row.addressLabel,
    lat: row.lat,
    lng: row.lng,
    notes: row.notes,
    zone: row.zone,
    subtotal: row.subtotal,
    serviceFee: row.serviceFee,
    total: row.total,
    commissionBps: row.commissionBps,
    commissionAmount: row.commissionAmount,
    netToBrand: row.netToBrand,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    customerName: row.customerName ?? undefined,
    customerPhone: row.customerPhone ?? undefined,
    items: items
      .filter((i) => i.orderId === row.id)
      .map((i) => ({ id: i.id, name: i.name, unitPrice: i.unitPrice, quantity: i.quantity })),
  };
}

const orderSelection = {
  id: orders.id,
  code: orders.code,
  userId: orders.userId,
  brandId: orders.brandId,
  status: orders.status,
  paymentMethod: orders.paymentMethod,
  changeFrom: orders.changeFrom,
  transferPaid: orders.transferPaid,
  proofStatus: orders.proofStatus,
  driverName: orders.driverName,
  driverId: orders.driverId,
  driverPhone: drivers.phone,
  driverVehicle: drivers.vehicle,
  assignDistanceKm: orders.assignDistanceKm,
  assignReason: orders.assignReason,
  addressLabel: orders.addressLabel,
  lat: orders.lat,
  lng: orders.lng,
  notes: orders.notes,
  zone: orders.zone,
  subtotal: orders.subtotal,
  serviceFee: orders.serviceFee,
  total: orders.total,
  commissionBps: orders.commissionBps,
  commissionAmount: orders.commissionAmount,
  netToBrand: orders.netToBrand,
  createdAt: orders.createdAt,
  updatedAt: orders.updatedAt,
  brandName: brands.name,
};

async function attachItems(rows: OrderRow[]): Promise<OrderView[]> {
  if (rows.length === 0) return [];
  const allItems = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, rows.map((r) => r.id)));
  return rows.map((r) => mapOrder(r, allItems));
}

export async function getOrdersForUser(userId: number): Promise<OrderView[]> {
  const rows = await db
    .select(orderSelection)
    .from(orders)
    .leftJoin(brands, eq(orders.brandId, brands.id))
    .leftJoin(drivers, eq(orders.driverId, drivers.id))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(30);
  return attachItems(rows);
}

export async function getAllOrders(brandId?: number): Promise<OrderView[]> {
  const rows = await db
    .select({
      ...orderSelection,
      customerName: users.name,
      customerPhone: users.phone,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .leftJoin(brands, eq(orders.brandId, brands.id))
    .leftJoin(drivers, eq(orders.driverId, drivers.id))
    .where(brandId !== undefined ? eq(orders.brandId, brandId) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(100);
  return attachItems(rows);
}

export async function getBrands(): Promise<BrandView[]> {
  const rows = await db
    .select()
    .from(brands)
    .where(eq(brands.active, true))
    .orderBy(asc(brands.sortOrder), asc(brands.id));
  return rows.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    tagline: b.tagline,
    city: b.city,
    description: b.description,
    etaMin: b.etaMin,
    etaMax: b.etaMax,
    deliveryFee: b.deliveryFee,
    rating: b.rating,
    comingSoon: b.comingSoon,
    billingStatus: b.billingStatus,
    suspended: b.billingStatus === "suspendida",
    serviceFeeBps: b.serviceFeeBps,
    serviceFeeMin: b.serviceFeeMin,
    serviceFee: b.serviceFee,
  }));
}

export async function getActiveProducts(brandId?: number) {
  const where = brandId
    ? and(eq(products.active, true), eq(products.brandId, brandId))
    : eq(products.active, true);
  return db
    .select()
    .from(products)
    .where(where)
    .orderBy(asc(products.sortOrder), asc(products.id));
}
