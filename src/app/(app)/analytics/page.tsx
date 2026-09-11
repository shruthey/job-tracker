import {
  getFunnel,
  getResponseRateBySource,
  getTimeInStage,
  getTotals,
  getWeeklyActivity,
} from "@/lib/analytics";
import {
  ActivityChart,
  FunnelChart,
  StageDurationChart,
} from "@/components/analytics-charts";
import { STATUS_DOT_STYLES, STATUS_LABELS } from "@/lib/format";

/**
 * Reads live database state on every request, so it must never be prerendered
 * into a build-time snapshot.
 */
export const dynamic = "force-dynamic";

/**
 * Tile colours by tone rather than by status, because the six totals do not
 * map one-to-one onto board statuses — "Active" and "Interviewing" span
 * several. The accent bar along the top carries the colour; the surface stays
 * white so a row of six tiles does not turn into a row of six coloured slabs.
 */
const STAT_TONES = {
  violet: "from-violet-500 to-indigo-500",
  blue: "from-blue-500 to-sky-500",
  amber: "from-amber-500 to-orange-500",
  emerald: "from-emerald-500 to-teal-500",
  rose: "from-rose-500 to-pink-500",
  zinc: "from-zinc-400 to-zinc-500",
} as const;

const STAT_TEXT = {
  violet: "text-violet-600 dark:text-violet-400",
  blue: "text-blue-600 dark:text-blue-400",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  rose: "text-rose-600 dark:text-rose-400",
  zinc: "text-zinc-500 dark:text-zinc-400",
} as const;

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof STAT_TONES;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${STAT_TONES[tone]}`}
      />
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${STAT_TEXT[tone]}`}
      >
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      {hint ? <p className="mt-0.5 text-xs">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AnalyticsPage() {
  const [totals, funnel, stages, sources, activity] = await Promise.all([
    getTotals(),
    getFunnel(),
    getTimeInStage(),
    getResponseRateBySource(),
    getWeeklyActivity(),
  ]);

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Derived from the status event log, not from current status.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Active" value={totals.active} tone="violet" />
        <Stat label="Applied" value={totals.applied} tone="blue" />
        <Stat label="Interviewing" value={totals.interviewing} tone="amber" />
        <Stat label="Offers" value={totals.offers} tone="emerald" />
        <Stat label="Rejected" value={totals.rejected} tone="rose" />
        <Stat label="Ghosted" value={totals.ghosted} tone="zinc" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Funnel"
          hint="Applications that ever reached each stage, including those that have since moved on."
        >
          <FunnelChart data={funnel} />
          <table className="mt-4 w-full text-xs">
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {funnel.map((stage) => (
                <tr key={stage.status}>
                  <td className="py-1.5 text-zinc-700 dark:text-zinc-300">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 rounded-full ${STATUS_DOT_STYLES[stage.status]}`}
                      />
                      {STATUS_LABELS[stage.status]}
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                    {stage.reached}
                  </td>
                  <td className="w-20 py-1.5 text-right tabular-nums">
                    {stage.conversionFromPrevious === null
                      ? "—"
                      : pct(stage.conversionFromPrevious)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel
          title="Median time in stage"
          hint="Measured between consecutive events. Applications still in a stage are excluded."
        >
          <StageDurationChart data={stages} />
        </Panel>

        <Panel
          title="Response rate by source"
          hint="A rejection counts as a response; silence does not."
        >
          {sources.length === 0 ? (
            <p className="py-12 text-center text-sm">Nothing applied to yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide">
                <tr>
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 text-right font-medium">Applied</th>
                  <th className="pb-2 text-right font-medium">Responded</th>
                  <th className="pb-2 text-right font-medium">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sources.map((s) => (
                  <tr key={s.source}>
                    <td className="py-2 text-zinc-900 dark:text-zinc-100">
                      {s.source}
                    </td>
                    <td className="py-2 text-right tabular-nums">{s.total}</td>
                    <td className="py-2 text-right tabular-nums">{s.responded}</td>
                    <td className="py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                      {pct(s.responseRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Applications submitted" hint="Per week, last six months.">
          <ActivityChart data={activity} />
        </Panel>
      </div>
    </div>
  );
}
