/** Marca de la plataforma: AquaGo */
export function AquaGoLogo({ className = "h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 210 56" className={className} aria-label="AquaGo" role="img">
      <defs>
        <linearGradient id="agDrop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#45a8de" />
          <stop offset="100%" stopColor="#105c88" />
        </linearGradient>
      </defs>
      {/* gota con flecha de delivery */}
      <path
        d="M26 4c6.6 7.8 13 15 13 21.6A13 13 0 1 1 13 25.6C13 19 19.4 11.8 26 4Z"
        fill="url(#agDrop)"
      />
      <path
        d="M19.5 26.5h11m0 0-4-4m4 4-4 4"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="48"
        y="37"
        fontFamily="var(--font-sora), ui-sans-serif, system-ui, sans-serif"
        fontSize="30"
        fontWeight="700"
        letterSpacing="-0.5"
      >
        <tspan fill="#0f4c6e">Aqua</tspan>
        <tspan fill="#1f8dc9">Go</tspan>
      </text>
    </svg>
  );
}

/** Marca proveedora: AQUAnat — Puramente Encarnacena */
export function AquaNatLogo({
  className = "h-14",
  withTagline = true,
}: {
  className?: string;
  withTagline?: boolean;
}) {
  return (
    <svg
      viewBox={withTagline ? "0 0 400 126" : "0 0 250 96"}
      className={className}
      aria-label="AQUAnat, puramente encarnacena"
      role="img"
    >
      <defs>
        <linearGradient id="anWave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#45a8de" />
          <stop offset="100%" stopColor="#1272a8" />
        </linearGradient>
      </defs>
      <text
        x="4"
        y="72"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="74"
        fontWeight="700"
        letterSpacing="-1"
      >
        <tspan fill="#6e828e">AQUA</tspan>
        <tspan fill="#1f8dc9">nat</tspan>
      </text>
      {/* ondas bajo el logotipo, como en la etiqueta */}
      <path
        d="M58 86c14-11 28 9 42-2s26 7 40-3"
        stroke="url(#anWave)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M48 99c16-11 30 8 46-2s28 6 44-4"
        stroke="#a9bcc6"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      {withTagline && (
        <text
          x="152"
          y="118"
          fontFamily="var(--font-manrope), ui-sans-serif, sans-serif"
          fontSize="17"
          fill="#7c8b94"
          letterSpacing="0.2"
          textLength="240"
          lengthAdjust="spacingAndGlyphs"
        >
          Puramente Encarnacena
        </text>
      )}
    </svg>
  );
}

/** Isotipo compacto para chips y avatares de marca */
export function AquaNatMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="23" fill="#ffffff" stroke="#d8eefb" strokeWidth="2" />
      <text
        x="24"
        y="26"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="17"
        fontWeight="700"
        fill="#6e828e"
      >
        AQ
      </text>
      <path
        d="M11 33c6-5 12 4 18-1s7 3 8 1"
        stroke="#1f8dc9"
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Bidón AQUAnat de 20 L (basado en el envase real) */
export function BidonSVG({ className = "h-56" }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 210" className={className} aria-hidden>
      <defs>
        <linearGradient id="bdBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9fd4ee" />
          <stop offset="22%" stopColor="#e8f7fd" />
          <stop offset="55%" stopColor="#bfe4f5" />
          <stop offset="100%" stopColor="#7bbfe0" />
        </linearGradient>
        <linearGradient id="bdCap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5cb4e2" />
          <stop offset="100%" stopColor="#1272a8" />
        </linearGradient>
      </defs>

      {/* tapa */}
      <rect x="55" y="3" width="40" height="15" rx="4" fill="url(#bdCap)" />
      <rect x="60" y="1" width="30" height="7" rx="3" fill="#0f6091" />

      {/* cuerpo del bidón */}
      <path
        d="M62 18h26v8c0 9 26 13 26 36v122c0 12-9 21-21 21H57c-12 0-21-9-21-21V62c0-23 26-27 26-36v-8Z"
        fill="url(#bdBody)"
        stroke="#7bbfe0"
        strokeWidth="2"
      />

      {/* anillos / nervaduras del envase */}
      {[70, 82, 94, 160, 172].map((y) => (
        <path
          key={y}
          d={`M37 ${y}h76`}
          stroke="#ffffff"
          strokeWidth="5"
          opacity="0.65"
          strokeLinecap="round"
        />
      ))}
      {[76, 88, 166].map((y) => (
        <path key={y} d={`M37 ${y}h76`} stroke="#8cc9e6" strokeWidth="1.6" opacity="0.7" />
      ))}

      {/* brillo del envase: va DEBAJO de la etiqueta y se corta antes de ella,
          si no, el trazo blanco lava las letras y se ven transparentes */}
      <path d="M47 40v58" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" opacity="0.55" />
      <path d="M47 158v32" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" opacity="0.55" />
      <path d="M104 60v38" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
      <path d="M104 158v22" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />

      {/* etiqueta */}
      <rect x="32" y="102" width="86" height="52" rx="4" fill="#ffffff" stroke="#9fcde6" strokeWidth="1.5" />
      <text
        x="75"
        y="125"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="20"
        fontWeight="700"
      >
        <tspan fill="#536874">AQUA</tspan>
        <tspan fill="#1272a8">nat</tspan>
      </text>
      <path
        d="M46 132c8-5 16 4 24-1s14 3 22-1"
        stroke="#1272a8"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <text
        x="75"
        y="147"
        textAnchor="middle"
        fontFamily="var(--font-manrope), sans-serif"
        fontSize="8.5"
        fontWeight="700"
        letterSpacing="0.2"
        fill="#3d5563"
      >
        AGUA MINERAL · 20 L
      </text>
    </svg>
  );
}
