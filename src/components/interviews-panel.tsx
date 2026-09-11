"use client";

import { useActionState, useTransition } from "react";

import { deleteInterview, scheduleInterview } from "@/lib/actions";
import { formatDateTime, INTERVIEW_FORMAT_LABELS } from "@/lib/format";
import type { Interview } from "@/db/schema";

const inputClass =
  "w-full rounded-lg border border-chrome bg-surface px-2.5 py-1.5 text-sm text-ink transition-colors focus:border-brand dark:border-chrome dark:bg-chrome dark:text-muted";

export type InterviewItem = Interview & { isPast: boolean };

export function InterviewsPanel({
  applicationId,
  interviews,
}: {
  applicationId: string;
  interviews: InterviewItem[];
}) {
  const action = scheduleInterview.bind(null, applicationId);
  const [state, formAction, pending] = useActionState(action, { ok: true });
  const [, startTransition] = useTransition();

  return (
    <section className="rounded-xl border border-chrome bg-surface p-5 shadow-sm dark:border-chrome dark:bg-chrome">
      <h2 className="mb-3 text-sm font-semibold text-ink dark:text-muted">
        Interviews
      </h2>

      {interviews.length === 0 ? (
        <p className="text-sm text-muted dark:text-muted">
          Nothing scheduled.
        </p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {interviews.map((interview) => {
            // `past` is decided on the server (see the page) — reading the
            // clock during render is impure and desyncs server and client HTML.
            const past = interview.isPast;
            return (
              <li
                key={interview.id}
                className="flex items-start justify-between gap-2 rounded-md border border-chrome px-3 py-2 dark:border-chrome"
              >
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      past
                        ? "text-muted line-through dark:text-muted"
                        : "text-ink dark:text-muted"
                    }`}
                  >
                    {formatDateTime(interview.scheduledAt)}
                  </p>
                  <p className="text-xs text-muted dark:text-muted">
                    {`Round ${interview.round}`}
                    {interview.format
                      ? ` · ${INTERVIEW_FORMAT_LABELS[interview.format]}`
                      : ""}
                  </p>
                  {interview.notes ? (
                    <p className="mt-0.5 text-xs text-muted dark:text-muted">
                      {interview.notes}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(() => {
                      void deleteInterview(interview.id);
                    })
                  }
                  className="shrink-0 text-xs text-muted hover:text-warn dark:hover:text-warn"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form
        action={formAction}
        className="flex flex-col gap-2 border-t border-chrome pt-4 dark:border-chrome"
      >
        <label
          htmlFor="scheduledAt"
          className="text-xs font-medium text-ink dark:text-muted"
        >
          Date and time
        </label>
        <input
          id="scheduledAt"
          name="scheduledAt"
          type="datetime-local"
          required
          className={inputClass}
        />
        {state.fieldErrors?.scheduledAt ? (
          <p className="text-xs text-warn dark:text-warn">
            {state.fieldErrors.scheduledAt[0]}
          </p>
        ) : null}

        <div className="flex gap-2">
          <input
            name="round"
            type="number"
            min="1"
            max="20"
            step="1"
            defaultValue={interviews.length + 1}
            aria-label="Round"
            className={`${inputClass} w-20`}
          />
          <select name="format" defaultValue="" className={inputClass}>
            <option value="">Format…</option>
            {Object.entries(INTERVIEW_FORMAT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <input
          name="notes"
          placeholder="Notes (optional)"
          className={inputClass}
        />

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-br from-brand to-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-brand/25 transition-shadow hover:shadow-md hover:shadow-brand/35 disabled:opacity-50 disabled:shadow-none"
        >
          {pending ? "Scheduling…" : "Schedule interview"}
        </button>

        {state.message ? (
          <p
            className={`text-xs ${
              state.ok
                ? "text-brand dark:text-brand"
                : "text-warn dark:text-warn"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
