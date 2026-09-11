"use client";

import { useActionState } from "react";

import { ApplicationForm } from "@/components/application-form";
import { createApplicationFromJd } from "@/lib/actions";
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
        <div className="rounded-md bg-brand/20 px-3 py-2 text-sm text-ink dark:bg-brand/20 dark:text-ink">
          Extracted from the posting. Review every field before saving.
        </div>

        {(d.requiredSkills.length > 0 ||
          d.niceToHaveSkills.length > 0 ||
          d.sponsorship !== null) && (
          <div className="flex flex-col gap-2 rounded-lg border border-chrome bg-surface p-4 text-sm dark:border-chrome dark:bg-chrome">
            {d.seniority ? (
              <p className="text-muted dark:text-muted">
                Seniority: <span className="font-medium">{d.seniority}</span>
              </p>
            ) : null}
            {d.sponsorship ? (
              <p className="flex items-center gap-2 text-muted dark:text-muted">
                Sponsorship:
                <SponsorshipBadge sponsorship={d.sponsorship} />
              </p>
            ) : null}
            {d.requiredSkills.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium text-ink dark:text-muted">
                  Required
                </p>
                <div className="flex flex-wrap gap-1">
                  {d.requiredSkills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-ground px-2 py-0.5 text-xs text-ink dark:bg-chrome dark:text-muted"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {d.niceToHaveSkills.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium text-ink dark:text-muted">
                  Nice to have
                </p>
                <div className="flex flex-wrap gap-1">
                  {d.niceToHaveSkills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-ground px-2 py-0.5 text-xs text-muted dark:bg-chrome dark:text-muted"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="rounded-xl border border-chrome bg-surface p-6 shadow-sm dark:border-chrome dark:bg-chrome">
          <ApplicationForm
            action={createApplicationFromJd}
            submitLabel="Create application"
            cancelHref="/applications"
            requireJobUrl
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
          className="text-xs font-medium text-ink dark:text-muted"
        >
          Paste the job description
        </label>
        <textarea
          id="jdText"
          name="jdText"
          rows={16}
          required
          autoFocus
          defaultValue={state.jdRaw ?? ""}
          placeholder="Paste the full posting here…"
          className="w-full rounded-md border border-chrome bg-surface px-3 py-2 font-mono text-xs text-ink dark:border-chrome dark:bg-chrome dark:text-muted"
        />
      </div>

      {state.message ? (
        <p className="rounded-md bg-warn/20 px-3 py-2 text-sm text-ink dark:bg-warn/20 dark:text-ink">
          {state.message}
        </p>
      ) : null}
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
        >
          {pending ? "Parsing…" : "Parse posting"}
        </button>
      </div>
    </form>
  );
}
