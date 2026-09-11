import type { ApplicationStatus } from "@/db/schema";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/format";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
