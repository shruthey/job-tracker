"use client";

import { useActionState, useTransition } from "react";

import { deleteInterview, scheduleInterview } from "@/lib/actions";
import { formatDateTime, INTERVIEW_FORMAT_LABELS } from "@/lib/format";
import type { Interview } from "@/db/schema";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

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
    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Interviews
      </h2>

      {interviews.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
                className="flex items-start justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      past
                        ? "text-zinc-400 line-through dark:text-zinc-600"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {formatDateTime(interview.scheduledAt)}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {`Round ${interview.round}`}
                    {interview.format
                      ? ` · ${INTERVIEW_FORMAT_LABELS[interview.format]}`
                      : ""}
                  </p>
                  {interview.notes ? (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
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
                  className="shrink-0 text-xs text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
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
        className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800"
      >
        <label
          htmlFor="scheduledAt"
          className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
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
          <p className="text-xs text-rose-600 dark:text-rose-400">
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
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Scheduling…" : "Schedule interview"}
        </button>

        {state.message ? (
          <p
            className={`text-xs ${
              state.ok
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
