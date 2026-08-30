export type OrderStatus =
  | "pendiente"
  | "aceptada"
  | "en_camino"
  | "entregada"
  | "cancelada";

export const ORDER_STATUSES: OrderStatus[] = [
  "pendiente",
  "aceptada",
  "en_camino",
  "entregada",
  "cancelada",
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  aceptada: "Aceptado",
  en_camino: "En camino",
  entregada: "Entregado",
  cancelada: "Cancelado",
};

/** Guaraníes: 12000 -> "12.000 Gs" */
export function formatGs(value: number): string {
  return `${new Intl.NumberFormat("es-PY", {
    maximumFractionDigits: 0,
  }).format(value)} Gs`;
}

/** Versión corta para chips: 12000 -> "12.000" */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(value);
}

export function formatRating(rating: number): string {
  return (rating / 10).toFixed(1);
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

export function timeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-PY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "short",
  });
}

export function newOrderCode(): string {
  const t = Date.now().toString(36).toUpperCase().slice(-4);
  const r = Math.floor(Math.random() * 36 ** 2)
    .toString(36)
    .toUpperCase()
    .padStart(2, "0");
  return `AQG-${t}${r}`;
}

/** Encarnación, Itapúa — Paraguay */
export const ENCARNACION_CENTER: [number, number] = [-27.3306, -55.8667];

/** Billetes típicos en Paraguay para el vuelto */
export const CASH_OPTIONS = [0, 20000, 50000, 100000];
