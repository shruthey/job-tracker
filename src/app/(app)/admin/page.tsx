import Link from "next/link";

import {
  ADMIN_TABLE_SLUGS,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  getTableCounts,
  getTableData,
  isAdminTableSlug,
  type AdminTableSlug,
} from "@/lib/admin-queries";
import { formatDateTime } from "@/lib/format";

/**
 * Raw rows, so this must never be prerendered or cached — nothing revalidates
 * this route, and a stale snapshot would defeat the point of the page.
 */
export const dynamic = "force-dynamic";

const DEFAULT_TABLE: AdminTableSlug = "applications";

/**
 * One cell. Values arrive straight from the driver, so this handles every shape
 * a column can produce: null, Date (timestamps), object (jsonb like `jdParsed`),
 * and the primitives. Long text is truncated in the markup, with the full value
 * on `title` so it is still reachable on hover.
 */
function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function AdminPage(props: PageProps<"/admin">) {
  const params = await props.searchParams;

  const table = isAdminTableSlug(params.table) ? params.table : DEFAULT_TABLE;

  const requestedLimit =
    typeof params.limit === "string" ? Number.parseInt(params.limit, 10) : NaN;
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_LIMIT;

  const [data, counts] = await Promise.all([
    getTableData(table, limit),
    getTableCounts(),
  ]);

  const truncated = data.total > data.rows.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Admin
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Raw table data, exactly as stored — unfiltered and unaggregated,
          including archived rows that the other views hide.
        </p>
      </div>

      <nav className="flex flex-wrap gap-1.5">
        {ADMIN_TABLE_SLUGS.map((slug) => {
          const active = slug === table;
          return (
            <Link
              key={slug}
              href={`/admin?table=${slug}`}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {slug}
              <span
                className={`ml-1.5 tabular-nums ${
                  active
                    ? "text-zinc-400 dark:text-zinc-500"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {counts[slug]}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {data.tableName}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {truncated ? (
            <>
              showing {data.rows.length} of {data.total} rows
              {data.limit < MAX_LIMIT ? (
                <>
                  {" · "}
                  <Link
                    href={`/admin?table=${table}&limit=${MAX_LIMIT}`}
                    className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    show up to {MAX_LIMIT}
                  </Link>
                </>
              ) : null}
            </>
          ) : (
            <>
              {data.total} {data.total === 1 ? "row" : "rows"}
            </>
          )}
        </p>
      </div>

      {data.rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No rows in{" "}
            <span className="font-mono">{data.tableName}</span> yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                {data.columns.map((column) => (
                  <th key={column} className="px-4 py-2.5 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.rows.map((row, index) => (
                <tr
                  key={typeof row.id === "string" ? row.id : index}
                  className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  {data.columns.map((column) => {
                    const text = formatCell(row[column]);
                    return (
                      <td
                        key={column}
                        title={text === "—" ? undefined : text}
                        className="px-4 py-3 text-zinc-600 dark:text-zinc-400"
                      >
                        <span className="block max-w-[18rem] truncate font-mono text-xs">
                          {text}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
