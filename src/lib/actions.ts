"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  applicationTags,
  applications,
  companies,
  contacts,
  interviews,
  reminders,
  statusEvents,
} from "@/db/schema";
import {
  nextBoardOrder,
  recordStatusChange,
  upsertCompany,
} from "@/lib/applications";
import {
  addContactSchema,
  addTargetCompanySchema,
  applicationInputSchema,
  parsedApplicationInputSchema,
  interviewInputSchema,
  moveApplicationSchema,
  removeContactSchema,
  toggleTagSchema,
  updateCompanySchema,
  MAX_CONTACTS_PER_COMPANY,
  toActionState,
  type ActionState,
} from "@/lib/validation";

/**
 * Single user, no auth (per the Phase 1 plan). If Phase 2 ever exposes this
 * beyond localhost, every action below needs an authorization check first —
 * server actions are reachable by direct POST, not just through the UI.
 */

function parseForm(formData: FormData) {
  return applicationInputSchema.safeParse(Object.fromEntries(formData));
}

export async function createApplication(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return createFrom(applicationInputSchema, formData);
}

/**
 * The parsed-posting path. Same insert, stricter input: the job URL is the one
 * field the parse cannot supply, so it is required here but stays optional for
 * an application typed in by hand.
 */
export async function createApplicationFromJd(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return createFrom(parsedApplicationInputSchema, formData);
}

async function createFrom(
  schema:
    | typeof applicationInputSchema
    | typeof parsedApplicationInputSchema,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toActionState(parsed.error);

  const input = parsed.data;
  let id: string;

  try {
    id = await db.transaction(async (tx) => {
      const companyId = await upsertCompany(tx, input.company, {
        website: input.website ?? null,
      });

      const boardOrder = await nextBoardOrder(tx, input.status);

      const [row] = await tx
        .insert(applications)
        .values({
          companyId,
          title: input.title,
          status: input.status,
          source: input.source ?? null,
          jobUrl: input.jobUrl ?? null,
          location: input.location ?? null,
          remoteType: input.remoteType ?? null,
          sponsorship: input.sponsorship ?? null,
          isYCombinator: input.isYCombinator,
          salaryMin: input.salaryMin ?? null,
          salaryMax: input.salaryMax ?? null,
          currency: input.currency ?? null,
          notes: input.notes ?? null,
          jdRaw: input.jdRaw ?? null,
          boardOrder,
          appliedAt: input.status === "applied" ? new Date() : null,
        })
        .returning({ id: applications.id });

      // The opening event: fromStatus null, so history starts at creation.
      await tx.insert(statusEvents).values({
        applicationId: row.id,
        fromStatus: null,
        toStatus: input.status,
        source: "manual",
      });

      return row.id;
    });
  } catch (error) {
    console.error("createApplication failed", error);
    return { ok: false, message: "Could not save the application." };
  }

  revalidatePath("/applications");
  revalidatePath("/board");
  redirect(`/applications/${id}`);
}

export async function updateApplication(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return toActionState(parsed.error);

  const input = parsed.data;

  /**
   * A field the form never rendered must not be read as one the user cleared.
   * The detail view hides source, notes, and the company website, so those
   * names are absent from the FormData entirely — distinct from a rendered
   * field submitted empty, which still means "clear this".
   */
  const submitted = (name: string) => formData.has(name);

  try {
    await db.transaction(async (tx) => {
      const companyId = await upsertCompany(tx, input.company, {
        website: input.website ?? null,
      });

      await tx
        .update(applications)
        .set({
          companyId,
          title: input.title,
          ...(submitted("source") ? { source: input.source ?? null } : {}),
          jobUrl: input.jobUrl ?? null,
          location: input.location ?? null,
          remoteType: input.remoteType ?? null,
          sponsorship: input.sponsorship ?? null,
          /**
           * Guarded like source and notes above, but for a different reason: an
           * unchecked checkbox submits nothing at all, so a form that renders
           * the box and one that omits it produce identical FormData. The
           * companion hidden input in `ApplicationForm` is what makes the name
           * present whenever the box was actually on screen.
           */
          ...(submitted("isYCombinator")
            ? { isYCombinator: input.isYCombinator }
            : {}),
          salaryMin: input.salaryMin ?? null,
          salaryMax: input.salaryMax ?? null,
          currency: input.currency ?? null,
          ...(submitted("notes") ? { notes: input.notes ?? null } : {}),
          jdRaw: input.jdRaw ?? null,
          updatedAt: new Date(),
        })
        .where(eq(applications.id, id));

      // Status goes through the invariant, never a bare update.
      await recordStatusChange(id, input.status, { tx, source: "manual" });
    });
  } catch (error) {
    console.error("updateApplication failed", error);
    return { ok: false, message: "Could not update the application." };
  }

  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  revalidatePath("/board");
  return { ok: true, message: "Saved." };
}

/** Called by the board on drag-and-drop. */
export async function moveApplication(input: {
  applicationId: string;
  toStatus: string;
  boardOrder?: number;
}): Promise<ActionState> {
  const parsed = moveApplicationSchema.safeParse(input);
  if (!parsed.success) return toActionState(parsed.error);

  try {
    await recordStatusChange(parsed.data.applicationId, parsed.data.toStatus, {
      source: "manual",
      boardOrder: parsed.data.boardOrder,
    });
  } catch (error) {
    console.error("moveApplication failed", error);
    return { ok: false, message: "Could not move the card." };
  }

  revalidatePath("/board");
  revalidatePath("/applications");
  return { ok: true };
}

export async function archiveApplication(id: string): Promise<void> {
  await db
    .update(applications)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(applications.id, id));

  revalidatePath("/applications");
  revalidatePath("/board");
  redirect("/applications");
}

/** Guards the bulk endpoints: ids must be uuids, and the list must be non-empty. */
const bulkIdsSchema = z
  .array(z.string().uuid())
  .min(1, "Nothing selected")
  // A sanity ceiling — the UI selects from one page, never thousands.
  .max(500, "Too many applications selected at once");

export type BulkResult = {
  ok: boolean;
  message?: string;
  count?: number;
};

/**
 * Archives many applications at once. Reversible: the rows keep their data and
 * their event history, and simply stop appearing in the list and on the board.
 */
export async function archiveApplications(ids: string[]): Promise<BulkResult> {
  const parsed = bulkIdsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  try {
    const rows = await db
      .update(applications)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(inArray(applications.id, parsed.data))
      .returning({ id: applications.id });

    revalidatePath("/applications");
    revalidatePath("/board");
    revalidatePath("/analytics");

    return { ok: true, count: rows.length };
  } catch (error) {
    console.error("archiveApplications failed", error);
    return { ok: false, message: "Could not archive the selected applications." };
  }
}

/**
 * Permanently deletes applications. The foreign keys cascade, so each row takes
 * its status_events, documents, reminders and interviews with it — which also
 * means the analytics lose that history. Archiving is the reversible option.
 *
 * Note the S3 objects behind any documents are intentionally left in place;
 * reclaiming them belongs in a sweep that can verify nothing else references
 * the same content hash.
 */
export async function deleteApplications(ids: string[]): Promise<BulkResult> {
  const parsed = bulkIdsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  try {
    const rows = await db
      .delete(applications)
      .where(inArray(applications.id, parsed.data))
      .returning({ id: applications.id });

    revalidatePath("/applications");
    revalidatePath("/board");
    revalidatePath("/analytics");

    return { ok: true, count: rows.length };
  } catch (error) {
    console.error("deleteApplications failed", error);
    return { ok: false, message: "Could not delete the selected applications." };
  }
}

/**
 * Adds a tag, or removes it if it is already there — one action behind a
 * single chip click. The unique index makes the add idempotent, so a
 * double-click can't produce two rows.
 */
export async function toggleApplicationTag(input: {
  applicationId: string;
  tag: string;
}): Promise<ActionState> {
  const parsed = toggleTagSchema.safeParse(input);
  if (!parsed.success) return toActionState(parsed.error);

  const { applicationId, tag } = parsed.data;

  try {
    const removed = await db
      .delete(applicationTags)
      .where(
        and(
          eq(applicationTags.applicationId, applicationId),
          eq(applicationTags.tag, tag),
        ),
      )
      .returning({ id: applicationTags.id });

    if (removed.length === 0) {
      await db.insert(applicationTags).values({ applicationId, tag });

      // "I still need a referral" and "I have one" can't both be true, so
      // turning on `referred` retires the to-do rather than leaving the card
      // contradicting itself. Only this direction is automatic: removing
      // `referred` does not put `need_referral` back, because un-ticking it is
      // just as likely to be a correction as a reversal.
      if (tag === "referred") {
        await db
          .delete(applicationTags)
          .where(
            and(
              eq(applicationTags.applicationId, applicationId),
              eq(applicationTags.tag, "need_referral"),
            ),
          );
      }
    }
  } catch (error) {
    console.error("toggleApplicationTag failed", error);
    return { ok: false, message: "Could not update tags." };
  }

  revalidatePath("/applications");
  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/board");
  return { ok: true };
}

export async function scheduleInterview(
  applicationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = interviewInputSchema.safeParse({
    applicationId,
    ...Object.fromEntries(formData),
  });
  if (!parsed.success) return toActionState(parsed.error);

  const input = parsed.data;

  try {
    await db.insert(interviews).values({
      applicationId: input.applicationId,
      scheduledAt: input.scheduledAt,
      round: input.round,
      format: input.format ?? null,
      notes: input.notes ?? null,
    });
  } catch (error) {
    console.error("scheduleInterview failed", error);
    return { ok: false, message: "Could not schedule the interview." };
  }

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/applications");
  revalidatePath("/board");
  return { ok: true, message: "Interview scheduled." };
}

export async function deleteInterview(id: string): Promise<void> {
  const [row] = await db
    .delete(interviews)
    .where(eq(interviews.id, id))
    .returning({ applicationId: interviews.applicationId });

  if (row) revalidatePath(`/applications/${row.applicationId}`);
  revalidatePath("/applications");
  revalidatePath("/board");
}

/**
 * Adds a company to the watchlist. Goes through `upsertCompany` so a name that
 * already exists — because an application referenced it — is reused rather
 * than duplicated; the unique index on normalized_name would reject a second
 * row anyway.
 */
export async function addTargetCompany(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = addTargetCompanySchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return toActionState(parsed.error);

  const input = parsed.data;

  try {
    await db.transaction(async (tx) => {
      const id = await upsertCompany(tx, input.name, {
        website: input.website ?? null,
      });

      // Mark it as watched. An existing company keeps whatever pipeline value
      // it already had unless it had none.
      await tx
        .update(companies)
        .set({
          pipeline: sql`coalesce(${companies.pipeline}, 'interested')`,
          priority: input.priority ?? null,
          notes: input.notes ?? null,
        })
        .where(eq(companies.id, id));
    });
  } catch (error) {
    console.error("addTargetCompany failed", error);
    return { ok: false, message: "Could not add the company." };
  }

  revalidatePath("/companies");
  return { ok: true, message: `Added ${input.name}.` };
}

/**
 * Adds a name to a company's contact list. Name only — see
 * `addContactSchema`.
 *
 * The cap is enforced here rather than only by hiding the button, because a
 * server action is reachable by direct POST. Counting and inserting run in one
 * transaction so two racing submits cannot both see one contact and each add a
 * second.
 */
export async function addContact(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = addContactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toActionState(parsed.error);

  const { companyId, name } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: contacts.id, name: contacts.name })
        .from(contacts)
        .where(eq(contacts.companyId, companyId));

      if (existing.length >= MAX_CONTACTS_PER_COMPANY) {
        return {
          ok: false,
          message: `Only ${MAX_CONTACTS_PER_COMPANY} contacts per company.`,
        } satisfies ActionState;
      }

      // Case-insensitive: "Priya" and "priya" are the same person.
      const duplicate = existing.some(
        (c) => c.name.toLowerCase() === name.toLowerCase(),
      );
      if (duplicate) {
        return { ok: false, message: `${name} is already there.` } satisfies ActionState;
      }

      await tx.insert(contacts).values({ companyId, name });
      return { ok: true } satisfies ActionState;
    });

    if (!result.ok) return result;
  } catch (error) {
    console.error("addContact failed", error);
    return { ok: false, message: "Could not add the contact." };
  }

  revalidatePath("/companies");
  return { ok: true };
}

export async function removeContact(id: string): Promise<ActionState> {
  const parsed = removeContactSchema.safeParse({ id });
  if (!parsed.success) return toActionState(parsed.error);

  try {
    await db.delete(contacts).where(eq(contacts.id, parsed.data.id));
  } catch (error) {
    console.error("removeContact failed", error);
    return { ok: false, message: "Could not remove the contact." };
  }

  revalidatePath("/companies");
  return { ok: true };
}

export async function updateCompany(input: {
  id: string;
  pipeline?: string;
  priority?: string;
  notes?: string;
  website?: string;
}): Promise<ActionState> {
  const parsed = updateCompanySchema.safeParse(input);
  if (!parsed.success) return toActionState(parsed.error);

  const { id, ...fields } = parsed.data;

  try {
    await db
      .update(companies)
      .set({
        pipeline: fields.pipeline ?? null,
        priority: fields.priority ?? null,
        notes: fields.notes ?? null,
        website: fields.website ?? null,
      })
      .where(eq(companies.id, id));
  } catch (error) {
    console.error("updateCompany failed", error);
    return { ok: false, message: "Could not update the company." };
  }

  revalidatePath("/companies");
  return { ok: true };
}

/** Sets just the pipeline column — used by the inline status buttons. */
export async function setCompanyPipeline(input: {
  id: string;
  pipeline: string | null;
}): Promise<ActionState> {
  const schema = z.object({
    id: z.string().uuid(),
    pipeline: z.enum(["interested", "researching", "passed"]).nullable(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return toActionState(parsed.error);

  try {
    await db
      .update(companies)
      .set({ pipeline: parsed.data.pipeline })
      .where(eq(companies.id, parsed.data.id));
  } catch (error) {
    console.error("setCompanyPipeline failed", error);
    return { ok: false, message: "Could not update the company." };
  }

  revalidatePath("/companies");
  return { ok: true };
}

/**
 * Deletes a watchlist company outright — row gone, not just un-flagged.
 *
 * Refuses when the company has applications. `applications.company_id` is
 * `on delete cascade`, and applications cascade onward to status_events,
 * interviews, documents, reminders and tags, so deleting such a company would
 * take a chunk of real history with it from a single × click with no
 * confirmation. Clearing the pipeline flag is the recoverable option there;
 * deleting the applications first is a deliberate, separate act.
 */
export async function removeFromWatchlist(id: string): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Unknown company." };

  try {
    const [existing] = await db
      .select({
        name: companies.name,
        applicationCount: sql<number>`(
          select count(*)::int from ${applications}
          where "applications"."company_id" = "companies"."id"
        )`,
      })
      .from(companies)
      .where(eq(companies.id, parsed.data));

    if (!existing) return { ok: false, message: "Company not found." };

    if (existing.applicationCount > 0) {
      return {
        ok: false,
        message: `${existing.name} has ${existing.applicationCount} application${
          existing.applicationCount === 1 ? "" : "s"
        } — delete ${
          existing.applicationCount === 1 ? "it" : "them"
        } first, or move the company to Passed.`,
      };
    }

    await db.delete(companies).where(eq(companies.id, parsed.data));
  } catch (error) {
    console.error("removeFromWatchlist failed", error);
    return { ok: false, message: "Could not delete the company." };
  }

  revalidatePath("/companies");
  revalidatePath("/applications");
  return { ok: true };
}

export async function dismissReminder(id: string): Promise<void> {
  await db
    .update(reminders)
    .set({ dismissedAt: new Date() })
    .where(eq(reminders.id, id));

  revalidatePath("/");
  revalidatePath("/applications");
}
