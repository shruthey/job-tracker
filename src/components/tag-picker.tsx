"use client";

import { useOptimistic, useTransition } from "react";

import { toggleApplicationTag } from "@/lib/actions";
import {
  isTagAllowed,
  type ApplicationStatus,
  type ApplicationTag,
} from "@/db/schema";
import { STATUS_LABELS, TAG_LABELS, TAG_ORDER, tagChipStyle } from "@/lib/format";

/**
 * Every tag is always visible, so the full vocabulary stays discoverable. Ones
 * that don't apply to the current status are dimmed and disabled rather than
 * hidden — a moving target of available chips is harder to learn than a fixed
 * grid where some are greyed.
 *
 * A tag already applied stays interactive even when the status no longer
 * allows it, so a card dragged backwards can still have stale tags removed.
 */
export function TagPicker({
  applicationId,
  status,
  tags,
}: {
  applicationId: string;
  status: ApplicationStatus;
  tags: ApplicationTag[];
}) {
  const [, startTransition] = useTransition();
  const [optimisticTags, toggleOptimistic] = useOptimistic(
    tags,
    (current: ApplicationTag[], tag: ApplicationTag) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag],
  );

  const selected = new Set(optimisticTags);

  return (
    <div className="flex flex-wrap gap-1.5">
      {TAG_ORDER.map((tag) => {
        const on = selected.has(tag);
        const allowed = isTagAllowed(status, tag);
        // Disabled only when the status forbids it *and* it isn't already on.
        const disabled = !allowed && !on;

        return (
          <button
            key={tag}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            title={
              disabled
                ? `Not typical for ${STATUS_LABELS[status]}`
                : on && !allowed
                  ? `Kept from an earlier stage — click to remove`
                  : undefined
            }
            onClick={() =>
              startTransition(async () => {
                toggleOptimistic(tag);
                await toggleApplicationTag({ applicationId, tag });
              })
            }
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              disabled
                ? "cursor-not-allowed bg-ground text-muted dark:bg-chrome/50 dark:text-ink"
                : on
                  ? allowed
                    ? ""
                    : "opacity-60"
                  : "bg-ground text-muted hover:bg-ground hover:text-muted dark:bg-chrome dark:text-muted dark:hover:bg-chrome dark:hover:text-muted"
            }`}
            style={on && !disabled ? tagChipStyle(tag) : undefined}
          >
            {TAG_LABELS[tag]}
          </button>
        );
      })}
    </div>
  );
}
