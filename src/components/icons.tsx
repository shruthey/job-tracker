/** Arrow leaving a box — the usual "opens elsewhere" affordance. */
export function ExternalLinkIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14 21 3" />
    </svg>
  );
}

/** Right-pointing chevron; rotate it to point down for an expanded section. */
export function ChevronRightIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/** Circled "i" — an information affordance. */
export function InfoIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

/** Calendar page — marks a scheduled date, such as an upcoming interview. */
export function CalendarIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

/**
 * The favicon's mark — a triangle knocked out of a filled disc — redrawn as an
 * inline SVG so it can take the brand gradient. `gradientId` is a prop because
 * an SVG gradient is referenced by document-wide id, so two of these on one
 * page would otherwise collide.
 */
export function BrandMark({
  className = "h-7 w-7",
  gradientId = "brand-mark-gradient",
}: {
  className?: string;
  gradientId?: string;
}) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      {/*
        One path in two parts with `fillRule="evenodd"`, so the triangle is cut
        out of the disc and the page shows through it — the same figure-ground
        relationship the favicon has.
      */}
      <path
        fill={`url(#${gradientId})`}
        fillRule="evenodd"
        d="M16 0a16 16 0 1 1 0 32 16 16 0 0 1 0-32Zm0 8.5L9 21.5h14L16 8.5Z"
      />
    </svg>
  );
}
