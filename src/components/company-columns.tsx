"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";

import {
  addTargetCompany,
  removeFromWatchlist,
  setCompanyPipeline,
} from "@/lib/actions";
import { StatusBadge } from "@/components/status-badge";
import { ExternalLinkIcon } from "@/components/icons";
import { relativeDays } from "@/lib/format";
import type { CompanyOverview } from "@/lib/queries";
import type { CompanyPipeline } from "@/db/schema";

const PIPELINE_LABELS: Record<CompanyPipeline, string> = {
  interested: "Interested",
  researching: "Researching",
  passed: "Passed",
};

const PIPELINE_STYLES: Record<CompanyPipeline, string> = {
  interested: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  researching:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  passed: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const PIPELINE_CYCLE: CompanyPipeline[] = [
  "interested",
  "researching",
  "passed",
];

function CompanyLink({ company }: { company: CompanyOverview }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
        {company.name}
      </span>
      {company.website ? (
        <a
          href={company.website}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open ${company.name}'s website`}
          aria-label={`Open ${company.name}'s website in a new tab`}
          className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <ExternalLinkIcon className="h-3 w-3" />
        </a>
      ) : null}
    </span>
  );
}

function QuickAdd() {
  const [state, formAction, pending] = useActionState(addTargetCompany, {
    ok: true,
  });

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <input
          name="name"
          required
          placeholder="Add a company…"
          aria-label="Company name"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
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
      {state.fieldErrors?.name ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          {state.fieldErrors.name[0]}
        </p>
      ) : null}
    </form>
  );
}

function WatchlistRow({ company }: { company: CompanyOverview }) {
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pipeline, setOptimistic] = useOptimistic(
    company.pipeline,
    (_current, next: CompanyPipeline) => next,
  );

  // Clicking the badge advances through the three states, so changing one is
  // a single click rather than opening a menu.
  function advance() {
    const i = pipeline ? PIPELINE_CYCLE.indexOf(pipeline) : -1;
    const next = PIPELINE_CYCLE[(i + 1) % PIPELINE_CYCLE.length];
    startTransition(async () => {
      setOptimistic(next);
      await setCompanyPipeline({ id: company.id, pipeline: next });
    });
  }

  // Deleting is permanent and the row disappears, so it asks first — unlike
  // the status badge, which is a single reversible click.
  function remove() {
    if (!window.confirm(`Delete ${company.name}? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await removeFromWatchlist(company.id);
      if (!result.ok) setError(result.message ?? "Could not delete.");
    });
  }

  return (
    <li className="flex flex-col gap-1 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <CompanyLink company={company} />
        {company.notes ? (
          <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {company.notes}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={advance}
          title="Click to change status"
          className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
            pipeline ? PIPELINE_STYLES[pipeline] : ""
          }`}
        >
          {pipeline ? PIPELINE_LABELS[pipeline] : "—"}
        </button>
        <button
          type="button"
          onClick={remove}
          title={`Delete ${company.name}`}
          aria-label={`Delete ${company.name}`}
          className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
        >
          ×
        </button>
      </div>
      </div>
      {error ? (
        <p role="status" className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function AppliedRow({ company }: { company: CompanyOverview }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Link
          href={`/applications?company=${company.id}`}
          className="min-w-0 hover:underline"
        >
          <CompanyLink company={company} />
        </Link>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {company.applicationCount === 1
            ? "1 role"
            : `${company.applicationCount} roles`}
          {company.activeCount > 0 ? ` · ${company.activeCount} active` : ""}
          {company.lastActivity
            ? ` · ${relativeDays(company.lastActivity)}`
            : ""}
        </span>
      </div>
      {company.furthestStatus ? (
        <span className="shrink-0" title="Furthest stage reached">
          <StatusBadge status={company.furthestStatus} />
        </span>
      ) : null}
    </li>
  );
}

export function CompanyColumns({ companies }: { companies: CompanyOverview[] }) {
  // Applied wins over the watchlist flag: once you've applied, that is the
  // truer statement about the company, whatever the pipeline column says.
  const applied = companies.filter((c) => c.applicationCount > 0);
  const watchlist = companies.filter(
    (c) => c.applicationCount === 0 && c.pipeline !== null,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            To apply
          </h2>
          <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
            {watchlist.length}
          </span>
        </div>

        <QuickAdd />

        {watchlist.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nothing on the list yet. Add a company you are thinking about.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {watchlist.map((c) => (
              <WatchlistRow key={c.id} company={c} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Applied
          </h2>
          <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
            {applied.length}
          </span>
        </div>

        {applied.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No applications yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {applied.map((c) => (
              <AppliedRow key={c.id} company={c} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
