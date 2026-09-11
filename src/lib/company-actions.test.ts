import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { applications, companies, statusEvents } from "@/db/schema";
import { removeFromWatchlist } from "@/lib/actions";

// `revalidatePath` needs Next's request context, which does not exist under
// Vitest. Stub it so these specs exercise the database logic, not the cache.
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  updateTag: () => {},
  refresh: () => {},
}));

async function seedCompany(name: string) {
  const [company] = await db
    .insert(companies)
    .values({
      name,
      normalizedName: crypto.randomUUID(),
      pipeline: "interested",
    })
    .returning({ id: companies.id });

  return company.id;
}

beforeEach(async () => {
  await db.execute(
    sql`truncate table ${companies}, ${applications} restart identity cascade`,
  );
});

describe("removeFromWatchlist", () => {
  it("hard-deletes a company with no applications", async () => {
    const id = await seedCompany("Solo Co");

    const result = await removeFromWatchlist(id);

    expect(result.ok).toBe(true);
    const rows = await db.select().from(companies).where(eq(companies.id, id));
    expect(rows).toHaveLength(0);
  });

  /**
   * The guard that matters: company_id is `on delete cascade`, so without this
   * a single × click would take the application and its history with it.
   */
  it("refuses to delete a company that has applications", async () => {
    const id = await seedCompany("Has Apps Co");
    const [app] = await db
      .insert(applications)
      .values({ companyId: id, title: "Engineer", status: "applied" })
      .returning({ id: applications.id });
    await db.insert(statusEvents).values({
      applicationId: app.id,
      fromStatus: null,
      toStatus: "applied",
    });

    const result = await removeFromWatchlist(id);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("1 application");

    // Everything survives.
    expect(
      await db.select().from(companies).where(eq(companies.id, id)),
    ).toHaveLength(1);
    expect(
      await db.select().from(applications).where(eq(applications.id, app.id)),
    ).toHaveLength(1);
    expect(
      await db
        .select()
        .from(statusEvents)
        .where(eq(statusEvents.applicationId, app.id)),
    ).toHaveLength(1);
  });

  it("pluralises the refusal message", async () => {
    const id = await seedCompany("Many Apps Co");
    await db.insert(applications).values([
      { companyId: id, title: "One", status: "applied" },
      { companyId: id, title: "Two", status: "saved" },
    ]);

    const result = await removeFromWatchlist(id);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("2 applications");
  });

  it("reports a missing company rather than silently succeeding", async () => {
    const result = await removeFromWatchlist(crypto.randomUUID());

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Company not found.");
  });

  it("rejects a malformed id", async () => {
    const result = await removeFromWatchlist("not-a-uuid");

    expect(result.ok).toBe(false);
  });
});
