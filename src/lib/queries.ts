import "server-only";

import { and, desc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm";

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
  type ApplicationStatus,
  type ApplicationTag,
  type CompanyPipeline,
  type CompanyPriority,
  PROGRESS_ORDER,
} from "@/db/schema";

export type ApplicationFilters = {
  status?: ApplicationStatus;
  company?: string;
  /** Restrict to applications created within this many days. */
  sinceDays?: number;
  q?: string;
  tag?: ApplicationTag;
};

function buildWhere(filters: ApplicationFilters) {
  const clauses = [isNull(applications.archivedAt)];

  if (filters.status) clauses.push(eq(applications.status, filters.status));
  if (filters.company) clauses.push(eq(applications.companyId, filters.company));
  if (filters.sinceDays && Number.isFinite(filters.sinceDays)) {
    // Computed here, not during render, so the page component stays pure.
    clauses.push(
      gte(
        applications.createdAt,
        sql`now() - make_interval(days => ${filters.sinceDays})`,
      ),
    );
  }
  if (filters.tag) {
    // EXISTS rather than a join: a join would multiply rows per matching tag.
    clauses.push(
      sql`exists (
        select 1 from ${applicationTags}
        where "application_tags"."application_id" = "applications"."id"
          and "application_tags"."tag" = ${filters.tag}
      )`,
    );
  }
  if (filters.q) {
    const term = `%${filters.q}%`;
    const match = or(ilike(applications.title, term), ilike(companies.name, term));
    if (match) clauses.push(match);
  }

  return and(...clauses);
}

/**
 * Tags for one application, as a Postgres array aggregated in a subquery.
 * Doing it here rather than joining keeps one row per application — a join
 * against a many-table would duplicate the application row per tag, and every
 * caller would have to regroup.
 *
 * The column names are written out qualified rather than interpolated as
 * Drizzle columns: inside a correlated subquery Drizzle emits them bare, and
 * an unqualified "id" binds to application_tags.id instead of applications.id,
 * so the correlation silently matches nothing and every row comes back "{}".
 * The ::text cast keeps the driver from handing back an enum array it decodes
 * as a string.
 */
const tagsColumn = sql<ApplicationTag[]>`coalesce(
  (
    select array_agg("application_tags"."tag"::text order by "application_tags"."created_at")
    from ${applicationTags}
    where "application_tags"."application_id" = "applications"."id"
  ),
  '{}'
)`;

/**
 * The company's contact names, for the hover panel on the board and the
 * applications list. Correlated on the application's company, and written with
 * qualified column names for the same reason as `tagsColumn` above.
 *
 * Read-only everywhere it is used: contacts are added on the Companies page.
 */
const contactsColumn = sql<string[]>`coalesce(
  (
    select array_agg("contacts"."name" order by "contacts"."created_at")
    from ${contacts}
    where "contacts"."company_id" = "applications"."company_id"
  ),
  '{}'
)`;

/** The soonest interview still in the future, for the "Interview Scheduled" chip. */
const nextInterviewColumn = sql<Date | null>`(
  select min("interviews"."scheduled_at")
  from ${interviews}
  where "interviews"."application_id" = "applications"."id"
    and "interviews"."scheduled_at" >= now()
)`;

export async function listApplications(filters: ApplicationFilters = {}) {
  return db
    .select({
      id: applications.id,
      title: applications.title,
      status: applications.status,
      source: applications.source,
      location: applications.location,
      remoteType: applications.remoteType,
      sponsorship: applications.sponsorship,
      salaryMin: applications.salaryMin,
      salaryMax: applications.salaryMax,
      currency: applications.currency,
      jobUrl: applications.jobUrl,
      appliedAt: applications.appliedAt,
      createdAt: applications.createdAt,
      updatedAt: applications.updatedAt,
      boardOrder: applications.boardOrder,
      companyId: companies.id,
      companyName: companies.name,
      tags: tagsColumn,
      nextInterviewAt: nextInterviewColumn,
      contacts: contactsColumn,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .where(buildWhere(filters))
    .orderBy(desc(applications.updatedAt));
}

export type ApplicationRow = Awaited<ReturnType<typeof listApplications>>[number];

/** Every non-archived application, grouped into board columns. */
export async function listBoard() {
  const rows = await db
    .select({
      id: applications.id,
      title: applications.title,
      status: applications.status,
      boardOrder: applications.boardOrder,
      location: applications.location,
      remoteType: applications.remoteType,
      sponsorship: applications.sponsorship,
      salaryMin: applications.salaryMin,
      salaryMax: applications.salaryMax,
      currency: applications.currency,
      jobUrl: applications.jobUrl,
      companyName: companies.name,
      updatedAt: applications.updatedAt,
      tags: tagsColumn,
      nextInterviewAt: nextInterviewColumn,
      contacts: contactsColumn,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .where(isNull(applications.archivedAt))
    .orderBy(companies.name, applications.title);

  return rows;
}

export type BoardCard = Awaited<ReturnType<typeof listBoard>>[number];

export async function getApplication(id: string) {
  const [row] = await db
    .select({
      id: applications.id,
      title: applications.title,
      status: applications.status,
      source: applications.source,
      jobUrl: applications.jobUrl,
      location: applications.location,
      remoteType: applications.remoteType,
      sponsorship: applications.sponsorship,
      salaryMin: applications.salaryMin,
      salaryMax: applications.salaryMax,
      currency: applications.currency,
      appliedAt: applications.appliedAt,
      notes: applications.notes,
      jdRaw: applications.jdRaw,
      jdParsed: applications.jdParsed,
      createdAt: applications.createdAt,
      companyId: companies.id,
      companyName: companies.name,
      companyWebsite: companies.website,
      tags: tagsColumn,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .where(eq(applications.id, id));

  return row ?? null;
}

export async function getStatusHistory(applicationId: string) {
  return db
    .select()
    .from(statusEvents)
    .where(eq(statusEvents.applicationId, applicationId))
    .orderBy(desc(statusEvents.occurredAt));
}

export async function listDocuments(applicationId: string) {
  return db
    .select()
    .from(documents)
    .where(eq(documents.applicationId, applicationId))
    .orderBy(desc(documents.createdAt));
}

export async function listInterviews(applicationId: string) {
  const rows = await db
    .select()
    .from(interviews)
    .where(eq(interviews.applicationId, applicationId))
    .orderBy(interviews.scheduledAt);

  // Decided here rather than in the client component: reading the clock during
  // render is impure, and a server/client split would mismatch the HTML.
  const now = Date.now();
  return rows.map((row) => ({
    ...row,
    isPast: new Date(row.scheduledAt).getTime() < now,
  }));
}

/**
 * Every company with its application roll-up, for the companies page.
 *
 * `furthestStatus` is the most advanced stage any application at this company
 * reached, taken from status_events rather than the current status: an
 * application now marked "rejected" still tells you that you got to onsite.
 * The ordinal comes from PROGRESS_ORDER so the comparison is by progress, not
 * by the enum's declaration order. That list rather than FUNNEL_ORDER, because
 * a requested referral is further along than `saved` and should read that way
 * here, even though it is not a conversion step on the funnel chart.
 */
export async function listCompanyOverview() {
  const funnelRank = PROGRESS_ORDER.map(
    (s, i) => `when '${s}' then ${i}`,
  ).join(" ");

  const rows = await db.execute<{
    id: string;
    name: string;
    website: string | null;
    notes: string | null;
    pipeline: CompanyPipeline | null;
    priority: CompanyPriority | null;
    application_count: number;
    active_count: number;
    furthest_status: ApplicationStatus | null;
    last_activity: Date | null;
    contacts: { id: string; name: string }[] | null;
  }>(sql`
    select
      c.id,
      c.name,
      c.website,
      c.notes,
      c.pipeline,
      c.priority,
      count(a.id)::int as application_count,
      count(a.id) filter (
        where a.archived_at is null
          and a.status not in ('rejected', 'withdrawn', 'ghosted')
      )::int as active_count,
      (
        select e.to_status
        from status_events e
        join applications a2 on a2.id = e.application_id
        where a2.company_id = c.id
        order by case e.to_status ${sql.raw(funnelRank)} else -1 end desc
        limit 1
      ) as furthest_status,
      max(a.updated_at) as last_activity,
      -- Aggregated in a subquery rather than a join, so the contact rows
      -- cannot multiply the application counts above.
      (
        select coalesce(
          json_agg(json_build_object('id', ct.id, 'name', ct.name)
                   order by ct.created_at),
          '[]'::json
        )
        from contacts ct
        where ct.company_id = c.id
      ) as contacts
    from companies c
    left join applications a
      on a.company_id = c.id and a.archived_at is null
    group by c.id, c.name, c.website, c.notes, c.pipeline, c.priority
    order by c.name
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    website: r.website,
    notes: r.notes,
    pipeline: r.pipeline,
    priority: r.priority,
    applicationCount: Number(r.application_count),
    activeCount: Number(r.active_count),
    furthestStatus: r.furthest_status,
    lastActivity: r.last_activity,
    contacts: r.contacts ?? [],
  }));
}

export type CompanyOverview = Awaited<
  ReturnType<typeof listCompanyOverview>
>[number];

export async function listCompanies() {
  return db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .orderBy(companies.name);
}

/** Open reminders that are due, newest first. */
export async function listDueReminders() {
  return db
    .select({
      id: reminders.id,
      dueAt: reminders.dueAt,
      kind: reminders.kind,
      message: reminders.message,
      applicationId: reminders.applicationId,
      title: applications.title,
      companyName: companies.name,
    })
    .from(reminders)
    .innerJoin(applications, eq(reminders.applicationId, applications.id))
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .where(
      and(
        isNull(reminders.dismissedAt),
        sql`${reminders.dueAt} <= now()`,
        isNull(applications.archivedAt),
      ),
    )
    .orderBy(desc(reminders.dueAt));
}
