import { OrderStatus, STATUS_LABELS } from "@/lib/format";

const STYLES: Record<OrderStatus, { chip: string; dot: string; pulse?: boolean }> = {
  pendiente: { chip: "bg-warn-soft text-warn border-warn/20", dot: "bg-warn", pulse: true },
  aceptada: { chip: "bg-water-100 text-water-700 border-water-300/40", dot: "bg-water-600" },
  en_camino: { chip: "bg-cyan-100 text-cyan-800 border-cyan-300/50", dot: "bg-cyan-600", pulse: true },
  entregada: { chip: "bg-ok-soft text-ok border-ok/25", dot: "bg-ok" },
  cancelada: { chip: "bg-danger-soft text-danger border-danger/25", dot: "bg-danger" },
};

export default function StatusBadge({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  const meta = STYLES[(status as OrderStatus) in STYLES ? (status as OrderStatus) : "pendiente"];
  const s = status as OrderStatus;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${meta.chip} ${
        size === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${meta.pulse ? "animate-pulse-dot" : ""}`} />
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}
