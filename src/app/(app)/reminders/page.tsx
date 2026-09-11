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
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Reminders
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Applications with no movement in {DEFAULT_STALE_DAYS} days.
          </p>
        </div>
        <SweepButton />
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Due now
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
              due.length > 0
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {due.length}
          </span>
        </h2>
        {due.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nothing due.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {due.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 transition-colors hover:bg-amber-50 dark:border-amber-900/70 dark:bg-amber-950/25 dark:hover:bg-amber-950/40"
              >
                <div className="min-w-0">
                  <Link
                    href={`/applications/${r.applicationId}`}
                    className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {r.title} · {r.companyName}
                  </Link>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {r.message ?? r.kind} · due {formatDate(r.dueAt)}
                  </p>
                </div>
                <form action={dismissReminder.bind(null, r.id)}>
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-zinc-900 dark:text-amber-300 dark:hover:bg-amber-950"
                  >
                    Dismiss
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Going quiet
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
              stale.length > 0
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {stale.length}
          </span>
        </h2>
        {stale.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Every open application has moved recently.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {stale.map((app) => (
              <li key={app.id} className="flex items-center justify-between gap-3 py-2">
                <Link
                  href={`/applications/${app.id}`}
                  className="text-sm text-zinc-900 transition-colors hover:text-violet-700 hover:underline dark:text-zinc-100 dark:hover:text-violet-300"
                >
                  {app.title} · {app.companyName}
                </Link>
                {/* The longer the silence, the hotter the stamp. */}
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums ${
                    app.daysSince >= 30
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
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
