import type { Sponsorship } from "@/db/schema";
import { SPONSORSHIP_LABELS, SPONSORSHIP_STYLES } from "@/lib/format";

/**
 * Renders nothing when the posting never said, which is the common case —
 * callers pass the column straight through without guarding. A blank here
 * means "unknown", and showing a chip for it would turn silence into a claim.
 */
export function SponsorshipBadge({
  sponsorship,
  className = "",
}: {
  sponsorship: Sponsorship | null;
  className?: string;
}) {
  if (!sponsorship) return null;

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${SPONSORSHIP_STYLES[sponsorship]} ${className}`}
    >
      {SPONSORSHIP_LABELS[sponsorship]}
    </span>
  );
}
