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
