import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { applications, companies, statusEvents } from "@/db/schema";
import { archiveApplications, deleteApplications } from "@/lib/actions";

// `revalidatePath` needs Next's request context, which does not exist under
// Vitest. Stub it so these specs exercise the database logic, not the cache.
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  updateTag: () => {},
  refresh: () => {},
}));

async function seed(title: string) {
  const [company] = await db
    .insert(companies)
    .values({ name: `Co ${crypto.randomUUID()}`, normalizedName: crypto.randomUUID() })
    .returning({ id: companies.id });

  const [app] = await db
    .insert(applications)
    .values({ companyId: company.id, title, status: "applied" })
    .returning({ id: applications.id });

  await db.insert(statusEvents).values({
    applicationId: app.id,
    fromStatus: null,
    toStatus: "applied",
  });

  return app.id;
}

beforeEach(async () => {
  await db.execute(
    sql`truncate table ${companies}, ${applications} restart identity cascade`,
  );
});

describe("archiveApplications", () => {
  it("archives every selected row and leaves the rest alone", async () => {
    const [a, b, c] = [await seed("A"), await seed("B"), await seed("C")];

    const result = await archiveApplications([a, b]);
    expect(result.ok).toBe(true);
    expect(result.count).toBe(2);

    const rows = await db
      .select({ id: applications.id, archivedAt: applications.archivedAt })
      .from(applications);

    const archived = rows.filter((r) => r.archivedAt !== null).map((r) => r.id);
    expect(archived.sort()).toEqual([a, b].sort());
    expect(rows.find((r) => r.id === c)?.archivedAt).toBeNull();
  });

  it("keeps the data — archiving is reversible", async () => {
    const id = await seed("A");
    await archiveApplications([id]);

    const rows = await db.select().from(applications).where(eq(applications.id, id));
    expect(rows).toHaveLength(1);

    const events = await db
      .select()
      .from(statusEvents)
      .where(eq(statusEvents.applicationId, id));
    expect(events.length).toBeGreaterThan(0);
  });

  it("rejects an empty selection rather than touching every row", async () => {
    await seed("A");
    const result = await archiveApplications([]);

    expect(result.ok).toBe(false);
    const rows = await db.select().from(applications);
    expect(rows[0].archivedAt).toBeNull();
  });

  it("rejects ids that are not uuids", async () => {
    const result = await archiveApplications(["'; drop table applications; --"]);
    expect(result.ok).toBe(false);
  });
});

describe("deleteApplications", () => {
  it("removes the selected rows", async () => {
    const [a, b] = [await seed("A"), await seed("B")];

    const result = await deleteApplications([a]);
    expect(result.ok).toBe(true);
    expect(result.count).toBe(1);

    const rows = await db.select({ id: applications.id }).from(applications);
    expect(rows.map((r) => r.id)).toEqual([b]);
  });

  it("cascades to the status history", async () => {
    const id = await seed("A");
    await deleteApplications([id]);

    const events = await db
      .select()
      .from(statusEvents)
      .where(eq(statusEvents.applicationId, id));
    expect(events).toHaveLength(0);
  });

  it("rejects an empty selection", async () => {
    await seed("A");
    const result = await deleteApplications([]);

    expect(result.ok).toBe(false);
    expect(await db.select().from(applications)).toHaveLength(1);
  });
});
