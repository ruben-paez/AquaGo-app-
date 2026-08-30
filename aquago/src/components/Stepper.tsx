"use client";

import { IconMinus, IconPlus } from "./icons";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export default function Stepper({ value, onChange, min = 0, max = 20 }: StepperProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-ink/15 bg-white">
      <button
        type="button"
        aria-label="Quitar uno"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="grid h-9 w-9 place-items-center rounded-l-lg text-ink-soft transition hover:bg-water-50 hover:text-water-700 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <IconMinus />
      </button>
      <span className="w-8 text-center font-display text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Agregar uno"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="grid h-9 w-9 place-items-center rounded-r-lg text-ink-soft transition hover:bg-water-50 hover:text-water-700"
      >
        <IconPlus />
      </button>
    </div>
  );
}
