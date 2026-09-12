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
import { STATUS_LABELS, statusDotStyle } from "@/lib/format";
import { PageWidth } from "@/components/page";

/**
 * Reads live database state on every request, so it must never be prerendered
 * into a build-time snapshot.
 */
export const dynamic = "force-dynamic";

/**
 * Tile colours by tone rather than by status, because the six totals do not
 * map one-to-one onto board statuses — "Active" and "Interviewing" span
 * several. The accent bar along the top carries the colour; the surface stays
 * near-white so a row of six tiles does not turn into a row of coloured slabs.
 *
 * The tones are keyed by what the tile counts rather than by a hue name: with
 * only five colours in the app the funnel tiles share the lavender ramp and
 * are told apart by weight, so a name like "blue" would no longer describe
 * anything.
 */
const STAT_TONES = {
  active: "from-brand to-brand",
  applied: "from-brand to-brand",
  interviewing: "from-brand to-brand",
  offers: "from-attn to-attn",
  rejected: "from-warn to-warn",
  ghosted: "from-chrome to-chrome",
} as const;

const STAT_TEXT = {
  active: "text-brand dark:text-brand",
  applied: "text-brand dark:text-brand",
  interviewing: "text-brand dark:text-brand",
  offers: "text-attn dark:text-attn",
  rejected: "text-warn dark:text-warn",
  ghosted: "text-muted dark:text-muted",
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
    <div className="relative overflow-hidden rounded-xl border border-chrome bg-surface p-4 shadow-sm dark:border-chrome dark:bg-chrome">
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${STAT_TONES[tone]}`}
      />
      <p className="text-xs font-medium uppercase tracking-wide text-muted dark:text-muted">
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
    <section className="rounded-xl border border-chrome bg-surface p-5 text-muted shadow-sm dark:border-chrome dark:bg-chrome dark:text-muted">
      <h2 className="text-sm font-semibold text-ink dark:text-muted">
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
    <PageWidth>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-muted">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-muted dark:text-muted">
            Derived from the status event log, not from current status.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Active" value={totals.active} tone="active" />
          <Stat label="Applied" value={totals.applied} tone="applied" />
          <Stat label="Interviewing" value={totals.interviewing} tone="interviewing" />
          <Stat label="Offers" value={totals.offers} tone="offers" />
          <Stat label="Rejected" value={totals.rejected} tone="rejected" />
          <Stat label="Ghosted" value={totals.ghosted} tone="ghosted" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title="Funnel"
            hint="Applications that ever reached each stage, including those that have since moved on."
          >
            <FunnelChart data={funnel} />
            <table className="mt-4 w-full text-xs">
              <tbody className="divide-y divide-chrome dark:divide-chrome">
                {funnel.map((stage) => (
                  <tr key={stage.status}>
                    <td className="py-1.5 text-ink dark:text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 rounded-full"
                          style={statusDotStyle(stage.status)}
                        />
                        {STATUS_LABELS[stage.status]}
                      </span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-ink dark:text-muted">
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
                <tbody className="divide-y divide-chrome dark:divide-chrome">
                  {sources.map((s) => (
                    <tr key={s.source}>
                      <td className="py-2 text-ink dark:text-muted">
                        {s.source}
                      </td>
                      <td className="py-2 text-right tabular-nums">{s.total}</td>
                      <td className="py-2 text-right tabular-nums">{s.responded}</td>
                      <td className="py-2 text-right tabular-nums text-ink dark:text-muted">
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
    </PageWidth>
  );
}
