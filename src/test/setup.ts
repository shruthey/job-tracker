import "dotenv/config";
import { vi } from "vitest";

// `server-only` throws when imported outside a React Server Component; the
// modules under test are server modules, so stub it for the node environment.
vi.mock("server-only", () => ({}));

/**
 * The integration suites open by truncating `companies` and `applications`
 * with `cascade`, which empties every dependent table too. That is only safe
 * against a throwaway database, so point at one unconditionally — an
 * inherited DATABASE_URL (from .env, .env.local, or the shell) is overridden
 * rather than respected. TEST_DATABASE_URL is the one honoured override, for
 * CI where the host and credentials differ.
 */
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/job_tracker_test";

process.env.DATABASE_URL = TEST_DATABASE_URL;

/**
 * Belt and braces: if the URL above is ever edited to something that is not a
 * test database, fail loudly here instead of quietly deleting real data.
 */
const databaseName = new URL(TEST_DATABASE_URL).pathname.replace(/^\//, "");

if (!/(^|_)test$/.test(databaseName)) {
  throw new Error(
    `Refusing to run tests against database "${databaseName}": the test ` +
      `suite truncates tables, so it only runs against a database whose ` +
      `name ends in "test". Set TEST_DATABASE_URL to a throwaway database.`,
  );
}
