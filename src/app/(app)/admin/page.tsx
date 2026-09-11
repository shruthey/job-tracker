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
        <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-muted">
          Admin
        </h1>
        <p className="mt-1 text-sm text-muted dark:text-muted">
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
                  ? "bg-gradient-to-br from-brand to-brand text-white shadow-sm shadow-brand/25"
                  : "border border-chrome text-ink hover:bg-ground dark:border-chrome dark:text-muted dark:hover:bg-chrome"
              }`}
            >
              {slug}
              <span
                className={`ml-1.5 tabular-nums ${
                  active
                    ? "text-muted dark:text-muted"
                    : "text-muted dark:text-muted"
                }`}
              >
                {counts[slug]}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-sm font-semibold text-ink dark:text-muted">
          {data.tableName}
        </h2>
        <p className="text-sm text-muted dark:text-muted">
          {truncated ? (
            <>
              showing {data.rows.length} of {data.total} rows
              {data.limit < MAX_LIMIT ? (
                <>
                  {" · "}
                  <Link
                    href={`/admin?table=${table}&limit=${MAX_LIMIT}`}
                    className="underline underline-offset-2 hover:text-ink dark:hover:text-muted"
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
        <div className="rounded-lg border border-dashed border-chrome p-12 text-center dark:border-chrome">
          <p className="text-sm text-muted dark:text-muted">
            No rows in{" "}
            <span className="font-mono">{data.tableName}</span> yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-chrome bg-surface shadow-sm dark:border-chrome dark:bg-chrome">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="border-b border-chrome text-left text-xs uppercase tracking-wide text-muted dark:border-chrome dark:text-muted">
              <tr>
                {data.columns.map((column) => (
                  <th key={column} className="px-4 py-2.5 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-chrome dark:divide-chrome">
              {data.rows.map((row, index) => (
                <tr
                  key={typeof row.id === "string" ? row.id : index}
                  className="transition-colors hover:bg-ground dark:hover:bg-chrome/50"
                >
                  {data.columns.map((column) => {
                    const text = formatCell(row[column]);
                    return (
                      <td
                        key={column}
                        title={text === "—" ? undefined : text}
                        className="px-4 py-3 text-muted dark:text-muted"
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
