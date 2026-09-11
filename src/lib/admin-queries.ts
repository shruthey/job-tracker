import "server-only";

import { desc, getTableColumns, getTableName, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  applicationTags,
  applications,
  companies,
  contacts,
  documents,
  interviews,
  reminders,
  statusEvents,
} from "@/db/schema";

/**
 * The tables the admin viewer can read, in the order they appear in the
 * switcher. An explicit whitelist rather than a lookup by name: the slug
 * arrives from a URL search param, and feeding user input to `sql.raw` as a
 * table name would be an injection hole. Every table here is read through its
 * Drizzle object, so the identifier is never string-built.
 *
 * `orderBy` is the column to sort newest-first on. Most tables have
 * `createdAt`, but `status_events` records when the transition happened and
 * `interviews` is only meaningful by when it is scheduled.
 */
const TABLE_ENTRIES = [
  { slug: "applications", table: applications, orderBy: applications.createdAt },
  { slug: "companies", table: companies, orderBy: companies.createdAt },
  {
    slug: "application_tags",
    table: applicationTags,
    orderBy: applicationTags.createdAt,
  },
  { slug: "status_events", table: statusEvents, orderBy: statusEvents.occurredAt },
  { slug: "interviews", table: interviews, orderBy: interviews.scheduledAt },
  { slug: "documents", table: documents, orderBy: documents.createdAt },
  { slug: "reminders", table: reminders, orderBy: reminders.dueAt },
  { slug: "contacts", table: contacts, orderBy: contacts.createdAt },
] as const satisfies readonly {
  slug: string;
  table: PgTable;
  orderBy: PgColumn;
}[];

export type AdminTableSlug = (typeof TABLE_ENTRIES)[number]["slug"];

export const ADMIN_TABLE_SLUGS = TABLE_ENTRIES.map(
  (entry) => entry.slug,
) as readonly AdminTableSlug[];

const BY_SLUG = new Map<string, (typeof TABLE_ENTRIES)[number]>(
  TABLE_ENTRIES.map((entry) => [entry.slug, entry]),
);

export function isAdminTableSlug(value: unknown): value is AdminTableSlug {
  return typeof value === "string" && BY_SLUG.has(value);
}

/** Default page size, and the ceiling a `limit` search param is clamped to. */
export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 500;

export type AdminTableData = {
  slug: AdminTableSlug;
  /** The real Postgres table name, for the page heading. */
  tableName: string;
  /** Property names in schema order; also the header cells. */
  columns: string[];
  rows: Record<string, unknown>[];
  /** Total rows in the table, so truncation is visible rather than silent. */
  total: number;
  limit: number;
};

/**
 * Unfiltered, unaggregated rows straight from one table — including archived
 * applications, which every other view in the app deliberately hides. That is
 * the point of this page: to show what is actually stored.
 */
export async function getTableData(
  slug: AdminTableSlug,
  limit: number = DEFAULT_LIMIT,
): Promise<AdminTableData> {
  const entry = BY_SLUG.get(slug);
  if (!entry) throw new Error(`Unknown admin table: ${slug}`);

  const safeLimit = Math.min(
    Math.max(Math.trunc(limit) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  const columns = Object.keys(getTableColumns(entry.table));

  const [rows, counted] = await Promise.all([
    db
      .select()
      .from(entry.table as PgTable)
      .orderBy(desc(entry.orderBy))
      .limit(safeLimit),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(entry.table as PgTable),
  ]);

  return {
    slug,
    tableName: getTableName(entry.table),
    columns,
    rows: rows as Record<string, unknown>[],
    total: counted[0]?.count ?? 0,
    limit: safeLimit,
  };
}

/** Row counts for every table, for the switcher badges. */
export async function getTableCounts(): Promise<Record<AdminTableSlug, number>> {
  const results = await Promise.all(
    TABLE_ENTRIES.map(async (entry) => {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(entry.table as PgTable);
      return [entry.slug, row?.count ?? 0] as const;
    }),
  );

  return Object.fromEntries(results) as Record<AdminTableSlug, number>;
}
