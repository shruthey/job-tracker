import Link from "next/link";

import { dismissReminder } from "@/lib/actions";
import { listDueReminders } from "@/lib/queries";
import { findStaleApplications, DEFAULT_STALE_DAYS } from "@/lib/reminders";
import { formatDate, relativeDays } from "@/lib/format";
import { SweepButton } from "@/components/sweep-button";

/**
 * Reads live database state on every request, so it must never be prerendered
 * into a build-time snapshot.
 */
export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const [due, stale] = await Promise.all([
    listDueReminders(),
    findStaleApplications(DEFAULT_STALE_DAYS),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-muted">
            Reminders
          </h1>
          <p className="mt-1 text-sm text-muted dark:text-muted">
            Applications with no movement in {DEFAULT_STALE_DAYS} days.
          </p>
        </div>
        <SweepButton />
      </div>

      <section className="rounded-xl border border-chrome bg-surface p-5 shadow-sm dark:border-chrome dark:bg-chrome">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink dark:text-muted">
          Due now
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
              due.length > 0
                ? "bg-attn/20 text-ink dark:bg-attn/20 dark:text-ink"
                : "bg-ground text-muted dark:bg-chrome dark:text-muted"
            }`}
          >
            {due.length}
          </span>
        </h2>
        {due.length === 0 ? (
          <p className="text-sm text-muted dark:text-muted">
            Nothing due.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {due.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-attn bg-attn/60 px-3 py-2 transition-colors hover:bg-attn dark:border-attn/70 dark:bg-attn/25 dark:hover:bg-attn/40"
              >
                <div className="min-w-0">
                  <Link
                    href={`/applications/${r.applicationId}`}
                    className="text-sm font-medium text-ink hover:underline dark:text-muted"
                  >
                    {r.title} · {r.companyName}
                  </Link>
                  <p className="text-xs text-muted dark:text-muted">
                    {r.message ?? r.kind} · due {formatDate(r.dueAt)}
                  </p>
                </div>
                <form action={dismissReminder.bind(null, r.id)}>
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg border border-attn bg-surface px-2.5 py-1 text-xs font-medium text-attn transition-colors hover:bg-attn/20 dark:border-attn dark:bg-chrome dark:text-ink dark:hover:bg-attn"
                  >
                    Dismiss
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-chrome bg-surface p-5 shadow-sm dark:border-chrome dark:bg-chrome">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink dark:text-muted">
          Going quiet
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
              stale.length > 0
                ? "bg-warn/20 text-ink dark:bg-warn/20 dark:text-ink"
                : "bg-ground text-muted dark:bg-chrome dark:text-muted"
            }`}
          >
            {stale.length}
          </span>
        </h2>
        {stale.length === 0 ? (
          <p className="text-sm text-muted dark:text-muted">
            Every open application has moved recently.
          </p>
        ) : (
          <ul className="divide-y divide-chrome dark:divide-chrome">
            {stale.map((app) => (
              <li key={app.id} className="flex items-center justify-between gap-3 py-2">
                <Link
                  href={`/applications/${app.id}`}
                  className="text-sm text-ink transition-colors hover:text-brand hover:underline dark:text-muted dark:hover:text-brand"
                >
                  {app.title} · {app.companyName}
                </Link>
                {/* The longer the silence, the hotter the stamp. */}
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums ${
                    app.daysSince >= 30
                      ? "bg-warn/20 text-ink dark:bg-warn/20 dark:text-ink"
                      : "bg-attn/20 text-ink dark:bg-attn/20 dark:text-ink"
                  }`}
                >
                  {app.daysSince}d since {relativeDays(app.lastEventAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
