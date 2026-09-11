import { beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { applications, companies, reminders, statusEvents } from "@/db/schema";
import { checkStaleApplications, findStaleApplications } from "@/lib/reminders";

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

async function seedApplication(
  status: "applied" | "screen" | "offer" | "rejected",
  lastEventDaysAgo: number,
) {
  const [company] = await db
    .insert(companies)
    .values({
      name: `Co ${crypto.randomUUID()}`,
      normalizedName: crypto.randomUUID(),
    })
    .returning({ id: companies.id });

  const [app] = await db
    .insert(applications)
    .values({ companyId: company.id, title: "Engineer", status })
    .returning({ id: applications.id });

  await db.insert(statusEvents).values({
    applicationId: app.id,
    fromStatus: null,
    toStatus: status,
    occurredAt: daysAgo(lastEventDaysAgo),
  });

  return app.id;
}

beforeEach(async () => {
  await db.execute(
    sql`truncate table ${companies}, ${applications} restart identity cascade`,
  );
});

describe("findStaleApplications", () => {
  it("finds applications past the threshold", async () => {
    await seedApplication("applied", 30);
    const stale = await findStaleApplications(21);
    expect(stale).toHaveLength(1);
    expect(stale[0].daysSince).toBeGreaterThanOrEqual(29);
  });

  it("ignores applications that moved recently", async () => {
    await seedApplication("applied", 3);
    expect(await findStaleApplications(21)).toHaveLength(0);
  });

  it("ignores terminal statuses — a rejection does not go stale", async () => {
    await seedApplication("rejected", 90);
    expect(await findStaleApplications(21)).toHaveLength(0);
  });
});

describe("checkStaleApplications", () => {
  it("creates one reminder per stale application", async () => {
    await seedApplication("applied", 30);
    const result = await checkStaleApplications({ staleDays: 21, ghostDays: 45 });

    expect(result.stale).toBe(1);
    expect(result.remindersCreated).toBe(1);
    expect(result.ghosted).toBe(0);
  });

  it("is idempotent — a second sweep adds no duplicates", async () => {
    await seedApplication("applied", 30);
    await checkStaleApplications({ staleDays: 21, ghostDays: 45 });
    const second = await checkStaleApplications({ staleDays: 21, ghostDays: 45 });

    expect(second.remindersCreated).toBe(0);
    const rows = await db.select().from(reminders);
    expect(rows).toHaveLength(1);
  });

  it("marks a long-silent application ghosted through the event log", async () => {
    const id = await seedApplication("applied", 60);
    const result = await checkStaleApplications({ staleDays: 21, ghostDays: 45 });

    expect(result.ghosted).toBe(1);

    const [app] = await db
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, id));
    expect(app.status).toBe("ghosted");

    // The transition must be in the history, attributed to the system.
    const events = await db
      .select()
      .from(statusEvents)
      .where(eq(statusEvents.applicationId, id));
    const ghostEvent = events.find((e) => e.toStatus === "ghosted");
    expect(ghostEvent?.source).toBe("system");
    expect(ghostEvent?.fromStatus).toBe("applied");
  });

  it("never ghosts an outstanding offer", async () => {
    const id = await seedApplication("offer", 90);
    const result = await checkStaleApplications({ staleDays: 21, ghostDays: 45 });

    expect(result.ghosted).toBe(0);
    const [app] = await db
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, id));
    expect(app.status).toBe("offer");
  });

  it("honours markGhosted: false", async () => {
    await seedApplication("applied", 90);
    const result = await checkStaleApplications({
      staleDays: 21,
      ghostDays: 45,
      markGhosted: false,
    });

    expect(result.ghosted).toBe(0);
    expect(result.remindersCreated).toBe(1);
  });
});
