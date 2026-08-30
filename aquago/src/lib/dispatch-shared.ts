export type DispatchMode = "cercania" | "equilibrado" | "equitativo";

export const DISPATCH_MODE_LABELS: Record<DispatchMode, string> = {
  cercania: "Prioriza cercanía",
  equilibrado: "Equilibrado (recomendado)",
  equitativo: "Prioriza equidad",
};

/** Cómo se ve cada repartidor en el panel. */
export interface DriverLoad {
  id: number;
  brandId: number;
  name: string;
  phone: string;
  vehicle: string;
  plate: string;
  status: string;
  lat: number | null;
  lng: number | null;
  capacity: number;
  preferredZone: string;
  active: boolean;
  activeOrders: number;
  deliveredToday: number;
  deliveredTotal: number;
}
