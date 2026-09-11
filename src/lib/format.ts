import type { ApplicationStatus, ApplicationTag, Sponsorship } from "@/db/schema";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  screen: "Screen",
  interview: "Interview",
  onsite: "Onsite",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  ghosted: "Ghosted",
};

/** Tailwind classes per status. Kept together so the board and list agree. */
export const STATUS_STYLES: Record<ApplicationStatus, string> = {
  saved: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  applied: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  screen: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  interview: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  onsite: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  offer: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  withdrawn: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  ghosted: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
};

/**
 * The column chrome on the board — surface, border, and the rail that runs
 * down each company group. Separate from STATUS_STYLES because a badge sits on
 * a card and needs contrast, while a column is a large field behind cards and
 * has to stay quiet enough for white cards to read as raised above it.
 */
export const STATUS_COLUMN_STYLES: Record<ApplicationStatus, string> = {
  saved: "border-zinc-200 bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/50",
  applied: "border-blue-200 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/25",
  screen: "border-cyan-200 bg-cyan-50/70 dark:border-cyan-900/60 dark:bg-cyan-950/25",
  interview:
    "border-violet-200 bg-violet-50/70 dark:border-violet-900/60 dark:bg-violet-950/25",
  onsite: "border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/25",
  offer:
    "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/25",
  rejected: "border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20",
  withdrawn: "border-zinc-200 bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/50",
  ghosted:
    "border-orange-200 bg-orange-50/60 dark:border-orange-900/60 dark:bg-orange-950/20",
};

/** The same hues at drop-target strength, for the column being dragged over. */
export const STATUS_COLUMN_OVER_STYLES: Record<ApplicationStatus, string> = {
  saved: "border-zinc-400 bg-zinc-200/80 dark:border-zinc-500 dark:bg-zinc-800",
  applied: "border-blue-400 bg-blue-100/80 dark:border-blue-600 dark:bg-blue-950/60",
  screen: "border-cyan-400 bg-cyan-100/80 dark:border-cyan-600 dark:bg-cyan-950/60",
  interview:
    "border-violet-400 bg-violet-100/80 dark:border-violet-600 dark:bg-violet-950/60",
  onsite: "border-amber-400 bg-amber-100/80 dark:border-amber-600 dark:bg-amber-950/60",
  offer:
    "border-emerald-400 bg-emerald-100/80 dark:border-emerald-600 dark:bg-emerald-950/60",
  rejected: "border-rose-400 bg-rose-100/80 dark:border-rose-600 dark:bg-rose-950/60",
  withdrawn: "border-zinc-400 bg-zinc-200/80 dark:border-zinc-500 dark:bg-zinc-800",
  ghosted:
    "border-orange-400 bg-orange-100/80 dark:border-orange-600 dark:bg-orange-950/60",
};

/**
 * The left rail and header bar on a company group, tinted to its column so a
 * group reads as belonging to the stage around it.
 */
export const STATUS_RAIL_STYLES: Record<ApplicationStatus, string> = {
  saved: "border-zinc-400 dark:border-zinc-600",
  applied: "border-blue-400 dark:border-blue-600",
  screen: "border-cyan-400 dark:border-cyan-600",
  interview: "border-violet-400 dark:border-violet-600",
  onsite: "border-amber-400 dark:border-amber-600",
  offer: "border-emerald-400 dark:border-emerald-600",
  rejected: "border-rose-400 dark:border-rose-600",
  withdrawn: "border-zinc-400 dark:border-zinc-600",
  ghosted: "border-orange-400 dark:border-orange-600",
};

/**
 * A single dot in the status hue, for places that need the colour without the
 * weight of a full badge — menu rows, legends, a table's leading marker.
 */
export const STATUS_DOT_STYLES: Record<ApplicationStatus, string> = {
  saved: "bg-zinc-400",
  applied: "bg-blue-500",
  screen: "bg-cyan-500",
  interview: "bg-violet-500",
  onsite: "bg-amber-500",
  offer: "bg-emerald-500",
  rejected: "bg-rose-500",
  withdrawn: "bg-zinc-500",
  ghosted: "bg-orange-500",
};

/**
 * The card's left edge, in its column's hue. A card sits on a tinted column
 * and was previously white-on-near-white from every angle; this gives each
 * tile one saturated edge so it has a defined boundary at rest, without
 * tinting the whole surface and hurting the text contrast on top of it.
 */
export const STATUS_CARD_EDGE_STYLES: Record<ApplicationStatus, string> = {
  saved: "border-l-zinc-400 dark:border-l-zinc-500",
  applied: "border-l-blue-500 dark:border-l-blue-400",
  screen: "border-l-cyan-500 dark:border-l-cyan-400",
  interview: "border-l-violet-500 dark:border-l-violet-400",
  onsite: "border-l-amber-500 dark:border-l-amber-400",
  offer: "border-l-emerald-500 dark:border-l-emerald-400",
  rejected: "border-l-rose-500 dark:border-l-rose-400",
  withdrawn: "border-l-zinc-400 dark:border-l-zinc-500",
  ghosted: "border-l-orange-500 dark:border-l-orange-400",
};

/** Solid fills for charts, one per status, matching the badge hues above. */
export const STATUS_CHART_COLORS: Record<ApplicationStatus, string> = {
  saved: "#a1a1aa",
  applied: "#3b82f6",
  screen: "#06b6d4",
  interview: "#8b5cf6",
  onsite: "#f59e0b",
  offer: "#10b981",
  rejected: "#f43f5e",
  withdrawn: "#71717a",
  ghosted: "#fb923c",
};

export const TAG_LABELS: Record<ApplicationTag, string> = {
  need_referral: "Need Referral",
  referral_requested: "Referral Requested",
  referral_given: "Referral Given",
  recruiter_reachout: "Recruiter Reachout",
  online_assessment: "Online Assessment",
  take_home: "Take-home",
  screening_call: "Screening Call",
  tech_screen: "Tech Screen",
  system_design: "System Design",
  panel_round: "Panel Round",
  offer_negotiation: "Offer Negotiation",
  needs_follow_up: "Needs Follow-up",
};

/**
 * Deliberately quieter than STATUS_STYLES — a card shows one status badge and
 * can show several tags, so tags read as secondary and don't compete with it.
 */
export const TAG_STYLES: Record<ApplicationTag, string> = {
  // One step lighter than referral_requested: same family, but reads as the
  // not-yet-actioned one of the three.
  need_referral: "bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400",
  referral_requested:
    "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  referral_given:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  recruiter_reachout: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  online_assessment:
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  take_home: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  screening_call: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  tech_screen: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  system_design: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  panel_round: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  offer_negotiation:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  needs_follow_up: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

/**
 * Worded as the posting's requirement, not as a category name — "No
 * sponsorship" tells you what to do about it, "None" does not.
 */
export const SPONSORSHIP_LABELS: Record<Sponsorship, string> = {
  will_sponsor: "Will sponsor",
  no_sponsorship: "No sponsorship",
  citizen: "Citizens only",
  green_card: "Green card only",
  clearance: "Security clearance",
};

/**
 * Green for the one that opens a door, rose for the ones that close it. The
 * three restrictive values share a family because the practical consequence is
 * the same — you need status you may not have.
 */
export const SPONSORSHIP_STYLES: Record<Sponsorship, string> = {
  will_sponsor:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  no_sponsorship: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  citizen: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  green_card: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  clearance: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

export const INTERVIEW_FORMAT_LABELS: Record<string, string> = {
  phone: "Phone",
  video: "Video",
  onsite: "Onsite",
  take_home: "Take-home",
};

/**
 * Date *and* time — an interview at 2pm is a different thing from one at 9am,
 * which `formatDate` alone would hide.
 */
export function formatDateTime(value: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min === null && max === null) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency ?? "USD",
      maximumFractionDigits: 0,
      notation: n >= 10000 ? "compact" : "standard",
    }).format(n);

  if (min !== null && max !== null) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max) as number);
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function relativeDays(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);

  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}
