import Link from "next/link";

import { applicationStatus } from "@/db/schema";
import { listApplications, listCompanies } from "@/lib/queries";
import { STATUS_LABELS } from "@/lib/format";
import { ApplicationsTable } from "@/components/applications-table";

const RANGES = [
  { value: "", label: "Any time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export default async function ApplicationsPage(props: PageProps<"/applications">) {
  const params = await props.searchParams;

  const statusParam = typeof params.status === "string" ? params.status : undefined;
  const companyParam = typeof params.company === "string" ? params.company : undefined;
  const sinceParam = typeof params.since === "string" ? params.since : undefined;
  const q = typeof params.q === "string" ? params.q : undefined;

  const status = applicationStatus.enumValues.find((s) => s === statusParam);
  const parsedDays = sinceParam ? Number(sinceParam) : undefined;
  const sinceDays =
    parsedDays && Number.isFinite(parsedDays) ? parsedDays : undefined;

  const [rows, companies] = await Promise.all([
    listApplications({ status, company: companyParam || undefined, sinceDays, q }),
    listCompanies(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Applications
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {rows.length} {rows.length === 1 ? "result" : "results"}
        </p>
      </div>

      {/* GET form: filters live in the URL, so the view is shareable and
          survives a refresh without any client state. */}
      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        method="get"
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Search
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Title or company"
            className="w-56 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Status
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">All</option>
            {applicationStatus.enumValues.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Company
          <select
            name="company"
            defaultValue={companyParam ?? ""}
            className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">All</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Created
          <select
            name="since"
            defaultValue={sinceParam ?? ""}
            className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Filter
        </button>
        <Link
          href="/applications"
          className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Reset
        </Link>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No applications match these filters.
          </p>
          <Link
            href="/applications/new"
            className="mt-3 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            Add one
          </Link>
        </div>
      ) : (
        <ApplicationsTable rows={rows} />
      )}
    </div>
  );
}
