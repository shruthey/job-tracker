import type { ApplicationStatus } from "@/db/schema";
import { STATUS_LABELS, statusBadgeStyle } from "@/lib/format";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={statusBadgeStyle(status)}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
