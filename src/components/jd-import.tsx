"use client";

import { useActionState } from "react";

import { ApplicationForm } from "@/components/application-form";
import { createApplication } from "@/lib/actions";
import { parseJdAction, type ParseState } from "@/lib/parse-actions";
import { SponsorshipBadge } from "@/components/sponsorship-badge";

const initial: ParseState = { ok: false };

export function JdImport() {
  const [state, formAction, pending] = useActionState(parseJdAction, initial);

  // Once parsed, the extracted values seed the normal create form — the user
  // edits and confirms there, so model output never goes straight to the DB.
  if (state.ok && state.data) {
    const d = state.data;
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Extracted from the posting. Review every field before saving.
        </div>

        {(d.requiredSkills.length > 0 ||
          d.niceToHaveSkills.length > 0 ||
          d.sponsorship !== null) && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            {d.seniority ? (
              <p className="text-zinc-600 dark:text-zinc-400">
                Seniority: <span className="font-medium">{d.seniority}</span>
              </p>
            ) : null}
            {d.sponsorship ? (
              <p className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                Sponsorship:
                <SponsorshipBadge sponsorship={d.sponsorship} />
              </p>
            ) : null}
            {d.requiredSkills.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Required
                </p>
                <div className="flex flex-wrap gap-1">
                  {d.requiredSkills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {d.niceToHaveSkills.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Nice to have
                </p>
                <div className="flex flex-wrap gap-1">
                  {d.niceToHaveSkills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <ApplicationForm
            action={createApplication}
            submitLabel="Create application"
            cancelHref="/applications"
            values={{
              company: d.company,
              title: d.title,
              location: d.location ?? "",
              remoteType: d.remoteType ?? "",
              sponsorship: d.sponsorship ?? "",
              salaryMin: d.salaryMin,
              salaryMax: d.salaryMax,
              currency: d.currency ?? "",
              jdRaw: state.jdRaw ?? "",
              status: "saved",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="jdText"
          className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
        >
          Paste the job description
        </label>
        <textarea
          id="jdText"
          name="jdText"
          rows={16}
          required
          defaultValue={state.jdRaw ?? ""}
          placeholder="Paste the full posting here…"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>

      {state.message ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-300">
          {state.message}
        </p>
      ) : null}
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Parsing…" : "Parse posting"}
        </button>
      </div>
    </form>
  );
}
