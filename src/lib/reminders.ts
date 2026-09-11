import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { reminders } from "@/db/schema";
import { recordStatusChange } from "@/lib/applications";

/** How long without any status movement before an application counts as stale. */
export const DEFAULT_STALE_DAYS = 21;

/** Stale for this long with no reply at all — treat it as ghosted. */
export const DEFAULT_GHOST_DAYS = 45;

export type StaleApplication = {
  id: string;
  title: string;
  companyName: string;
  status: string;
  lastEventAt: Date;
  daysSince: number;
};

/**
 * Applications with no status movement in `staleDays`. Phase 1 runs this from a
 * dev route; in Phase 2 an EventBridge rule calls the same function.
 *
 * Terminal statuses are excluded — a rejection does not go stale.
 */
export async function findStaleApplications(
  staleDays = DEFAULT_STALE_DAYS,
): Promise<StaleApplication[]> {
  const rows = await db.execute<{
    id: string;
    title: string;
    company_name: string;
    status: string;
    last_event_at: string;
    days_since: number;
  }>(sql`
    select
      a.id,
      a.title,
      c.name as company_name,
      a.status::text as status,
      max(e.occurred_at) as last_event_at,
      extract(epoch from (now() - max(e.occurred_at))) / 86400.0 as days_since
    from applications a
    join companies c on c.id = a.company_id
    join status_events e on e.application_id = a.id
    where a.archived_at is null
      and a.status not in ('rejected','withdrawn','ghosted')
    group by a.id, a.title, c.name, a.status
    having max(e.occurred_at) < now() - make_interval(days => ${staleDays})
    order by max(e.occurred_at) asc
  `);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    companyName: r.company_name,
    status: r.status,
    lastEventAt: new Date(r.last_event_at),
    daysSince: Math.floor(Number(r.days_since)),
  }));
}

export type SweepResult = {
  stale: number;
  remindersCreated: number;
  ghosted: number;
};

/**
 * Flags stale applications with a reminder, and marks the truly cold ones
 * `ghosted` — through `recordStatusChange`, so the transition is in the history
 * like any other.
 */
export async function checkStaleApplications(options: {
  staleDays?: number;
  ghostDays?: number;
  markGhosted?: boolean;
} = {}): Promise<SweepResult> {
  const {
    staleDays = DEFAULT_STALE_DAYS,
    ghostDays = DEFAULT_GHOST_DAYS,
    markGhosted = true,
  } = options;

  const stale = await findStaleApplications(staleDays);

  let remindersCreated = 0;
  let ghosted = 0;

  for (const app of stale) {
    // An offer that goes quiet still needs chasing, not reclassifying — only
    // pre-offer stages can be ghosted.
    const canGhost = app.status !== "offer";

    if (markGhosted && canGhost && app.daysSince >= ghostDays) {
      await recordStatusChange(app.id, "ghosted", {
        source: "system",
        note: `No activity for ${app.daysSince} days`,
      });
      ghosted++;
      continue;
    }

    // The partial unique index makes a repeated sweep a no-op rather than a
    // pile of duplicate reminders.
    const result = await db
      .insert(reminders)
      .values({
        applicationId: app.id,
        dueAt: new Date(),
        kind: "stale",
        message: `No movement on ${app.title} at ${app.companyName} for ${app.daysSince} days`,
      })
      .onConflictDoNothing()
      .returning({ id: reminders.id });

    if (result.length > 0) remindersCreated++;
  }

  return { stale: stale.length, remindersCreated, ghosted };
}
