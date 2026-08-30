/**
 * Motor económico de AquaGo.
 *
 * Principio rector: NO se toca el precio de lista de la marca.
 * El bidón sigue costando 12.000 Gs en la app y en el local.
 * La plataforma vive de tres fuentes que se combinan:
 *
 *   1) Comisión sobre venta (take rate) que absorbe la marca.
 *   2) Costo de servicio fijo y visible que paga el cliente (chico).
 *   3) Abono mensual del plan (previsibilidad para la plataforma).
 */

/**
 * En Paraguay no circulan monedas: el vuelto se maneja en billetes y el
 * menor de uso corriente es de 500 Gs. Cualquier precio que no sea múltiplo
 * de 500 obliga al repartidor a redondear a mano en la puerta, que es
 * justamente lo que genera discusiones.
 *
 * Por eso todo lo que alguien va a pagar en efectivo se redondea acá.
 */
export const CASH_STEP = 500;

export function roundToCashStep(value: number): number {
  return Math.round(value / CASH_STEP) * CASH_STEP;
}

/** Redondea hacia arriba (para deudas: nunca cobrar de menos). */
export function ceilToCashStep(value: number): number {
  return Math.ceil(value / CASH_STEP) * CASH_STEP;
}

export function isCashFriendly(value: number): boolean {
  return value % CASH_STEP === 0;
}

export interface Plan {
  key: string;
  name: string;
  monthlyFee: number;
  commissionBps: number;
  /** costo de servicio al cliente, en bps sobre el subtotal (1000 = 10 %) */
  serviceFeeBps: number;
  /** piso mínimo del costo de servicio */
  serviceFeeMin: number;
  bestFor: string;
  perks: string[];
}

/**
 * Modelo comercial de AquaGo: uno solo y simple.
 *
 * La plataforma NO le cobra nada a la aguatería: ni comisión sobre la venta,
 * ni abono mensual. El único ingreso es el 10 % de costo de servicio que paga
 * el cliente por el envío, visible como línea aparte en el checkout.
 *
 * Ventaja de este esquema: la marca cobra exactamente su precio de lista, así
 * que nunca le conviene esquivar la app, y el cliente ve con claridad qué paga
 * por el agua y qué paga por que se la lleven.
 */
export const PLANS: Plan[] = [
  {
    key: "unico",
    name: "Sin comisiones",
    monthlyFee: 0,
    commissionBps: 0,
    serviceFeeBps: 1000,
    serviceFeeMin: 1000,
    bestFor: "Todas las aguaterías, desde el primer día",
    perks: [
      "0 % de comisión: la marca cobra su precio completo",
      "Sin abono mensual ni costo de alta",
      "La plataforma se financia con el 10 % que paga el cliente",
      "Panel de pedidos, reparto y datos incluido",
    ],
  },
];

export function getPlan(key: string): Plan {
  return PLANS.find((p) => p.key === key) ?? PLANS[1];
}

export function bpsToPct(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)} %`;
}

export interface ServiceFeeConfig {
  /** porcentaje en bps sobre el subtotal (1000 = 10 %) */
  serviceFeeBps: number;
  /** piso mínimo en Gs */
  serviceFeeMin: number;
  /** monto fijo alternativo, se usa si serviceFeeBps = 0 */
  serviceFee: number;
}

/**
 * Costo de servicio que paga el cliente.
 *
 * Es un porcentaje del pedido (10 % por defecto) con un piso mínimo, para que
 * un pedido chico no quede sin cubrir el costo de la plataforma. Siempre se
 * redondea a 500 Gs porque es plata que se paga en mano.
 */
export function computeServiceFee(subtotal: number, cfg: ServiceFeeConfig): number {
  if (subtotal <= 0) return 0;
  const raw =
    cfg.serviceFeeBps > 0
      ? (subtotal * cfg.serviceFeeBps) / 10000
      : cfg.serviceFee;
  return roundToCashStep(Math.max(raw, cfg.serviceFeeMin));
}

export interface OrderEconomics {
  subtotal: number;
  serviceFee: number;
  /** lo que paga el cliente */
  total: number;
  commissionBps: number;
  commissionAmount: number;
  /** lo que recibe la marca */
  netToBrand: number;
  /** lo que gana la plataforma en ese pedido */
  platformRevenue: number;
  /** % real que se lleva la plataforma sobre lo que paga el cliente */
  effectiveTakeRate: number;
}

/**
 * Calcula el desglose de un pedido.
 * El subtotal nunca se modifica: es el precio de lista de la marca.
 */
export function computeOrderEconomics(
  subtotal: number,
  commissionBps: number,
  fee: number | ServiceFeeConfig
): OrderEconomics {
  // Acepta un monto ya calculado o la configuración de la marca.
  const roundedFee =
    typeof fee === "number" ? roundToCashStep(fee) : computeServiceFee(subtotal, fee);
  // El cliente paga en efectivo: el total tiene que ser múltiplo de 500.
  const total = roundToCashStep(subtotal + roundedFee);

  // La comisión sale del subtotal real, no del redondeo.
  const commissionAmount = Math.round((subtotal * commissionBps) / 10000);
  const netToBrand = subtotal - commissionAmount;
  // Si el redondeo dejó unos guaraníes de más, quedan para la plataforma.
  const roundingDelta = total - subtotal - roundedFee;
  const platformRevenue = commissionAmount + roundedFee + roundingDelta;
  const serviceFeeFinal = roundedFee + roundingDelta;
  return {
    subtotal,
    serviceFee: serviceFeeFinal,
    total,
    commissionBps,
    commissionAmount,
    netToBrand,
    platformRevenue,
    effectiveTakeRate: total > 0 ? platformRevenue / total : 0,
  };
}

/**
 * Cómo se cobra la comisión según el medio de pago.
 *
 * - transferencia: el dinero entra a la cuenta de AquaGo, se retiene la
 *   comisión y se transfiere el neto a la marca. Cobro 100 % automático.
 * - efectivo: la marca cobra en la puerta, así que la comisión queda como
 *   deuda en su cuenta corriente y se liquida al cierre del período.
 */
export function collectionModeFor(paymentMethod: string): "retenida" | "por_cobrar" {
  return paymentMethod === "transferencia" ? "retenida" : "por_cobrar";
}

/** Días de cada ciclo de facturación. */
export const CYCLE_DAYS: Record<string, number> = {
  semanal: 7,
  quincenal: 15,
  mensual: 30,
};

export function cycleDays(cycle: string): number {
  return CYCLE_DAYS[cycle] ?? 7;
}

/** Plazo para pagar una liquidación antes de caer en mora. */
export const SETTLEMENT_GRACE_DAYS = 3;

/** Días de mora tras el vencimiento antes de sacar la marca de la app. */
export const SUSPEND_AFTER_DAYS = 5;

export function newSettlementCode(brandSlug: string, date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const r = Math.floor(Math.random() * 900 + 100);
  return `LIQ-${brandSlug.slice(0, 4).toUpperCase()}-${y}${m}${d}-${r}`;
}

/**
 * Simulador usado por la página de negocio y el panel:
 * proyecta ingresos mensuales de la plataforma.
 */
export interface Projection {
  ordersPerMonth: number;
  avgTicket: number;
  grossVolume: number;
  commissionRevenue: number;
  serviceFeeRevenue: number;
  monthlyFeeRevenue: number;
  platformRevenue: number;
  brandRevenue: number;
  customerPays: number;
  takeRate: number;
}

export function projectMonth(
  brandsCount: number,
  ordersPerBrandPerDay: number,
  avgTicket: number,
  plan: Plan
): Projection {
  const ordersPerMonth = Math.round(brandsCount * ordersPerBrandPerDay * 30);
  const grossVolume = ordersPerMonth * avgTicket;
  const commissionRevenue = Math.round((grossVolume * plan.commissionBps) / 10000);
  const serviceFeeRevenue =
    ordersPerMonth * computeServiceFee(avgTicket, {
      serviceFeeBps: plan.serviceFeeBps,
      serviceFeeMin: plan.serviceFeeMin,
      serviceFee: 0,
    });
  const monthlyFeeRevenue = brandsCount * plan.monthlyFee;
  const platformRevenue = commissionRevenue + serviceFeeRevenue + monthlyFeeRevenue;
  const customerPays = grossVolume + serviceFeeRevenue;
  return {
    ordersPerMonth,
    avgTicket,
    grossVolume,
    commissionRevenue,
    serviceFeeRevenue,
    monthlyFeeRevenue,
    platformRevenue,
    brandRevenue: grossVolume - commissionRevenue,
    customerPays,
    takeRate: customerPays > 0 ? platformRevenue / customerPays : 0,
  };
}
