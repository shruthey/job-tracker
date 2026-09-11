import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/**
 * The lifecycle of an application. Order matters: `STATUS_ORDER` below drives
 * both the board columns and the funnel chart, so keep it monotonic.
 */
export const applicationStatus = pgEnum("application_status", [
  "saved",
  "applied",
  "screen",
  "interview",
  "onsite",
  "offer",
  "rejected",
  "withdrawn",
  "ghosted",
]);

export type ApplicationStatus = (typeof applicationStatus.enumValues)[number];

/** Statuses a candidate advances *through*, in order. Terminal states excluded. */
export const FUNNEL_ORDER = [
  "saved",
  "applied",
  "screen",
  "interview",
  "onsite",
  "offer",
] as const satisfies readonly ApplicationStatus[];

/** Every column shown on the board, left to right. */
export const BOARD_ORDER = [
  ...FUNNEL_ORDER,
  "rejected",
  "ghosted",
  "withdrawn",
] as const satisfies readonly ApplicationStatus[];

/** Statuses where the application is over — no reminders, excluded from "active". */
export const TERMINAL_STATUSES = [
  "rejected",
  "withdrawn",
  "ghosted",
] as const satisfies readonly ApplicationStatus[];

export const statusEventSource = pgEnum("status_event_source", [
  "manual",
  "email", // reserved for Phase 2 ingestion; nothing writes this yet
  "system", // the ghosting sweep
]);

export const documentKind = pgEnum("document_kind", ["resume", "cover_letter"]);

/**
 * Milestones that happen *within* a status, so they don't belong on the
 * `application_status` enum. An application sitting in "screen" can have had an
 * online assessment, a recruiter call, and a take-home all at once — status is
 * one value, tags are a set.
 *
 * Fixed vocabulary on purpose: free text turns into "OA" / "oa" / "Online
 * Assessment" as three different tags. Adding one is an enum value plus a
 * migration.
 */
export const applicationTag = pgEnum("application_tag", [
  "online_assessment",
  "screening_call",
  "take_home",
  "tech_screen",
  "referral_requested",
  "referral_given",
  "recruiter_reachout",
  "panel_round",
  "system_design",
  "offer_negotiation",
  "needs_follow_up",
  // Appended, not inserted: `ALTER TYPE ... ADD VALUE` can only append, and
  // source order matching database order keeps `drizzle-kit generate` from
  // reading drift and proposing a destructive type rebuild. Display order is
  // `TAG_ORDER` below, which is independent of this.
  "need_referral",
]);

export type ApplicationTag = (typeof applicationTag.enumValues)[number];

/*
 * Display order, labels, and colours all live in one table — `TAGS` in
 * `@/lib/format`, which `TAG_ORDER` and `TAG_LABELS` are derived from. The
 * enum above is only the stored vocabulary.
 *
 * The three referral tags lead there and share a colour family because they
 * are a progression: `need_referral` is "this role wants one and I haven't
 * asked anyone yet", `referral_requested` is "I asked", `referral_given` is
 * "someone came through". Only the first is a to-do.
 */

/**
 * Which tags make sense in which status. A tag is offered only where it could
 * plausibly happen — an online assessment belongs to the early screening
 * stages, offer negotiation only once there is an offer.
 *
 * This governs what the picker *offers* and what a board card *shows*; it is
 * deliberately not enforced in the database. A card dragged backwards keeps
 * tags it collected earlier, because that history is real and deleting it on a
 * move would lose information the user never chose to discard.
 */
export const STATUS_TAGS = {
  saved: [
    "need_referral",
    "referral_requested",
    "referral_given",
    "recruiter_reachout",
    "needs_follow_up",
  ],
  applied: [
    "need_referral",
    "referral_requested",
    "referral_given",
    "recruiter_reachout",
    "online_assessment",
    "take_home",
    "needs_follow_up",
  ],
  screen: [
    "online_assessment",
    "take_home",
    "screening_call",
    "tech_screen",
    "needs_follow_up",
  ],
  interview: [
    "take_home",
    "tech_screen",
    "system_design",
    "panel_round",
    "needs_follow_up",
  ],
  onsite: [
    "tech_screen",
    "system_design",
    "panel_round",
    "needs_follow_up",
  ],
  offer: ["offer_negotiation", "needs_follow_up"],
  rejected: [],
  withdrawn: [],
  ghosted: ["needs_follow_up"],
} as const satisfies Record<ApplicationStatus, readonly ApplicationTag[]>;

/** True when `tag` is one the given status offers. */
export function isTagAllowed(
  status: ApplicationStatus,
  tag: ApplicationTag,
): boolean {
  return (STATUS_TAGS[status] as readonly ApplicationTag[]).includes(tag);
}

/**
 * What the posting says about work authorization. Null is the common case and
 * means the posting said nothing — never "unknown requirement we should guess
 * at". The parser leaves it null unless the posting is explicit, because a
 * wrong value here filters out roles you could actually take.
 *
 * `citizen` and `clearance` overlap in practice (a clearance implies
 * citizenship) but are kept apart: "US citizens only" and "must be able to
 * obtain a Secret clearance" are different asks, and a posting that says one
 * rarely means the other.
 */
export const sponsorship = pgEnum("sponsorship", [
  "will_sponsor",
  "no_sponsorship",
  "citizen",
  "green_card",
  "clearance",
]);

export type Sponsorship = (typeof sponsorship.enumValues)[number];

export const remoteType = pgEnum("remote_type", ["onsite", "hybrid", "remote"]);

export const interviewFormat = pgEnum("interview_format", [
  "phone",
  "video",
  "onsite",
  "take_home",
]);

export const reminderKind = pgEnum("reminder_kind", [
  "follow_up",
  "interview_prep",
  "stale",
  "custom",
]);

/**
 * Where a company sits on your *own* list, independent of any application.
 * "interested" and "researching" are the watchlist; "passed" is a company you
 * looked at and ruled out, kept so it doesn't get re-added by mistake.
 *
 * A company with applications is shown as applied regardless of this column —
 * the applications are the stronger signal, so the watchlist never contradicts
 * what you've actually done.
 */
export const companyPipeline = pgEnum("company_pipeline", [
  "interested",
  "researching",
  "passed",
]);

export type CompanyPipeline = (typeof companyPipeline.enumValues)[number];

export const companyPriority = pgEnum("company_priority", [
  "high",
  "medium",
  "low",
]);

export type CompanyPriority = (typeof companyPriority.enumValues)[number];

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /**
     * Lowercased, punctuation-stripped `name`. Deduping happens on this, not on
     * `name`, so "Acme, Inc." and "acme inc" collapse to one row.
     */
    normalizedName: text("normalized_name").notNull(),
    website: text("website"),
    /**
     * Populated by the JD parser when it sees one. Phase 2 email ingestion joins
     * inbound mail to a company on this column — nothing reads it today.
     */
    emailDomain: text("email_domain"),
    /**
     * Null for a company that only exists because an application referenced it.
     * Set once you deliberately put it on the watchlist.
     */
    pipeline: companyPipeline("pipeline"),
    priority: companyPriority("priority"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("companies_normalized_name_idx").on(t.normalizedName)],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: applicationStatus("status").notNull().default("saved"),
    source: text("source"), // "LinkedIn", "referral", "careers page", ...
    jobUrl: text("job_url"),
    location: text("location"),
    remoteType: remoteType("remote_type"),
    /** Null when the posting never mentions work authorization. */
    sponsorship: sponsorship("sponsorship"),
    // Whole currency units. Postings quote round numbers; cents buy nothing here.
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    currency: text("currency"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    /**
     * Sparse ordering within a board column (1000, 2000, 3000...) so a reorder
     * rewrites one row instead of renumbering the whole column.
     */
    boardOrder: bigint("board_order", { mode: "number" }).notNull().default(1000),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    jdRaw: text("jd_raw"),
    jdParsed: jsonb("jd_parsed"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("applications_status_idx").on(t.status),
    index("applications_company_idx").on(t.companyId),
    index("applications_board_idx").on(t.status, t.boardOrder),
  ],
);

/**
 * Append-only. Every status transition lands here, and the analytics — funnel
 * conversion, time-in-stage, response rate — are derived from this table alone,
 * never from the mutable `applications.status` column.
 *
 * Write only through `recordStatusChange()` in `src/lib/applications.ts`.
 */
export const statusEvents = pgTable(
  "status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    // Null on the row that records an application's creation.
    fromStatus: applicationStatus("from_status"),
    toStatus: applicationStatus("to_status").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    source: statusEventSource("source").notNull().default("manual"),
    note: text("note"),
  },
  (t) => [
    index("status_events_application_idx").on(t.applicationId, t.occurredAt),
    index("status_events_occurred_idx").on(t.occurredAt),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    email: text("email"),
    linkedinUrl: text("linkedin_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("contacts_company_idx").on(t.companyId)],
);

export const interviews = pgTable(
  "interviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    round: integer("round").notNull().default(1),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    format: interviewFormat("format"),
    interviewerContactId: uuid("interviewer_contact_id").references(
      () => contacts.id,
      { onDelete: "set null" },
    ),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("interviews_application_idx").on(t.applicationId)],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    kind: documentKind("kind").notNull(),
    s3Key: text("s3_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type"),
    sizeBytes: integer("size_bytes"),
    /** sha256 of the bytes. Tells you which resume version went where. */
    contentHash: text("content_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("documents_application_idx").on(t.applicationId),
    // Re-uploading the same file to the same application is a no-op.
    uniqueIndex("documents_app_hash_idx").on(t.applicationId, t.contentHash),
  ],
);

/**
 * Tags on an application. A join table rather than an array column so the set
 * is indexable — "every application with an online assessment" is an index
 * scan, and a tag can carry its own `createdAt` for when the milestone landed.
 */
export const applicationTags = pgTable(
  "application_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    tag: applicationTag("tag").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("application_tags_application_idx").on(t.applicationId),
    index("application_tags_tag_idx").on(t.tag),
    // Applying the same tag twice is a no-op, not a duplicate chip.
    uniqueIndex("application_tags_unique_idx").on(t.applicationId, t.tag),
  ],
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    kind: reminderKind("kind").notNull().default("follow_up"),
    message: text("message"),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reminders_due_idx").on(t.dueAt),
    index("reminders_application_idx").on(t.applicationId),
    // At most one open (undismissed) auto-generated stale reminder per
    // application, so a repeated sweep tops up nothing.
    uniqueIndex("reminders_open_stale_idx")
      .on(t.applicationId, t.kind)
      .where(sql`${t.dismissedAt} is null and ${t.kind} = 'stale'`),
  ],
);

export const companiesRelations = relations(companies, ({ many }) => ({
  applications: many(applications),
  contacts: many(contacts),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  company: one(companies, {
    fields: [applications.companyId],
    references: [companies.id],
  }),
  statusEvents: many(statusEvents),
  interviews: many(interviews),
  documents: many(documents),
  reminders: many(reminders),
  tags: many(applicationTags),
}));

export const statusEventsRelations = relations(statusEvents, ({ one }) => ({
  application: one(applications, {
    fields: [statusEvents.applicationId],
    references: [applications.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, {
    fields: [contacts.companyId],
    references: [companies.id],
  }),
  interviews: many(interviews),
}));

export const interviewsRelations = relations(interviews, ({ one }) => ({
  application: one(applications, {
    fields: [interviews.applicationId],
    references: [applications.id],
  }),
  interviewer: one(contacts, {
    fields: [interviews.interviewerContactId],
    references: [contacts.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  application: one(applications, {
    fields: [documents.applicationId],
    references: [applications.id],
  }),
}));

export const applicationTagsRelations = relations(applicationTags, ({ one }) => ({
  application: one(applications, {
    fields: [applicationTags.applicationId],
    references: [applications.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  application: one(applications, {
    fields: [reminders.applicationId],
    references: [applications.id],
  }),
}));

export type Company = typeof companies.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type StatusEvent = typeof statusEvents.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type Interview = typeof interviews.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type ApplicationTagRow = typeof applicationTags.$inferSelect;
