import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  applications,
  companies,
  statusEvents,
  type ApplicationStatus,
} from "@/db/schema";

/** Board columns use sparse integers so a reorder rewrites one row. */
export const BOARD_GAP = 1000;

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|co|gmbh|plc)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type Db = typeof db;
/** A transaction handle, or the pool itself when no transaction is open. */
type Executor = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Find-or-create a company by normalized name. Safe under concurrency: the
 * unique index on `normalized_name` turns a race into an upsert no-op.
 */
export async function upsertCompany(
  tx: Executor,
  name: string,
  extra: { website?: string | null; emailDomain?: string | null } = {},
): Promise<string> {
  const normalizedName = normalizeCompanyName(name);

  const [row] = await tx
    .insert(companies)
    .values({
      name: name.trim(),
      normalizedName,
      website: extra.website ?? null,
      emailDomain: extra.emailDomain ?? null,
    })
    .onConflictDoUpdate({
      target: companies.normalizedName,
      // Only fill in blanks; never clobber a value the user curated by hand.
      set: {
        website: sql`coalesce(${companies.website}, excluded.website)`,
        emailDomain: sql`coalesce(${companies.emailDomain}, excluded.email_domain)`,
      },
    })
    .returning({ id: companies.id });

  return row.id;
}

/**
 * The status invariant.
 *
 * Updates `applications.status` and appends a `status_events` row in one
 * transaction, so the history can never disagree with the current value.
 * Every path that changes status — the board, the edit form, the ghosting
 * sweep, and Phase 2 email ingestion — must go through here.
 *
 * A no-op transition (same status) is not recorded: dragging a card back to
 * the column it came from should not manufacture history.
 */
export async function recordStatusChange(
  applicationId: string,
  toStatus: ApplicationStatus,
  options: {
    source?: "manual" | "email" | "system";
    note?: string;
    occurredAt?: Date;
    boardOrder?: number;
    /** Join an outer transaction instead of opening a new one. */
    tx?: Executor;
  } = {},
): Promise<{ changed: boolean; fromStatus: ApplicationStatus | null }> {
  const { source = "manual", note, occurredAt, boardOrder, tx } = options;

  const run = async (exec: Executor) => {
    const [current] = await exec
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .for("update");

    if (!current) {
      throw new Error(`Application ${applicationId} not found`);
    }

    const fromStatus = current.status;
    const changed = fromStatus !== toStatus;

    await exec
      .update(applications)
      .set({
        status: toStatus,
        updatedAt: new Date(),
        ...(boardOrder !== undefined ? { boardOrder } : {}),
        // Stamp the first transition into `applied` as the application date.
        ...(changed && toStatus === "applied"
          ? { appliedAt: sql`coalesce(${applications.appliedAt}, now())` }
          : {}),
      })
      .where(eq(applications.id, applicationId));

    if (changed) {
      await exec.insert(statusEvents).values({
        applicationId,
        fromStatus,
        toStatus,
        source,
        note,
        ...(occurredAt ? { occurredAt } : {}),
      });
    }

    return { changed, fromStatus };
  };

  // `for('update')` needs a transaction to hold the row lock.
  return tx ? run(tx) : db.transaction(run);
}

/**
 * Place a card at the end of a column, leaving a gap for later inserts.
 */
export async function nextBoardOrder(
  exec: Executor,
  status: ApplicationStatus,
): Promise<number> {
  const [row] = await exec
    /**
     * `board_order` is a bigint, and the driver hands bigint aggregates back as
     * strings to avoid precision loss. The cast is what makes this a number —
     * a `sql<number>` generic is only a compile-time claim, and without the
     * cast `+ BOARD_GAP` concatenates ("1000" + 1000 = "10001000") until the
     * value overflows bigint and every insert fails.
     */
    .select({ max: sql<number | null>`max(${applications.boardOrder})::double precision` })
    .from(applications)
    .where(and(eq(applications.status, status), isNull(applications.archivedAt)));

  return Number(row?.max ?? 0) + BOARD_GAP;
}
