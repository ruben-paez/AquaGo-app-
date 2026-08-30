import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  doublePrecision,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  addressLabel: text("address_label").notNull().default(""),
  zone: text("zone").notNull().default(""),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  deliveryNotes: text("delivery_notes").notNull().default(""),
  isAdmin: boolean("is_admin").notNull().default(false),
  /** cliente | marca | plataforma */
  role: text("role").notNull().default("cliente"),
  /** si role = marca, a qué marca pertenece */
  brandId: integer("brand_id"),
  sessionToken: text("session_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Marcas / aguaterías dentro de AquaGo */
export const brands = pgTable(
  "brands",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline").notNull().default(""),
    city: text("city").notNull().default("Encarnación"),
    description: text("description").notNull().default(""),
    etaMin: integer("eta_min").notNull().default(30),
    etaMax: integer("eta_max").notNull().default(60),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    rating: integer("rating").notNull().default(48),
    active: boolean("active").notNull().default(true),
    comingSoon: boolean("coming_soon").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),

    /* ---------- Modelo de negocio ---------- */
    /** plan comercial (hoy uno solo: "unico") */
    plan: text("plan").notNull().default("unico"),
    /** comisión a la marca: 0 = AquaGo no le cobra nada */
    commissionBps: integer("commission_bps").notNull().default(0),
    /** abono mensual del plan: 0 en el modelo actual */
    monthlyFee: integer("monthly_fee").notNull().default(0),
    /** costo de servicio que paga el cliente: porcentaje en bps (1000 = 10 %) */
    serviceFeeBps: integer("service_fee_bps").notNull().default(1000),
    /** piso mínimo del costo de servicio, en Gs */
    serviceFeeMin: integer("service_fee_min").notNull().default(1000),
    /** costo fijo alternativo (se usa si serviceFeeBps = 0) */
    serviceFee: integer("service_fee").notNull().default(0),
    /** saldo de la marca con la plataforma (negativo = debe) */
    walletBalance: integer("wallet_balance").notNull().default(0),
    /** semanal | quincenal | mensual */
    billingCycle: text("billing_cycle").notNull().default("semanal"),
    /** retención automática sobre cobros por transferencia */
    autoRetention: boolean("auto_retention").notNull().default(true),
    /** al día | por vencer | suspendida */
    billingStatus: text("billing_status").notNull().default("al_dia"),
    /** cuándo se suspendió por mora (null = nunca) */
    suspendedAt: timestamp("suspended_at"),
    /** motivo legible de la suspensión */
    suspendedReason: text("suspended_reason").notNull().default(""),
    payoutAlias: text("payout_alias").notNull().default(""),

    /* ---------- Reparto ---------- */
    /** cercania | equilibrado | equitativo */
    dispatchMode: text("dispatch_mode").notNull().default("equilibrado"),
    /** asignar repartidor apenas entra el pedido */
    autoAssign: boolean("auto_assign").notNull().default(true),
    /** punto de salida de los repartos (planta / depósito) */
    baseLat: doublePrecision("base_lat"),
    baseLng: doublePrecision("base_lng"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("brands_slug_idx").on(t.slug)]
);

/** Repartidores de cada marca */
export const drivers = pgTable(
  "drivers",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    vehicle: text("vehicle").notNull().default("moto"), // moto | camioneta | camion
    plate: text("plate").notNull().default(""),
    /** disponible | ocupado | fuera_turno */
    status: text("status").notNull().default("disponible"),
    /** última posición conocida */
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    /** cuándo llegó la última posición (para saber qué tan fresca está) */
    lastSeenAt: timestamp("last_seen_at"),
    /** cuántos pedidos puede llevar a la vez */
    capacity: integer("capacity").notNull().default(4),
    /** zona preferida (opcional, sirve de desempate) */
    preferredZone: text("preferred_zone").notNull().default(""),
    active: boolean("active").notNull().default(true),
    /** usuario vinculado (login del repartidor). Único: 1 usuario = 1 repartidor */
    userId: integer("user_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("drivers_brand_idx").on(t.brandId), uniqueIndex("drivers_user_unique").on(t.userId)]
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id").notNull().default(1),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("agua"),
    volume: text("volume").notNull().default(""),
    price: integer("price").notNull(),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("products_brand_idx").on(t.brandId)]
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    userId: integer("user_id").notNull(),
    brandId: integer("brand_id").notNull().default(1),
    status: text("status").notNull().default("pendiente"),
    paymentMethod: text("payment_method").notNull().default("efectivo"),
    changeFrom: integer("change_from"),
    transferPaid: boolean("transfer_paid").notNull().default(false),
    /** sin_comprobante | pendiente | verificado | rechazado */
    proofStatus: text("proof_status").notNull().default("sin_comprobante"),
    driverName: text("driver_name").notNull().default(""),
    /** repartidor asignado por el motor de despacho */
    driverId: integer("driver_id"),
    assignedAt: timestamp("assigned_at"),
    /** distancia repartidor→cliente al momento de asignar (km) */
    assignDistanceKm: doublePrecision("assign_distance_km"),
    /** cercania | equilibrado | equitativo | manual */
    assignReason: text("assign_reason").notNull().default(""),
    addressLabel: text("address_label").notNull().default(""),
    zone: text("zone").notNull().default(""),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    notes: text("notes").notNull().default(""),

    /* ---------- Desglose económico ---------- */
    /** suma de productos, precio de lista de la marca */
    subtotal: integer("subtotal").notNull().default(0),
    /** costo de servicio que paga el cliente */
    serviceFee: integer("service_fee").notNull().default(0),
    /** lo que paga el cliente = subtotal + serviceFee */
    total: integer("total").notNull().default(0),
    /** comisión aplicada a la marca */
    commissionBps: integer("commission_bps").notNull().default(0),
    commissionAmount: integer("commission_amount").notNull().default(0),
    /** lo que le queda a la marca = subtotal - comisión */
    netToBrand: integer("net_to_brand").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_code_idx").on(t.code),
    index("orders_user_idx").on(t.userId),
    index("orders_brand_idx").on(t.brandId),
    index("orders_created_idx").on(t.createdAt),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull(),
    productId: integer("product_id").notNull(),
    name: text("name").notNull(),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)]
);

/** Libro mayor de comisiones: una línea por pedido entregado */
export const commissions = pgTable(
  "commissions",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull(),
    brandId: integer("brand_id").notNull(),
    orderCode: text("order_code").notNull().default(""),
    gross: integer("gross").notNull().default(0),
    commissionBps: integer("commission_bps").notNull().default(0),
    commissionAmount: integer("commission_amount").notNull().default(0),
    serviceFee: integer("service_fee").notNull().default(0),
    /** ingreso total de la plataforma por ese pedido */
    platformRevenue: integer("platform_revenue").notNull().default(0),
    /** efectivo | transferencia — define cómo se cobra */
    paymentMethod: text("payment_method").notNull().default("efectivo"),
    /** retenida (ya cobrada) | por_cobrar (la marca cobró el efectivo) */
    collectionMode: text("collection_mode").notNull().default("por_cobrar"),
    /** pendiente | liquidada */
    status: text("status").notNull().default("pendiente"),
    settlementId: integer("settlement_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("commissions_order_idx").on(t.orderId),
    index("commissions_brand_idx").on(t.brandId),
    index("commissions_status_idx").on(t.status),
  ]
);

/** Liquidaciones automáticas por período y marca */
export const settlements = pgTable(
  "settlements",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id").notNull(),
    code: text("code").notNull(),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    ordersCount: integer("orders_count").notNull().default(0),
    grossSales: integer("gross_sales").notNull().default(0),
    commissionTotal: integer("commission_total").notNull().default(0),
    serviceFeeTotal: integer("service_fee_total").notNull().default(0),
    monthlyFee: integer("monthly_fee").notNull().default(0),
    /** ya retenido de las transferencias */
    retainedAmount: integer("retained_amount").notNull().default(0),
    /** lo que la marca todavía debe transferir */
    amountDue: integer("amount_due").notNull().default(0),
    /** emitida | pagada | vencida */
    status: text("status").notNull().default("emitida"),
    dueDate: timestamp("due_date").notNull(),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("settlements_code_idx").on(t.code),
    index("settlements_brand_idx").on(t.brandId),
  ]
);

/** Comprobantes de transferencia que sube el cliente */
export const paymentProofs = pgTable(
  "payment_proofs",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull(),
    userId: integer("user_id").notNull(),
    /** imagen en base64 (data URL). En producción iría a S3/Cloudinary. */
    dataUrl: text("data_url").notNull(),
    mimeType: text("mime_type").notNull().default("image/jpeg"),
    fileName: text("file_name").notNull().default(""),
    sizeBytes: integer("size_bytes").notNull().default(0),
    /** lo que declara el cliente */
    amountDeclared: integer("amount_declared").notNull().default(0),
    reference: text("reference").notNull().default(""),
    /** pendiente | verificado | rechazado */
    status: text("status").notNull().default("pendiente"),
    reviewNote: text("review_note").notNull().default(""),
    reviewedAt: timestamp("reviewed_at"),
    reviewedBy: integer("reviewed_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("payment_proofs_order_idx").on(t.orderId),
    index("payment_proofs_status_idx").on(t.status),
  ]
);

/**
 * Sesiones activas. Antes el token vivía en `users.session_token`, así que
 * cada login pisaba al anterior: con dos pestañas abiertas (o al volver a
 * entrar desde la barra demo) la primera quedaba muerta y los pedidos
 * fallaban con "Debes iniciar sesión". Ahora cada login crea su propia fila
 * y conviven todas.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull(),
    userId: integer("user_id").notNull(),
    userAgent: text("user_agent").notNull().default(""),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_idx").on(t.token),
    index("sessions_user_idx").on(t.userId),
  ]
);
