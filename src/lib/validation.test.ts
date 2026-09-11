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
