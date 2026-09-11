import { z } from "zod";

import {
  applicationStatus,
  applicationTag,
  companyPipeline,
  companyPriority,
  interviewFormat,
  remoteType,
  sponsorship,
} from "@/db/schema";

/** Turns "" (what an empty HTML input submits) into undefined. */
const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    schema,
  );

const optionalText = emptyToUndefined(z.string().trim().min(1).optional());

const optionalUrl = emptyToUndefined(
  z.string().trim().url("Must be a valid URL").optional(),
);

/**
 * Any whole amount, not just round thousands — real postings quote figures
 * like 175500. The upper bound is the Postgres `integer` column's range:
 * without it an out-of-range number passes validation and fails in the driver,
 * which surfaces as a server error instead of a message on the field.
 */
const optionalInt = emptyToUndefined(
  z.coerce
    .number()
    .int("Must be a whole number")
    .nonnegative()
    .max(2_147_483_647, "Number is too large")
    .optional(),
);

export const applicationInputSchema = z
  .object({
    company: z.string().trim().min(1, "Company is required"),
    title: z.string().trim().min(1, "Title is required"),
    status: z.enum(applicationStatus.enumValues).default("saved"),
    source: optionalText,
    jobUrl: optionalUrl,
    location: optionalText,
    remoteType: emptyToUndefined(z.enum(remoteType.enumValues).optional()),
    sponsorship: emptyToUndefined(z.enum(sponsorship.enumValues).optional()),
    salaryMin: optionalInt,
    salaryMax: optionalInt,
    currency: optionalText,
    notes: optionalText,
    jdRaw: optionalText,
    website: optionalUrl,
  })
  .refine(
    (v) => v.salaryMin === undefined || v.salaryMax === undefined || v.salaryMax >= v.salaryMin,
    { message: "Maximum salary must be at least the minimum", path: ["salaryMax"] },
  );

export type ApplicationInput = z.infer<typeof applicationInputSchema>;

/**
 * The parsed-posting variant. Everything the model extracted is editable and
 * optional as usual, but the link back to the posting is not — it is the one
 * field the parse cannot fill, and without it a saved row has no way back to
 * the source it was built from.
 */
export const parsedApplicationInputSchema = applicationInputSchema.safeExtend({
  jobUrl: z.string().trim().min(1, "Job URL is required").url("Must be a valid URL"),
});

export const moveApplicationSchema = z.object({
  applicationId: z.string().uuid(),
  toStatus: z.enum(applicationStatus.enumValues),
  boardOrder: z.coerce.number().optional(),
});

export const toggleTagSchema = z.object({
  applicationId: z.string().uuid(),
  tag: z.enum(applicationTag.enumValues),
});

export const interviewInputSchema = z.object({
  applicationId: z.string().uuid(),
  /**
   * `datetime-local` submits "2026-10-03T14:00" with no zone, which `z.coerce
   * .date()` reads in the server's local time — the same zone the user typed
   * it in, since this runs on their machine.
   */
  scheduledAt: z.coerce.date({ message: "Pick a date and time" }),
  round: z.coerce.number().int().min(1).max(20).default(1),
  format: emptyToUndefined(z.enum(interviewFormat.enumValues).optional()),
  notes: optionalText,
});

export const addTargetCompanySchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
  website: optionalUrl,
  priority: emptyToUndefined(z.enum(companyPriority.enumValues).optional()),
  notes: optionalText,
});

export const updateCompanySchema = z.object({
  id: z.string().uuid(),
  pipeline: emptyToUndefined(z.enum(companyPipeline.enumValues).optional()),
  priority: emptyToUndefined(z.enum(companyPriority.enumValues).optional()),
  notes: optionalText,
  website: optionalUrl,
});

/**
 * A contact is just a name here — the `contacts` table has role/email/linkedin
 * columns, but this flow deliberately fills none of them. A name is what you
 * actually remember about a referral; the rest is a CRM nobody maintains.
 */
export const MAX_CONTACTS_PER_COMPANY = 2;

export const addContactSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().trim().min(1, "A name is required").max(120),
});

export const removeContactSchema = z.object({
  id: z.string().uuid(),
});

/** Shape returned to a form by a failed server action. */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export function toActionState(error: z.ZodError): ActionState {
  return {
    ok: false,
    message: "Please fix the highlighted fields.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}
