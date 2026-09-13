import { describe, expect, it } from "vitest";

import {
  applicationInputSchema,
  parsedApplicationInputSchema,
} from "@/lib/validation";

const base = { company: "Acme Inc.", title: "Engineer" };

describe("parsedApplicationInputSchema", () => {
  it("requires a job URL, unlike the hand-typed schema", () => {
    expect(applicationInputSchema.safeParse(base).success).toBe(true);

    const parsed = parsedApplicationInputSchema.safeParse(base);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((i) => i.path[0] === "jobUrl")).toBe(true);
  });

  it("rejects an empty job URL, which is what a cleared input submits", () => {
    const parsed = parsedApplicationInputSchema.safeParse({
      ...base,
      jobUrl: "   ",
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("Job URL is required");
  });

  it("rejects a job URL that is not a URL", () => {
    const parsed = parsedApplicationInputSchema.safeParse({
      ...base,
      jobUrl: "acme.com/careers",
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("Must be a valid URL");
  });

  it("accepts a valid job URL", () => {
    const parsed = parsedApplicationInputSchema.safeParse({
      ...base,
      jobUrl: "https://acme.com/jobs/1",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.jobUrl).toBe("https://acme.com/jobs/1");
  });

  it("reads the Y Combinator checkbox from what a form actually submits", () => {
    const parse = (value?: string) =>
      applicationInputSchema.safeParse(
        value === undefined ? base : { ...base, isYCombinator: value },
      );

    // A ticked box submits "on"; the hidden companion submits "false", and
    // `Object.fromEntries` keeps whichever came last.
    expect(parse("on").data?.isYCombinator).toBe(true);
    expect(parse("false").data?.isYCombinator).toBe(false);

    // Absent entirely — a form that never rendered the field at all.
    expect(parse().data?.isYCombinator).toBe(false);

    // "off" is a real browser value for some controls, and must not read as
    // true the way a bare boolean coercion would make it.
    expect(parse("off").data?.isYCombinator).toBe(false);
  });

  it("still enforces the salary range refine it inherits", () => {
    const parsed = parsedApplicationInputSchema.safeParse({
      ...base,
      jobUrl: "https://acme.com/jobs/1",
      salaryMin: "200000",
      salaryMax: "100000",
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path).toEqual(["salaryMax"]);
  });
});
