import type { ApplicationTag } from "@/db/schema";
import { TAG_LABELS, TAG_STYLES } from "@/lib/format";

export function TagChip({ tag }: { tag: ApplicationTag }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${TAG_STYLES[tag]}`}
    >
      {TAG_LABELS[tag]}
    </span>
  );
}

/**
 * The chips as they appear read-only on a card or table row. Renders nothing
 * for an empty list so callers don't need to guard.
 */
export function TagList({
  tags,
  className = "",
}: {
  tags: ApplicationTag[];
  className?: string;
}) {
  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map((tag) => (
        <TagChip key={tag} tag={tag} />
      ))}
    </div>
  );
}
