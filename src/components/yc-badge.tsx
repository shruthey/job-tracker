import { ycChipStyle } from "@/lib/format";

/**
 * Renders nothing unless the application is marked as a Y Combinator company,
 * so callers pass the column straight through without guarding — the same
 * contract as `SponsorshipBadge`.
 *
 * "YC" rather than the full name: the badge sits on a board card beside the
 * sponsorship chip and the tags, where the two letters are as recognizable as
 * the words and cost a fraction of the width.
 */
export function YcBadge({
  isYCombinator,
  className = "",
}: {
  isYCombinator: boolean;
  className?: string;
}) {
  if (!isYCombinator) return null;

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${className}`}
      style={ycChipStyle()}
      title="Y Combinator company"
    >
      YC
    </span>
  );
}
