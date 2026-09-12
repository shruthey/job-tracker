import type { CSSProperties } from "react";

import type {
  ApplicationStatus,
  ApplicationTag,
  Sponsorship,
} from "@/db/schema";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  referral_requested: "Referral Requested",
  referral_given: "Referral Given",
  applied: "Applied",
  screen: "Screen",
  interview: "Interview",
  onsite: "Onsite",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  ghosted: "Ghosted",
};

/*
 * The app has five colours and no lighter or darker steps of them, so a status
 * cannot be given a shade of its own. Two devices carry the nine statuses
 * instead:
 *
 *   hue       which of the five it is — brand for the live funnel, attn for an
 *             offer, warn for an ending, chrome for the inert states
 *   strength  how much of that hue is mixed with the page behind it, which is
 *             what separates the four funnel stages from each other
 *
 * These are inline styles rather than Tailwind classes on purpose: the values
 * are computed per status, and Tailwind only emits utilities whose class names
 * it can read literally in the source. A class built by string interpolation
 * would scan as nothing and compile to nothing.
 *
 * Mixing toward `--ground` rather than using alpha keeps every chip opaque, so
 * a badge on a tinted board column is not doubly tinted by what is behind it.
 * All of it is expressed in `var()`, so both themes and any palette change are
 * picked up without a second table.
 */
const mix = (color: string, pct: number) =>
  `color-mix(in oklab, var(${color}) ${pct}%, var(--ground))`;

/**
 * A chip's fill. The percentage is a *relative* strength — where this status
 * sits between the weakest and strongest chip — not an absolute amount of
 * hue, because the two themes need different absolute ranges: on a pale page
 * a 20% tint already carries dark text, while on a dark page the same tint is
 * a mid-tone nothing reads against. `--chip-floor` and `--chip-span` set that
 * range per theme, so one table of strengths drives both.
 */
const chipFill = (color: string, strength: number) =>
  `color-mix(in oklab, var(${color}) ` +
  `calc(var(--chip-floor) + ${strength / 100} * var(--chip-span)), var(--chip-base))`;

/**
 * Text for a chip. Chips built from `--chrome` need their own value: chrome is
 * the one palette colour that is pale in one theme and dark in the other, so
 * its chip lands on the opposite side of the light/dark split from the rest.
 */
const chipText = (color: string) =>
  color === "--color-chrome" ? "var(--on-chrome-tint)" : "var(--on-tint)";

/** Per status: which of the five hues it takes, and how strong the fill is. */
const STATUS_HUE: Record<
  ApplicationStatus,
  { color: string; strength: number }
> = {
  saved: { color: "--color-chrome", strength: 45 },
  referral_requested: { color: "--color-brand", strength: 12 },
  referral_given: { color: "--color-brand", strength: 24 },
  applied: { color: "--color-brand", strength: 36 },
  screen: { color: "--color-brand", strength: 48 },
  interview: { color: "--color-brand", strength: 60 },
  onsite: { color: "--color-brand", strength: 72 },
  offer: { color: "--color-attn", strength: 70 },
  rejected: { color: "--color-warn", strength: 45 },
  withdrawn: { color: "--color-chrome", strength: 70 },
  ghosted: { color: "--color-warn", strength: 22 },
};

/**
 * The badge on a card or table row. Text is always `--ink`: a tinted chip has
 * no darker shade of its own hue to put text in, and `--ink` is the one value
 * guaranteed to read against all five.
 */
export function statusBadgeStyle(status: ApplicationStatus): CSSProperties {
  const { color, strength } = STATUS_HUE[status];
  return { backgroundColor: chipFill(color, strength), color: chipText(color) };
}

/**
 * The column chrome on the board. Far weaker than the badge because a column
 * is a large field behind cards and has to stay quiet enough for cards to read
 * as raised above it; the border is the same hue at roughly triple strength so
 * the column still has a defined edge.
 */
export function statusColumnStyle(
  status: ApplicationStatus,
  isOver: boolean,
): CSSProperties {
  const { color, strength } = STATUS_HUE[status];
  const fill = Math.round(strength * (isOver ? 0.55 : 0.22));
  return {
    backgroundColor: mix(color, fill),
    borderColor: mix(color, Math.min(fill * 3, 60)),
  };
}

/**
 * A line in the status hue — the rail down a company group, and the card's
 * left edge. Lines are thin, so they take the hue at close to full strength
 * where a field would be far too loud.
 */
export function statusLineStyle(status: ApplicationStatus): CSSProperties {
  const { color, strength } = STATUS_HUE[status];
  return { borderColor: mix(color, Math.min(strength + 30, 100)) };
}

/**
 * A single dot in the status hue, for places that need the colour without the
 * weight of a full badge — menu rows, legends, a table's leading marker.
 */
export function statusDotStyle(status: ApplicationStatus): CSSProperties {
  const { color, strength } = STATUS_HUE[status];
  return { backgroundColor: mix(color, Math.min(strength + 30, 100)) };
}

/**
 * Fills for charts. Same two devices as the badges, at full strength since a
 * bar carries no text: the hue says which kind of state it is, the strength
 * separates the funnel stages so the funnel reads as deepening left to right.
 */
export const STATUS_CHART_COLORS: Record<ApplicationStatus, string> =
  Object.fromEntries(
    (Object.keys(STATUS_HUE) as ApplicationStatus[]).map((status) => {
      const { color, strength } = STATUS_HUE[status];
      return [status, mix(color, Math.min(strength + 28, 100))];
    }),
  ) as Record<ApplicationStatus, string>;

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  THE TAGS — the only place a tag's label and colour are defined.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * One entry per tag, in the order they appear in pickers and on cards. To
 * recolour a tag, edit its line; to add one, add a line (plus the enum value
 * and migration — see `applicationTag` in the schema); to reorder them, move
 * the line. `TAG_LABELS` and `TAG_ORDER` are derived from this, so nothing
 * else needs a second edit.
 *
 * `color` and `strength` are the same two devices the statuses use: which of
 * the five palette colours the chip takes, and how far between the weakest and
 * strongest chip its fill sits. See `chipFill` above for how strength becomes
 * a colour, and why it is relative rather than an absolute amount of hue.
 *
 * Tags are deliberately quieter than the status badge — a card shows one
 * status but can show several tags, so tags must read as secondary.
 */
export const TAGS = {
  // Attn, at full strength: the tags that are a to-do rather than a record of
  // something that happened, so they are the ones meant to catch the eye.
  // They lead the display order for the same reason.
  need_referral: {
    label: "Need Referral",
    color: "--color-attn",
    strength: 100,
  },
  update_resume: {
    label: "Update Resume",
    color: "--color-attn",
    strength: 100,
  },

  // Brand: the evaluation steps, the earlier of the two the quieter.
  screening_call: {
    label: "Screening Call",
    color: "--color-brand",
    strength: 38,
  },
  online_assessment: {
    label: "Online Assessment",
    color: "--color-brand",
    strength: 50,
  },

  // Attn: both are calls to action, so both sit high.
  offer_negotiation: {
    label: "Offer Negotiation",
    color: "--color-attn",
    strength: 100,
  },
  needs_follow_up: {
    label: "Needs Follow-up",
    color: "--color-warn",
    strength: 75,
  },
} as const satisfies Record<
  ApplicationTag,
  { label: string; color: string; strength: number }
>;

/**
 * Every tag in display order, derived from `TAGS` so the order is the order
 * the entries are written in. Object key order is insertion order for string
 * keys, which is what makes this safe.
 */
export const TAG_ORDER = Object.keys(TAGS) as ApplicationTag[];

export const TAG_LABELS = Object.fromEntries(
  Object.entries(TAGS).map(([tag, { label }]) => [tag, label]),
) as Record<ApplicationTag, string>;

export function tagChipStyle(tag: ApplicationTag): CSSProperties {
  const { color, strength } = TAGS[tag];
  return { backgroundColor: chipFill(color, strength), color: chipText(color) };
}

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
 * Lavender for the one that opens a door, dusty rose for the ones that close
 * it. The three restrictive values share a family because the practical
 * consequence is the same — you need status you may not have.
 */
const SPONSORSHIP_HUE: Record<
  Sponsorship,
  { color: string; strength: number }
> = {
  will_sponsor: { color: "--color-brand", strength: 35 },
  no_sponsorship: { color: "--color-warn", strength: 45 },
  citizen: { color: "--color-warn", strength: 45 },
  green_card: { color: "--color-attn", strength: 55 },
  clearance: { color: "--color-warn", strength: 45 },
};

export function sponsorshipChipStyle(value: Sponsorship): CSSProperties {
  const { color, strength } = SPONSORSHIP_HUE[value];
  return { backgroundColor: chipFill(color, strength), color: chipText(color) };
}
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
