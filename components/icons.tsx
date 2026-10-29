/** The handful of icons the store needs, inline so no icon library ships. */
type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
} as const;

export const BagIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M6 7h12l1 13H5L6 7Z" />
    <path d="M9 7a3 3 0 0 1 6 0" />
  </svg>
);

export const PlusIcon = ({ className = "size-4" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = ({ className = "size-4" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5 12h14" />
  </svg>
);

export const TrashIcon = ({ className = "size-4" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);

export const CheckIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m5 12 5 5L20 7" />
  </svg>
);

export const LeafIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" />
    <path d="M5 19 13 11" />
  </svg>
);

export const TruckIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
  </svg>
);

export const CashIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

/** Filled when `filled`, an outline otherwise; the review stars. */
export const StarIcon = ({ className = "size-5", filled = true }: IconProps & { filled?: boolean }) => (
  <svg {...base} fill={filled ? "currentColor" : "none"} strokeWidth={1.5} className={className}>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
  </svg>
);

/** One small line drawing for each season, for the season picker. */
export const SEASON_ICON_PATHS = {
  // Sun in a hot sky
  grishma: ["M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"],
  // Rain cloud
  barsha: ["M7 15a4 4 0 0 1-.6-7.96A5 5 0 0 1 16 7a3.5 3.5 0 0 1 1 6.9", "M8 18l-1 3M12 17l-1 3M16 18l-1 3"],
  // Kash plume on its stem
  sharat: ["M8 22c1-6 3-10 7-14", "M15 8c-1-2-1-4 1-6 1 2 1 4-1 6ZM15 8c2-1 4-1 5 1-2 1-4 0-5-1ZM12.5 12c-1.5-1.5-2-3.5-1-5.5 1.5 1.5 2 3.5 1 5.5ZM12.5 12c2 0 3.5 1 4 3-2 .5-3.5-1-4-3Z"],
  // A bowing ear of paddy
  hemanta: ["M6 22c1-7 4-12 10-15", "M16 7c1.5.5 2.5 2 2.5 3.5M14 9.5c1.5.5 2.5 2 2.5 3.5M12 12.5c1.5.5 2.5 2 2.5 3.5M17 5.5c1-.5 2.5 0 3 1"],
  // Morning fog with a low sun
  sheet: ["M7 11a5 5 0 0 1 10 0", "M3 14h18M5 17.5h14M8 21h8"],
  // Five-petalled shimul
  basanta: ["M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", "M12 10c-2-2-2-5 0-7 2 2 2 5 0 7ZM14 11.5c1-2.6 3.6-4 6.3-3-1 2.6-3.6 4-6.3 3ZM13.2 14c2.8.4 4.7 2.6 4.4 5.4-2.8-.4-4.7-2.6-4.4-5.4ZM10.8 14c.3 2.8-1.6 5-4.4 5.4-.3-2.8 1.6-5 4.4-5.4ZM10 11.5c-2.7 1-5.3-.4-6.3-3 2.7-1 5.3.4 6.3 3Z"],
} as const;

export const SeasonIcon = ({ season, className = "size-5" }: IconProps & { season: keyof typeof SEASON_ICON_PATHS }) => (
  <svg {...base} strokeWidth={1.75} className={className}>
    {SEASON_ICON_PATHS[season].map((d) => (
      <path key={d} d={d} />
    ))}
  </svg>
);

export const UserIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
