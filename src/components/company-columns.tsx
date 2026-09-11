"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";

import {
  addContact,
  addTargetCompany,
  removeContact,
  removeFromWatchlist,
  setCompanyPipeline,
} from "@/lib/actions";
import { MAX_CONTACTS_PER_COMPANY } from "@/lib/validation";
import { StatusBadge } from "@/components/status-badge";
import { ExternalLinkIcon } from "@/components/icons";
import { relativeDays } from "@/lib/format";
import type { CompanyOverview } from "@/lib/queries";
import type { ActionState } from "@/lib/validation";
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
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-violet-600/25 transition-shadow hover:shadow-md hover:shadow-violet-600/35 disabled:opacity-50 disabled:shadow-none"
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

/**
 * The contact names for one company: at most two, name only. Adding opens a
 * single inline input rather than a dialog — one field does not deserve a
 * modal — and the add affordance disappears at the cap, so the limit shows
 * itself instead of arriving as an error after you type.
 */
function ContactRow({ company }: { company: CompanyOverview }) {
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await addContact(prev, formData);
      // Keep the input open on failure so the rejected name is still there to
      // correct; close it once the name is in.
      if (result.ok) setAdding(false);
      return result;
    },
    { ok: true } as ActionState,
  );

  // Optimism is worth it here: the name is the whole payload, so there is
  // nothing the server can change about it on the way back.
  const [optimisticContacts, addOptimistic] = useOptimistic(
    company.contacts,
    (current, name: string) => [...current, { id: `pending-${name}`, name }],
  );

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const atCap = optimisticContacts.length >= MAX_CONTACTS_PER_COMPANY;

  function remove(id: string, name: string) {
    startTransition(async () => {
      setError(null);
      const result = await removeContact(id);
      if (!result.ok) setError(result.message ?? `Could not remove ${name}.`);
    });
  }

  return (
    <div className="flex min-w-0 shrink items-center justify-end gap-1">
      {optimisticContacts.map((contact) => (
        <span
          key={contact.id}
          className="inline-flex min-w-0 items-center gap-0.5 rounded-full bg-zinc-100 py-0.5 pl-2 pr-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          <span className="truncate">{contact.name}</span>
          <button
            type="button"
            onClick={() => remove(contact.id, contact.name)}
            title={`Remove ${contact.name}`}
            aria-label={`Remove ${contact.name} from ${company.name}`}
            className="shrink-0 rounded-full px-1 leading-none text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
          >
            ×
          </button>
        </span>
      ))}

      {adding && !atCap ? (
        <form
          action={(formData) => {
            const name = String(formData.get("name") ?? "").trim();
            if (name) addOptimistic(name);
            formAction(formData);
          }}
          className="inline-flex items-center gap-1"
        >
          <input type="hidden" name="companyId" value={company.id} />
          <input
            ref={inputRef}
            name="name"
            required
            maxLength={120}
            placeholder="Name"
            aria-label={`Contact name at ${company.name}`}
            onBlur={(e) => {
              // Blur into the submit button is not a cancel.
              if (!e.currentTarget.form?.contains(e.relatedTarget as Node)) {
                setAdding(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setAdding(false);
            }}
            className="w-28 rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 px-2 py-0.5 text-xs font-medium text-white shadow-sm shadow-violet-600/25 disabled:opacity-50 disabled:shadow-none"
          >
            Add
          </button>
        </form>
      ) : null}

      {!adding && !atCap ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          title={`Add a contact at ${company.name}`}
          aria-label={`Add a contact at ${company.name}`}
          className="shrink-0 rounded-full border border-dashed border-zinc-300 px-2 py-0.5 text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {optimisticContacts.length === 0 ? "+ contact" : "+"}
        </button>
      ) : null}

      {state.message && !state.ok ? (
        <span className="text-xs text-rose-600 dark:text-rose-400">
          {state.message}
        </span>
      ) : null}
      {state.fieldErrors?.name ? (
        <span className="text-xs text-rose-600 dark:text-rose-400">
          {state.fieldErrors.name[0]}
        </span>
      ) : null}
      {error ? (
        <span role="status" className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </span>
      ) : null}
    </div>
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
    <li className="flex flex-col gap-0.5 rounded-md border border-zinc-200 px-2.5 py-1.5 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <CompanyLink company={company} />
          {company.notes ? (
            <span className="truncate text-xs leading-tight text-zinc-500 dark:text-zinc-400">
              {company.notes}
            </span>
          ) : null}
        </div>
        <ContactRow company={company} />
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
    <li className="flex items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 dark:border-zinc-800">
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          href={`/applications?company=${company.id}`}
          className="min-w-0 hover:underline"
        >
          <CompanyLink company={company} />
        </Link>
        <span className="text-xs leading-tight text-zinc-500 dark:text-zinc-400">
          {company.applicationCount === 1
            ? "1 role"
            : `${company.applicationCount} roles`}
          {company.activeCount > 0 ? ` · ${company.activeCount} active` : ""}
          {company.lastActivity
            ? ` · ${relativeDays(company.lastActivity)}`
            : ""}
        </span>
      </div>
      <ContactRow company={company} />
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
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="flex flex-col gap-2.5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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
          <ul className="flex flex-col gap-1.5">
            {watchlist.map((c) => (
              <WatchlistRow key={c.id} company={c} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2.5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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
          <ul className="flex flex-col gap-1.5">
            {applied.map((c) => (
              <AppliedRow key={c.id} company={c} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
