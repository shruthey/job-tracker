import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { applications, companies, statusEvents } from "@/db/schema";
import {
  normalizeCompanyName,
  nextBoardOrder,
  recordStatusChange,
  upsertCompany,
} from "@/lib/applications";

async function makeApplication(status: "saved" | "applied" = "saved") {
  const companyId = await upsertCompany(db, `Test Co ${crypto.randomUUID()}`);
  const [row] = await db
    .insert(applications)
    .values({ companyId, title: "Engineer", status })
    .returning({ id: applications.id });

  await db.insert(statusEvents).values({
    applicationId: row.id,
    fromStatus: null,
    toStatus: status,
  });

  return row.id;
}

function eventsFor(applicationId: string) {
  return db
    .select()
    .from(statusEvents)
    .where(eq(statusEvents.applicationId, applicationId))
    .orderBy(statusEvents.occurredAt);
}

describe("normalizeCompanyName", () => {
  it("collapses suffixes and punctuation so duplicates dedupe", () => {
    expect(normalizeCompanyName("Acme, Inc.")).toBe("acme");
    expect(normalizeCompanyName("ACME inc")).toBe("acme");
    expect(normalizeCompanyName("  Acme   Corp ")).toBe("acme");
  });

  it("keeps distinct companies distinct", () => {
    expect(normalizeCompanyName("Acme")).not.toBe(normalizeCompanyName("Acmex"));
  });
});

describe("upsertCompany", () => {
  it("returns the same id for names that normalize alike", async () => {
    const unique = `Globex ${Date.now()}`;
    const first = await upsertCompany(db, unique);
    const second = await upsertCompany(db, `${unique}, Inc.`.toUpperCase());
    expect(second).toBe(first);
  });

  it("fills a blank website without clobbering an existing one", async () => {
    const unique = `Initech ${Date.now()}`;
    const id = await upsertCompany(db, unique, { website: "https://a.example" });
    await upsertCompany(db, unique, { website: "https://b.example" });

    const [row] = await db
      .select({ website: companies.website })
      .from(companies)
      .where(eq(companies.id, id));

    expect(row.website).toBe("https://a.example");
  });
});

describe("recordStatusChange", () => {
  it("updates the status and appends exactly one event", async () => {
    const id = await makeApplication("saved");

    const result = await recordStatusChange(id, "applied");
    expect(result.changed).toBe(true);
    expect(result.fromStatus).toBe("saved");

    const [app] = await db
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, id));
    expect(app.status).toBe("applied");

    const events = await eventsFor(id);
    expect(events).toHaveLength(2);
    expect(events[1].fromStatus).toBe("saved");
    expect(events[1].toStatus).toBe("applied");
  });

  it("records no event when the status does not actually change", async () => {
    const id = await makeApplication("saved");

    const result = await recordStatusChange(id, "saved");

    expect(result.changed).toBe(false);
    expect(await eventsFor(id)).toHaveLength(1);
  });

  it("stamps appliedAt on the first move into applied", async () => {
    const id = await makeApplication("saved");
    await recordStatusChange(id, "applied");

    const [row] = await db
      .select({ appliedAt: applications.appliedAt })
      .from(applications)
      .where(eq(applications.id, id));

    expect(row.appliedAt).toBeInstanceOf(Date);
  });

  it("does not move appliedAt when the application re-enters applied", async () => {
    const id = await makeApplication("saved");
    await recordStatusChange(id, "applied");

    const [first] = await db
      .select({ appliedAt: applications.appliedAt })
      .from(applications)
      .where(eq(applications.id, id));

    await recordStatusChange(id, "screen");
    await recordStatusChange(id, "applied");

    const [second] = await db
      .select({ appliedAt: applications.appliedAt })
      .from(applications)
      .where(eq(applications.id, id));

    expect(second.appliedAt?.toISOString()).toBe(first.appliedAt?.toISOString());
  });

  it("keeps history and current status consistent across a full path", async () => {
    const id = await makeApplication("saved");

    for (const s of ["applied", "screen", "interview", "offer"] as const) {
      await recordStatusChange(id, s);
    }

    const events = await eventsFor(id);
    expect(events).toHaveLength(5);

    // Each event's `from` must equal the previous event's `to` — no gaps.
    for (let i = 1; i < events.length; i++) {
      expect(events[i].fromStatus).toBe(events[i - 1].toStatus);
    }

    const [app] = await db
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, id));
    expect(app.status).toBe(events[events.length - 1].toStatus);
  });

  it("records the source so Phase 2 ingestion is distinguishable", async () => {
    const id = await makeApplication("applied");
    await recordStatusChange(id, "ghosted", { source: "system" });

    const events = await eventsFor(id);
    expect(events[events.length - 1].source).toBe("system");
  });

  it("throws for an unknown application rather than silently doing nothing", async () => {
    await expect(
      recordStatusChange(crypto.randomUUID(), "applied"),
    ).rejects.toThrow(/not found/i);
  });

  it("rolls the event back if the surrounding transaction fails", async () => {
    const id = await makeApplication("saved");

    await expect(
      db.transaction(async (tx) => {
        await recordStatusChange(id, "applied", { tx });
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    // Neither the status nor the event may survive the rollback.
    const [app] = await db
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, id));
    expect(app.status).toBe("saved");
    expect(await eventsFor(id)).toHaveLength(1);
  });
});

describe("nextBoardOrder", () => {
  it("leaves a gap above the current maximum", async () => {
    const first = await nextBoardOrder(db, "saved");
    expect(first % 1000).toBe(0);

    const companyId = await upsertCompany(db, `Board Co ${crypto.randomUUID()}`);
    await db
      .insert(applications)
      .values({ companyId, title: "X", status: "saved", boardOrder: first });

    const second = await nextBoardOrder(db, "saved");
    expect(second).toBe(first + 1000);
  });

  /**
   * `board_order` is a bigint, and the driver returns bigint aggregates as
   * strings. Without a cast, `max + BOARD_GAP` concatenates rather than adds,
   * so each insert appends "1000" to the previous value until it overflows
   * bigint and every save fails. Repeat inserts to catch that compounding.
   */
  it("returns a number, so repeated inserts add rather than concatenate", async () => {
    const companyId = await upsertCompany(db, `Board Co ${crypto.randomUUID()}`);

    let previous = await nextBoardOrder(db, "saved");
    for (let i = 0; i < 3; i++) {
      expect(typeof previous).toBe("number");
      expect(Number.isSafeInteger(previous)).toBe(true);

      await db
        .insert(applications)
        .values({ companyId, title: `X${i}`, status: "saved", boardOrder: previous });

      const next = await nextBoardOrder(db, "saved");
      expect(next).toBe(previous + 1000);
      previous = next;
    }
  });
});
