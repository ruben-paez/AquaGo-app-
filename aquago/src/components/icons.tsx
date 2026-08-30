interface IconProps {
  className?: string;
}

export function IconDroplet({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 2.7c3.4 4 7 8 7 11.8a7 7 0 1 1-14 0c0-3.8 3.6-7.8 7-11.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 14.5a3.2 3.2 0 0 0 2.4 3.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconMapPin({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconTruck({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.2v3.3h-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="17.5" r="1.9" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17" cy="17.5" r="1.9" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function IconCash({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 9.8v.01M18 14.2v.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconBank({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3.5 9.5 12 4l8.5 5.5M5 10v7m4.5-7v7m5-7v7M19 10v7M3.5 19.5h17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconClock({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCheck({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="m4.5 12.5 5 5 10-11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconArrowRight({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 12h16m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPhone({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 4h4l1.5 4.5-2.2 1.6a12.5 12.5 0 0 0 5.6 5.6l1.6-2.2L20 15v4a1.8 1.8 0 0 1-2 1.8A16.8 16.8 0 0 1 3.2 6 1.8 1.8 0 0 1 5 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconUser({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconBottle({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M10 2.5h4v3c0 .9 3 2 3 5v9a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-9c0-3 3-4.1 3-5v-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M7.2 12.5h9.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlus({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconMinus({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconLocate({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2.5V6m0 12v3.5M2.5 12H6m12 0h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
