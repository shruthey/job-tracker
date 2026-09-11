import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { FUNNEL_ORDER, type ApplicationStatus } from "@/db/schema";

/**
 * Every figure here is derived from `status_events`, never from the mutable
 * `applications.status` column — that is the whole reason the event log exists.
 */

export type FunnelStage = {
  status: ApplicationStatus;
  reached: number;
  conversionFromPrevious: number | null;
};

/**
 * How many distinct applications ever reached each stage. "Ever reached" is why
 * this counts events rather than current status: an application now sitting in
 * `offer` still passed through `screen`.
 */
export async function getFunnel(): Promise<FunnelStage[]> {
  const rows = await db.execute<{ to_status: ApplicationStatus; reached: number }>(
    sql`
      select to_status, count(distinct application_id)::int as reached
      from status_events
      where to_status = any(${sql.raw(`array[${FUNNEL_ORDER.map((s) => `'${s}'`).join(",")}]::application_status[]`)})
      group by to_status
    `,
  );

  const counts = new Map(rows.map((r) => [r.to_status, Number(r.reached)]));

  return FUNNEL_ORDER.map((status, i) => {
    const reached = counts.get(status) ?? 0;
    const previous = i === 0 ? null : (counts.get(FUNNEL_ORDER[i - 1]) ?? 0);

    return {
      status,
      reached,
      conversionFromPrevious:
        previous === null || previous === 0 ? null : reached / previous,
    };
  });
}

export type StageDuration = {
  status: ApplicationStatus;
  medianDays: number | null;
  samples: number;
};

/**
 * Median days spent in each stage, measured between consecutive events for the
 * same application. Applications still sitting in a stage are excluded — they
 * have no exit event yet, and counting them would bias every number downward.
 */
export async function getTimeInStage(): Promise<StageDuration[]> {
  const rows = await db.execute<{
    status: ApplicationStatus;
    median_days: number | null;
    samples: number;
  }>(sql`
    with spans as (
      select
        to_status as status,
        extract(epoch from (
          lead(occurred_at) over (partition by application_id order by occurred_at)
          - occurred_at
        )) / 86400.0 as days
      from status_events
    )
    select
      status,
      percentile_cont(0.5) within group (order by days)::float as median_days,
      count(days)::int as samples
    from spans
    where days is not null
    group by status
  `);

  const byStatus = new Map(rows.map((r) => [r.status, r]));

  return FUNNEL_ORDER.map((status) => {
    const row = byStatus.get(status);
    return {
      status,
      medianDays: row?.median_days != null ? Number(row.median_days) : null,
      samples: row ? Number(row.samples) : 0,
    };
  });
}

export type SourcePerformance = {
  source: string;
  total: number;
  responded: number;
  responseRate: number;
};

/**
 * Response rate by source. A "response" is any application that reached a stage
 * beyond `applied` — a rejection is still a response; silence is not.
 */
export async function getResponseRateBySource(): Promise<SourcePerformance[]> {
  const rows = await db.execute<{
    source: string;
    total: number;
    responded: number;
  }>(sql`
    select
      coalesce(a.source, 'unspecified') as source,
      count(distinct a.id)::int as total,
      count(distinct a.id) filter (
        where exists (
          select 1 from status_events e
          where e.application_id = a.id
            and e.to_status in ('screen','interview','onsite','offer','rejected')
        )
      )::int as responded
    from applications a
    where a.archived_at is null
      and exists (
        select 1 from status_events e
        where e.application_id = a.id and e.to_status = 'applied'
      )
    group by coalesce(a.source, 'unspecified')
    order by count(distinct a.id) desc
  `);

  return rows.map((r) => {
    const total = Number(r.total);
    const responded = Number(r.responded);
    return {
      source: r.source,
      total,
      responded,
      responseRate: total === 0 ? 0 : responded / total,
    };
  });
}

export type Totals = {
  active: number;
  applied: number;
  interviewing: number;
  offers: number;
  rejected: number;
  ghosted: number;
};

export async function getTotals(): Promise<Totals> {
  const [row] = await db.execute<Totals>(sql`
    select
      count(*) filter (where status not in ('rejected','withdrawn','ghosted'))::int as active,
      count(*) filter (where applied_at is not null)::int as applied,
      count(*) filter (where status in ('screen','interview','onsite'))::int as interviewing,
      count(*) filter (where status = 'offer')::int as offers,
      count(*) filter (where status = 'rejected')::int as rejected,
      count(*) filter (where status = 'ghosted')::int as ghosted
    from applications
    where archived_at is null
  `);

  return {
    active: Number(row?.active ?? 0),
    applied: Number(row?.applied ?? 0),
    interviewing: Number(row?.interviewing ?? 0),
    offers: Number(row?.offers ?? 0),
    rejected: Number(row?.rejected ?? 0),
    ghosted: Number(row?.ghosted ?? 0),
  };
}

/** Applications created per week, for the activity chart. */
export async function getWeeklyActivity(): Promise<
  { week: string; applied: number }[]
> {
  const rows = await db.execute<{ week: string; applied: number }>(sql`
    select
      to_char(date_trunc('week', occurred_at), 'YYYY-MM-DD') as week,
      count(*)::int as applied
    from status_events
    where to_status = 'applied'
      and occurred_at > now() - interval '180 days'
    group by 1
    order by 1
  `);

  return rows.map((r) => ({ week: r.week, applied: Number(r.applied) }));
}
