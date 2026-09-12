import Link from "next/link";

import { applicationStatus } from "@/db/schema";
import { listApplications, listCompanies } from "@/lib/queries";
import { STATUS_LABELS } from "@/lib/format";
import { ApplicationsTable } from "@/components/applications-table";
import { PageWidth } from "@/components/page";

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
    <PageWidth>
      <div className="flex flex-col gap-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-muted">
            Applications
          </h1>
          <p className="text-sm text-muted dark:text-muted">
            {rows.length} {rows.length === 1 ? "result" : "results"}
          </p>
        </div>

        {/* GET form: filters live in the URL, so the view is shareable and
            survives a refresh without any client state. */}
        <form
          className="flex flex-wrap items-end gap-3 rounded-xl border border-chrome bg-surface p-4 shadow-sm dark:border-chrome dark:bg-chrome"
          method="get"
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-muted dark:text-muted">
            Search
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Title or company"
              className="w-56 rounded-lg border border-chrome bg-surface px-2.5 py-1.5 text-sm text-ink transition-colors focus:border-brand dark:border-chrome dark:bg-chrome dark:text-muted"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted dark:text-muted">
            Status
            <select
              name="status"
              defaultValue={status ?? ""}
              className="rounded-lg border border-chrome bg-surface px-2.5 py-1.5 text-sm text-ink transition-colors focus:border-brand dark:border-chrome dark:bg-chrome dark:text-muted"
            >
              <option value="">All</option>
              {applicationStatus.enumValues.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted dark:text-muted">
            Company
            <select
              name="company"
              defaultValue={companyParam ?? ""}
              className="rounded-lg border border-chrome bg-surface px-2.5 py-1.5 text-sm text-ink transition-colors focus:border-brand dark:border-chrome dark:bg-chrome dark:text-muted"
            >
              <option value="">All</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted dark:text-muted">
            Created
            <select
              name="since"
              defaultValue={sinceParam ?? ""}
              className="rounded-lg border border-chrome bg-surface px-2.5 py-1.5 text-sm text-ink transition-colors focus:border-brand dark:border-chrome dark:bg-chrome dark:text-muted"
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
            className="rounded-lg bg-gradient-to-br from-brand to-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-brand/25 transition-shadow hover:shadow-md hover:shadow-brand/35"
          >
            Filter
          </button>
          <Link
            href="/applications"
            className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-ground hover:text-brand dark:text-muted dark:hover:bg-chrome dark:hover:text-brand"
          >
            Reset
          </Link>
        </form>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand bg-brand/40 p-12 text-center dark:border-brand dark:bg-brand/20">
            <p className="text-sm text-muted dark:text-muted">
              No applications match these filters.
            </p>
            <Link
              href="/applications/new"
              className="mt-3 inline-block rounded-lg bg-gradient-to-br from-brand to-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-brand/25 transition-shadow hover:shadow-md hover:shadow-brand/35"
            >
              Add one
            </Link>
          </div>
        ) : (
          <ApplicationsTable rows={rows} />
        )}
      </div>
    </PageWidth>
  );
}
