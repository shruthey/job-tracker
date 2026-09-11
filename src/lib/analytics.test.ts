import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { applications, companies, statusEvents } from "@/db/schema";
import {
  getFunnel,
  getResponseRateBySource,
  getTimeInStage,
  getTotals,
} from "@/lib/analytics";

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

/**
 * A known fixture, so every expectation below is a hand-checkable number
 * rather than a restatement of whatever the query happened to return.
 *
 *   A: saved -> applied -> screen -> offer   (source: referral)
 *   B: saved -> applied -> screen -> rejected (source: referral)
 *   C: saved -> applied  (no response)        (source: job board)
 *   D: saved  (never applied)                 (source: job board)
 */
beforeAll(async () => {
  await db.execute(
    sql`truncate table ${companies}, ${applications} restart identity cascade`,
  );

  const [company] = await db
    .insert(companies)
    .values({ name: "Fixture Co", normalizedName: "fixture" })
    .returning({ id: companies.id });

  async function seed(
    title: string,
    source: string,
    path: [string, number][],
  ) {
    const final = path[path.length - 1][0];
    const [app] = await db
      .insert(applications)
      .values({
        companyId: company.id,
        title,
        source,
        status: final as never,
        appliedAt: path.find(([s]) => s === "applied")
          ? daysAgo(path.find(([s]) => s === "applied")![1])
          : null,
      })
      .returning({ id: applications.id });

    let previous: string | null = null;
    for (const [status, days] of path) {
      await db.insert(statusEvents).values({
        applicationId: app.id,
        fromStatus: previous as never,
        toStatus: status as never,
        occurredAt: daysAgo(days),
      });
      previous = status;
    }
  }

  // Stage durations are exact: applied->screen is 4 days for A, 6 for B.
  await seed("A", "referral", [["saved", 30], ["applied", 28], ["screen", 24], ["offer", 20]]);
  await seed("B", "referral", [["saved", 26], ["applied", 24], ["screen", 18], ["rejected", 14]]);
  await seed("C", "job board", [["saved", 20], ["applied", 18]]);
  await seed("D", "job board", [["saved", 10]]);
});

describe("getFunnel", () => {
  it("counts every application that ever reached a stage", async () => {
    const funnel = await getFunnel();
    const at = (s: string) => funnel.find((f) => f.status === s)!;

    expect(at("saved").reached).toBe(4);
    expect(at("applied").reached).toBe(3);
    expect(at("screen").reached).toBe(2);
    expect(at("offer").reached).toBe(1);
  });

  it("counts an application that has since moved on", async () => {
    // A is in `offer` now but still counts toward `screen`.
    const funnel = await getFunnel();
    expect(funnel.find((f) => f.status === "screen")!.reached).toBe(2);
  });

  it("computes conversion against the previous stage", async () => {
    const funnel = await getFunnel();
    // applied 3 of 4 saved; screen 2 of 3 applied.
    expect(funnel.find((f) => f.status === "applied")!.conversionFromPrevious)
      .toBeCloseTo(3 / 4);
    expect(funnel.find((f) => f.status === "screen")!.conversionFromPrevious)
      .toBeCloseTo(2 / 3);
  });

  it("leaves the first stage without a conversion figure", async () => {
    const funnel = await getFunnel();
    expect(funnel[0].conversionFromPrevious).toBeNull();
  });
});

describe("getTimeInStage", () => {
  it("takes the median gap between consecutive events", async () => {
    const stages = await getTimeInStage();
    const applied = stages.find((s) => s.status === "applied")!;

    // A spent 4 days in `applied`, B spent 6 -> median 5.
    expect(applied.medianDays).toBeCloseTo(5, 1);
    expect(applied.samples).toBe(2);
  });

  it("excludes applications still sitting in a stage", async () => {
    const stages = await getTimeInStage();
    // C is still in `applied` with no exit event, so it is not a sample.
    expect(stages.find((s) => s.status === "applied")!.samples).toBe(2);
  });

  it("reports null rather than zero where there is no data", async () => {
    const stages = await getTimeInStage();
    const onsite = stages.find((s) => s.status === "onsite")!;
    expect(onsite.medianDays).toBeNull();
    expect(onsite.samples).toBe(0);
  });
});

describe("getResponseRateBySource", () => {
  it("counts a rejection as a response and silence as none", async () => {
    const rows = await getResponseRateBySource();

    const referral = rows.find((r) => r.source === "referral")!;
    expect(referral.total).toBe(2);
    expect(referral.responded).toBe(2); // offer + rejection both count
    expect(referral.responseRate).toBeCloseTo(1);

    const board = rows.find((r) => r.source === "job board")!;
    expect(board.total).toBe(1); // D never applied, so it is not in the denominator
    expect(board.responded).toBe(0);
    expect(board.responseRate).toBeCloseTo(0);
  });

  it("excludes applications that were never applied to", async () => {
    const rows = await getResponseRateBySource();
    const total = rows.reduce((sum, r) => sum + r.total, 0);
    expect(total).toBe(3);
  });
});

describe("getTotals", () => {
  it("reconciles with the fixture", async () => {
    const totals = await getTotals();
    expect(totals.applied).toBe(3);
    expect(totals.offers).toBe(1);
    expect(totals.rejected).toBe(1);
    expect(totals.active).toBe(3); // A(offer), C(applied), D(saved); B is rejected
  });
});
