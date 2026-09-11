import { describe, expect, it, vi } from "vitest";

import {
  emailDomainFromUrl,
  JobDescriptionSchema,
  normalize,
  parseJobDescription,
  qualificationsSummary,
  type ParsedJobDescription,
} from "./parse-jd";

const base: ParsedJobDescription = {
  company: "Acme",
  title: "Engineer",
  location: null,
  remoteType: null,
  sponsorship: null,
  salaryMin: null,
  salaryMax: null,
  currency: null,
  seniority: null,
  requiredSkills: [],
  niceToHaveSkills: [],
};

/** A stub standing in for the SDK's `messages.parse`. */
function clientReturning(parsed_output: unknown) {
  return {
    messages: { parse: vi.fn().mockResolvedValue({ parsed_output }) },
  } as never;
}

const LONG_JD = "We are hiring a senior engineer to build payment systems. ".repeat(3);

describe("JobDescriptionSchema", () => {
  it("accepts a posting with everything omitted but the required arrays", () => {
    const result = JobDescriptionSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("accepts each sponsorship value and null", () => {
    for (const v of [
      null,
      "will_sponsor",
      "no_sponsorship",
      "citizen",
      "green_card",
      "clearance",
    ]) {
      expect(
        JobDescriptionSchema.safeParse({ ...base, sponsorship: v }).success,
      ).toBe(true);
    }
  });

  it("rejects a sponsorship value outside the enum", () => {
    // Free text here would mean a value no form field or badge can render.
    const out = JobDescriptionSchema.safeParse({
      ...base,
      sponsorship: "h1b maybe",
    });
    expect(out.success).toBe(false);
  });

  it("rejects a missing title", () => {
    const withoutTitle = { ...base, title: undefined };
    expect(JobDescriptionSchema.safeParse(withoutTitle).success).toBe(false);
  });
});

describe("normalize", () => {
  it("carries sponsorship through untouched", () => {
    // Nothing to clean up on an enum — the guard is that it survives at all.
    expect(normalize({ ...base, sponsorship: "citizen" }).sponsorship).toBe(
      "citizen",
    );
    expect(normalize(base).sponsorship).toBeNull();
  });

  it("scales thousands-denominated salaries to whole units", () => {
    const out = normalize({ ...base, salaryMin: 180, salaryMax: 230 });
    expect(out.salaryMin).toBe(180000);
    expect(out.salaryMax).toBe(230000);
  });

  it("leaves already-scaled salaries alone", () => {
    const out = normalize({ ...base, salaryMin: 180000, salaryMax: 230000 });
    expect(out.salaryMin).toBe(180000);
    expect(out.salaryMax).toBe(230000);
  });

  it("swaps inverted bounds", () => {
    const out = normalize({ ...base, salaryMin: 230000, salaryMax: 180000 });
    expect(out.salaryMin).toBe(180000);
    expect(out.salaryMax).toBe(230000);
  });

  it("uppercases currency and drops empty skills", () => {
    const out = normalize({
      ...base,
      currency: " usd ",
      requiredSkills: ["Go", "  ", ""],
    });
    expect(out.currency).toBe("USD");
    expect(out.requiredSkills).toEqual(["Go"]);
  });

  it("keeps a null salary null rather than inventing a number", () => {
    expect(normalize(base).salaryMin).toBeNull();
    expect(normalize(base).salaryMax).toBeNull();
  });
});

describe("parseJobDescription", () => {
  it("returns the parsed payload on success", async () => {
    const client = clientReturning({ ...base, salaryMin: 150, salaryMax: 190 });
    const result = await parseJobDescription(LONG_JD, { client });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.company).toBe("Acme");
      // normalize() ran on the way out.
      expect(result.data.salaryMin).toBe(150000);
    }
  });

  it("returns qualification bullets as the description, not the posting", async () => {
    const client = clientReturning({
      ...base,
      requiredSkills: ["5+ years of backend work"],
      niceToHaveSkills: ["Kubernetes"],
    });
    const result = await parseJobDescription(LONG_JD, { client });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.jdText).toBe(
        "Required:\n- 5+ years of backend work\n\nPreferred:\n- Kubernetes",
      );
      expect(result.jdText).not.toContain("payment systems");
    }
  });

  it("fails cleanly when parsed_output is null instead of throwing", async () => {
    const result = await parseJobDescription(LONG_JD, {
      client: clientReturning(null),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/structured fields/i);
  });

  it("rejects text too short to be a posting without calling the API", async () => {
    const client = clientReturning(base);
    const result = await parseJobDescription("too short", { client });

    expect(result.ok).toBe(false);
    expect((client as never as { messages: { parse: ReturnType<typeof vi.fn> } }).messages.parse)
      .not.toHaveBeenCalled();
  });

  it("surfaces an error instead of throwing when the API fails", async () => {
    const client = {
      messages: { parse: vi.fn().mockRejectedValue(new Error("503")) },
    } as never;

    const result = await parseJobDescription(LONG_JD, { client });
    expect(result.ok).toBe(false);
  });
});

describe("missing API key", () => {
  /** Runs a body with ANTHROPIC_API_KEY unset, restoring it afterwards. */
  async function withoutKey(fn: () => Promise<void>) {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      await fn();
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
    }
  }

  it("reports the misconfiguration instead of throwing at the caller", async () => {
    await withoutKey(async () => {
      // No injected client, so the real getClient() path runs.
      const result = await parseJobDescription(LONG_JD);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/ANTHROPIC_API_KEY/);
    });
  });
});

describe("qualificationsSummary", () => {
  it("lists required then preferred points as bullets", () => {
    expect(
      qualificationsSummary({
        ...base,
        requiredSkills: ["Go", "Distributed systems"],
        niceToHaveSkills: ["Rust"],
      }),
    ).toBe("Required:\n- Go\n- Distributed systems\n\nPreferred:\n- Rust");
  });

  it("omits a section the posting does not have", () => {
    expect(
      qualificationsSummary({ ...base, requiredSkills: ["Go"] }),
    ).toBe("Required:\n- Go");
    expect(
      qualificationsSummary({ ...base, niceToHaveSkills: ["Rust"] }),
    ).toBe("Preferred:\n- Rust");
  });

  it("is empty when the posting lists no qualifications", () => {
    expect(qualificationsSummary(base)).toBe("");
  });

  it("strips bullet glyphs the model left on a point", () => {
    expect(
      qualificationsSummary({
        ...base,
        requiredSkills: ["\u2022 Go", "- Rust", "  * Python  "],
      }),
    ).toBe("Required:\n- Go\n- Rust\n- Python");
  });
});

describe("emailDomainFromUrl", () => {
  it("strips www and lowercases", () => {
    expect(emailDomainFromUrl("https://www.Acme.com/careers")).toBe("acme.com");
  });

  it("returns null for junk", () => {
    expect(emailDomainFromUrl("not a url")).toBeNull();
    expect(emailDomainFromUrl(null)).toBeNull();
  });
});
