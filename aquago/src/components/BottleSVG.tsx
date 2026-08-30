export default function BottleSVG({ className = "h-56" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 190" fill="none" className={className} aria-hidden>
      {/* tapa */}
      <rect x="46" y="4" width="48" height="16" rx="5" fill="#145a6e" />
      <rect x="52" y="2" width="36" height="8" rx="4" fill="#123e4d" />
      {/* cuello */}
      <path d="M50 20 h40 v10 c0 8 22 14 22 34 v104 c0 12 -10 22 -22 22 H50 c-12 0 -22 -10 -22 -22 V64 c0 -20 22 -26 22 -34 Z" fill="#d9edf0" stroke="#7cc4d2" strokeWidth="2.5" />
      {/* agua */}
      <path d="M30 78 c8 -7 16 7 24 0 s16 -7 24 0 16 7 24 0 8 7 8 7 v73 c0 12 -10 22 -22 22 H50 c-12 0 -22 -10 -22 -22 Z" fill="#44a3b8" opacity="0.55" />
      {/* etiqueta */}
      <rect x="40" y="88" width="60" height="52" rx="8" fill="#ffffff" stroke="#b2dee4" strokeWidth="2" />
      <text x="70" y="112" textAnchor="middle" fontFamily="Sora, sans-serif" fontWeight="700" fontSize="18" fill="#145a6e">
        20 L
      </text>
      <text x="70" y="128" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="9" fill="#44606d">
        AGUAYA · MINERAL
      </text>
      {/* brillo */}
      <path d="M38 48 v96" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
