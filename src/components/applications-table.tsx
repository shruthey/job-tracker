"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";

import { archiveApplications, deleteApplications } from "@/lib/actions";
import { StatusBadge } from "@/components/status-badge";
import { ContactsHint } from "@/components/contacts-hint";
import { formatDate, formatDateTime, formatSalary } from "@/lib/format";
import { TagList } from "@/components/tag-chip";
import { SponsorshipBadge } from "@/components/sponsorship-badge";
import { CalendarIcon, ExternalLinkIcon } from "@/components/icons";
import type { ApplicationRow } from "@/lib/queries";

function SelectionBar({
  count,
  pending,
  onArchive,
  onDelete,
  onClear,
}: {
  count: number;
  pending: boolean;
  onArchive: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const active = count > 0;

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2.5 shadow-sm transition-colors ${
        active
          ? "border-brand bg-brand dark:border-brand dark:bg-brand/40"
          : "border-chrome bg-surface dark:border-chrome dark:bg-chrome"
      }`}
    >
      <p
        className={`text-sm ${
          active
            ? "font-medium text-brand dark:text-brand"
            : "text-muted dark:text-muted"
        }`}
      >
        {active
          ? `${count} selected`
          : "Select applications to archive or delete"}
      </p>

      <div className="ml-auto flex items-center gap-2">
        {active ? (
          <button
            type="button"
            onClick={onClear}
            disabled={pending}
            className="rounded-md px-2.5 py-1.5 text-sm text-muted hover:bg-ground disabled:opacity-50 dark:text-muted dark:hover:bg-chrome"
          >
            Clear
          </button>
        ) : null}

        <button
          type="button"
          onClick={onArchive}
          disabled={!active || pending}
          className="rounded-lg border border-chrome bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 dark:border-chrome dark:bg-chrome dark:text-muted dark:hover:border-brand dark:hover:text-brand"
        >
          {pending ? "Working…" : "Archive"}
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={!active || pending}
          className="rounded-lg border border-warn bg-surface px-3 py-1.5 text-sm font-medium text-warn transition-colors hover:bg-warn/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-warn dark:bg-chrome dark:text-ink dark:hover:bg-warn dark:hover:text-white"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export function ApplicationsTable({ rows }: { rows: ApplicationRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  // Selection is keyed by id, so a filter change that removes a row must not
  // leave it selected and silently included in the next bulk action.
  const visibleIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const effective = useMemo(
    () => [...selected].filter((id) => visibleIds.has(id)),
    [selected, visibleIds],
  );

  const allSelected = rows.length > 0 && effective.length === rows.length;
  const someSelected = effective.length > 0 && !allSelected;

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function run(
    action: (ids: string[]) => Promise<{ ok: boolean; message?: string; count?: number }>,
    verb: string,
  ) {
    const ids = effective;
    if (ids.length === 0) return;

    startTransition(async () => {
      const result = await action(ids);

      if (result.ok) {
        setSelected(new Set());
        setNotice({
          ok: true,
          text: `${result.count ?? ids.length} ${
            (result.count ?? ids.length) === 1 ? "application" : "applications"
          } ${verb}.`,
        });
      } else {
        setNotice({ ok: false, text: result.message ?? `Could not ${verb} them.` });
      }
    });
  }

  function onArchive() {
    run(archiveApplications, "archived");
  }

  function onDelete() {
    const count = effective.length;
    const confirmed = window.confirm(
      `Permanently delete ${count} ${count === 1 ? "application" : "applications"}?\n\n` +
        "Their status history, documents, interviews and reminders are deleted too, " +
        "and the analytics will no longer include them. This cannot be undone.\n\n" +
        "Archive instead if you only want them out of the way.",
    );
    if (!confirmed) return;

    run(deleteApplications, "deleted");
  }

  return (
    <div className="flex flex-col gap-3">
      <SelectionBar
        count={effective.length}
        pending={pending}
        onArchive={onArchive}
        onDelete={onDelete}
        onClear={() => setSelected(new Set())}
      />

      {notice ? (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            notice.ok
              ? "border-brand bg-brand/20 text-ink dark:border-brand dark:bg-brand/30 dark:text-ink"
              : "border-warn bg-warn/20 text-ink dark:border-warn dark:bg-warn/30 dark:text-ink"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-chrome bg-surface shadow-sm dark:border-chrome dark:bg-chrome">
        <table className="w-full min-w-[64rem] text-sm">
          <thead className="border-b border-chrome bg-ground/80 text-left text-xs uppercase tracking-wide text-muted dark:border-chrome dark:bg-chrome/50 dark:text-muted">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  // Mixed state when only some rows are picked.
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all applications"
                  className="h-3.5 w-3.5 rounded border-chrome accent-brand dark:border-chrome"
                />
              </th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Company</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Location</th>
              <th className="px-4 py-2.5 font-medium">Sponsorship</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">Compensation</th>
              <th className="px-4 py-2.5 font-medium">Applied</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-chrome dark:divide-chrome">
            {rows.map((row) => {
              const checked = selected.has(row.id);

              return (
                <tr
                  key={row.id}
                  className={`transition-colors ${
                    checked
                      ? "bg-brand dark:bg-brand/30"
                      : "hover:bg-ground dark:hover:bg-chrome/50"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRow(row.id)}
                      aria-label={`Select ${row.title} at ${row.companyName}`}
                      className="h-3.5 w-3.5 rounded border-chrome accent-brand dark:border-chrome"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {/*
                      The posting link sits beside the row link rather than
                      inside it: nesting <a> in <a> is invalid HTML, and a
                      click here should open the posting, not the detail page.
                    */}
                    <span className="flex items-center gap-1.5">
                      <Link
                        href={`/applications/${row.id}`}
                        className="font-medium text-ink transition-colors hover:text-brand dark:text-muted dark:hover:text-brand"
                      >
                        {row.title}
                      </Link>
                      {row.jobUrl ? (
                        <a
                          href={row.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open job posting"
                          aria-label={`Open the job posting for ${row.title} at ${row.companyName} in a new tab`}
                          className="rounded p-0.5 text-muted transition-colors hover:bg-ground hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-chrome dark:text-muted dark:hover:bg-chrome dark:hover:text-muted"
                        >
                          <ExternalLinkIcon className="h-3 w-3" />
                        </a>
                      ) : null}
                    </span>
                    {row.source ? (
                      <Link
                        href={`/applications/${row.id}`}
                        className="block text-xs text-muted dark:text-muted"
                      >
                        {row.source}
                      </Link>
                    ) : null}
                    <TagList tags={row.tags} className="mt-1.5" />
                  </td>
                  <td className="px-4 py-3 text-muted dark:text-muted">
                    <span className="inline-flex items-center gap-1">
                      {row.companyName}
                      <ContactsHint
                        contacts={row.contacts}
                        companyName={row.companyName}
                      />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                    {row.nextInterviewAt ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-brand/20 px-1.5 py-0.5 text-xs font-medium text-ink ring-1 ring-inset ring-brand dark:bg-brand/30 dark:text-ink dark:ring-brand">
                        <CalendarIcon className="h-3 w-3" />
                        {formatDateTime(row.nextInterviewAt)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted dark:text-muted">
                    {row.location ?? "—"}
                    {row.remoteType ? (
                      <span className="block text-xs text-muted dark:text-muted">
                        {row.remoteType}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted dark:text-muted">
                    {row.sponsorship ? (
                      <SponsorshipBadge sponsorship={row.sponsorship} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatSalary(row.salaryMin, row.salaryMax, row.currency) ? (
                      <span className="font-medium text-brand dark:text-brand">
                        {formatSalary(row.salaryMin, row.salaryMax, row.currency)}
                      </span>
                    ) : (
                      <span className="text-muted dark:text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted dark:text-muted">
                    {formatDate(row.appliedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
