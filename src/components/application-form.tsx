"use client";

import { useActionState } from "react";
import Link from "next/link";

import { applicationStatus, remoteType, sponsorship } from "@/db/schema";
import { SPONSORSHIP_LABELS, STATUS_LABELS } from "@/lib/format";
import type { ActionState } from "@/lib/validation";
import { JdPreview } from "@/components/jd-preview";

type Values = Partial<{
  company: string;
  title: string;
  status: string;
  jobUrl: string;
  location: string;
  remoteType: string;
  sponsorship: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  jdRaw: string;
}>;

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

function Field({
  label,
  htmlFor,
  errors,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  errors?: string[];
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        id={`${htmlFor}-label`}
        htmlFor={htmlFor}
        className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
      {errors?.length ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{errors[0]}</p>
      ) : null}
    </div>
  );
}

export function ApplicationForm({
  action,
  values = {},
  submitLabel,
  cancelHref,
  jdPosition = "bottom",
  requireJobUrl = false,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  values?: Values;
  submitLabel: string;
  cancelHref: string;
  /**
   * Where the description sits relative to the fields. On a saved application
   * it is the thing you came to re-read, so it leads; while adding one it is
   * the posting you just pasted, and the fields to check matter more.
   */
  jdPosition?: "top" | "bottom";
  /**
   * When the posting was parsed rather than typed, the link back to it is the
   * one thing the model cannot supply — so it leads the form and is required.
   */
  requireJobUrl?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: true });
  const errors = state.fieldErrors ?? {};

  const jdField = (
    <Field
      label="Job description"
      htmlFor="jdRaw"
      errors={errors.jdRaw}
      hint="Years of experience, tools, and technologies are highlighted."
    >
      <JdPreview id="jdRaw" name="jdRaw" value={values.jdRaw ?? ""} />
    </Field>
  );

  const jobUrlField = (
    <Field
      label="Job URL"
      htmlFor="jobUrl"
      errors={errors.jobUrl}
      hint={
        requireJobUrl
          ? "Paste the link to the posting so you can get back to it."
          : undefined
      }
    >
      <input
        id="jobUrl"
        name="jobUrl"
        type="url"
        required={requireJobUrl}
        defaultValue={values.jobUrl ?? ""}
        className={inputClass}
        placeholder="https://..."
      />
    </Field>
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.message ? (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            state.ok
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      {jdPosition === "top" ? jdField : null}

      {requireJobUrl ? jobUrlField : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company" htmlFor="company" errors={errors.company}>
          <input
            id="company"
            name="company"
            required
            defaultValue={values.company ?? ""}
            className={inputClass}
            placeholder="Acme Inc."
          />
        </Field>

        <Field label="Title" htmlFor="title" errors={errors.title}>
          <input
            id="title"
            name="title"
            required
            defaultValue={values.title ?? ""}
            className={inputClass}
            placeholder="Senior Software Engineer"
          />
        </Field>

        <Field label="Status" htmlFor="status" errors={errors.status}>
          <select
            id="status"
            name="status"
            defaultValue={values.status ?? "saved"}
            className={inputClass}
          >
            {applicationStatus.enumValues.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Location" htmlFor="location" errors={errors.location}>
          <input
            id="location"
            name="location"
            defaultValue={values.location ?? ""}
            className={inputClass}
            placeholder="San Francisco, CA"
          />
        </Field>

        <Field label="Remote type" htmlFor="remoteType" errors={errors.remoteType}>
          <select
            id="remoteType"
            name="remoteType"
            defaultValue={values.remoteType ?? ""}
            className={inputClass}
          >
            <option value="">Unspecified</option>
            {remoteType.enumValues.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Sponsorship"
          htmlFor="sponsorship"
          errors={errors.sponsorship}
          hint="Leave unspecified unless the posting actually says."
        >
          <select
            id="sponsorship"
            name="sponsorship"
            defaultValue={values.sponsorship ?? ""}
            className={inputClass}
          >
            <option value="">Unspecified</option>
            {sponsorship.enumValues.map((v) => (
              <option key={v} value={v}>
                {SPONSORSHIP_LABELS[v]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Salary minimum" htmlFor="salaryMin" errors={errors.salaryMin}>
          <input
            id="salaryMin"
            name="salaryMin"
            type="number"
            min="0"
            step="1"
            defaultValue={values.salaryMin ?? ""}
            className={inputClass}
            placeholder="180000"
          />
        </Field>

        <Field label="Salary maximum" htmlFor="salaryMax" errors={errors.salaryMax}>
          <input
            id="salaryMax"
            name="salaryMax"
            type="number"
            min="0"
            step="1"
            defaultValue={values.salaryMax ?? ""}
            className={inputClass}
            placeholder="230000"
          />
        </Field>

        <Field label="Currency" htmlFor="currency" errors={errors.currency}>
          <input
            id="currency"
            name="currency"
            defaultValue={values.currency ?? ""}
            className={inputClass}
            placeholder="USD"
          />
        </Field>
        {requireJobUrl ? null : jobUrlField}
      </div>

      {jdPosition === "bottom" ? jdField : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-600/25 transition-shadow hover:shadow-md hover:shadow-violet-600/35 disabled:opacity-50 disabled:shadow-none"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
