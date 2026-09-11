import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";


/**
 * Every field is nullable on purpose. Job posts routinely omit salary,
 * location, or seniority, and a schema that demands them pushes the model into
 * inventing values — which is worse than a blank the user can fill in.
 */
export const JobDescriptionSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().nullable(),
  remoteType: z.enum(["onsite", "hybrid", "remote"]).nullable(),
  /**
   * Null unless the posting is explicit about work authorization. See the
   * `sponsorship` enum in the schema — a guess here hides roles you could take.
   */
  sponsorship: z
    .enum([
      "will_sponsor",
      "no_sponsorship",
      "citizen",
      "green_card",
      "clearance",
    ])
    .nullable(),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  currency: z.string().nullable(),
  seniority: z.string().nullable(),
  requiredSkills: z.array(z.string()),
  niceToHaveSkills: z.array(z.string()),
});

export type ParsedJobDescription = z.infer<typeof JobDescriptionSchema>;

export type ParseResult =
  | {
      ok: true;
      data: ParsedJobDescription;
      /** The description to save: qualification bullets, not the raw posting. */
      jdText: string;
    }
  | { ok: false; error: string };

/** Long postings cost tokens without adding signal past the first few pages. */
const MAX_INPUT_CHARS = 24_000;

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!cachedClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    cachedClient = new Anthropic({ apiKey });
  }
  return cachedClient;
}

/**
 * Extracts structured fields from a pasted job description.
 *
 * The caller shows the result in an editable form — nothing here is written
 * straight to the database.
 */
export async function parseJobDescription(
  jdText: string,
  options: { client?: Anthropic } = {},
): Promise<ParseResult> {
  const text = jdText.trim();

  if (text.length < 40) {
    return { ok: false, error: "That job description is too short to parse." };
  }

  try {
    // Inside the try on purpose: a missing API key throws here, and callers
    // render this function's error string rather than an exception overlay.
    const client = options.client ?? getClient();

    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4000,
      output_config: {
        format: zodOutputFormat(JobDescriptionSchema),
        effort: "low",
      },
      messages: [
        {
          role: "user",
          content:
            "Extract structured data from the job posting below.\n\n" +
            "For requiredSkills and niceToHaveSkills, pull the individual " +
            "points from the posting's required and preferred qualifications " +
            "sections. Keep each point close to how the posting words it, " +
            "trimmed to one line and stripped of bullet characters. Do not " +
            "invent points, and leave a list empty when the posting has no " +
            "such section.\n\n" +
            "For sponsorship, report only what the posting states outright " +
            "about work authorization, and use null when it says nothing — " +
            "most postings say nothing, and null is the right answer there. " +
            "Use will_sponsor when it offers visa sponsorship; " +
            "no_sponsorship when it says it will not sponsor or requires " +
            "authorization to work without sponsorship now or in the future; " +
            "citizen when it requires citizenship; green_card when it " +
            "requires permanent residency; and clearance when it requires an " +
            "existing or obtainable security clearance. When a posting names " +
            "more than one, pick the one that restricts hardest: clearance " +
            "over citizen, citizen over green_card, green_card over " +
            "no_sponsorship.\n\n" +
            text.slice(0, MAX_INPUT_CHARS),
        },
      ],
    });

    // Null when the model's output does not satisfy the schema. Guard, never assert.
    if (!response.parsed_output) {
      return {
        ok: false,
        error: "Could not read structured fields from that posting.",
      };
    }

    const data = normalize(response.parsed_output);

    // The description we keep is the qualifications list, not the whole
    // posting — see `qualificationsSummary`.
    return { ok: true, data, jdText: qualificationsSummary(data) };
  } catch (error) {
    console.error("parseJobDescription failed", error);
    const message =
      error instanceof Error && /ANTHROPIC_API_KEY/.test(error.message)
        ? "ANTHROPIC_API_KEY is not configured."
        : "The parsing service is unavailable right now.";
    return { ok: false, error: message };
  }
}

/**
 * Post-processing the model should not be trusted to get right:
 * salary bounds sometimes arrive swapped, and hourly or thousands-denominated
 * figures show up as 85 or 180 rather than 85000/180000.
 */
export function normalize(parsed: ParsedJobDescription): ParsedJobDescription {
  let { salaryMin, salaryMax } = parsed;

  const scale = (n: number | null) =>
    n !== null && n > 0 && n < 1000 ? n * 1000 : n;

  salaryMin = scale(salaryMin);
  salaryMax = scale(salaryMax);

  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    [salaryMin, salaryMax] = [salaryMax, salaryMin];
  }

  return {
    ...parsed,
    company: parsed.company.trim(),
    title: parsed.title.trim(),
    salaryMin,
    salaryMax,
    currency: parsed.currency?.trim().toUpperCase() || null,
    requiredSkills: parsed.requiredSkills.filter((s) => s.trim().length > 0),
    niceToHaveSkills: parsed.niceToHaveSkills.filter((s) => s.trim().length > 0),
  };
}

/**
 * The description saved with a parsed application: the required and preferred
 * qualifications as a bullet list, and nothing else.
 *
 * The full posting is deliberately dropped. Boilerplate — benefits, EEO
 * statements, company blurb — is the bulk of a posting's text and none of it
 * helps when reviewing an application later. A manually typed description is
 * never passed through here, so whatever the user writes is kept verbatim.
 */
export function qualificationsSummary(parsed: ParsedJobDescription): string {
  const sections: string[] = [];

  // The model is asked for plain points, but postings are full of leading
  // bullet glyphs and they survive often enough to strip here.
  const bullets = (items: string[]) =>
    items
      .map((item) => `- ${item.replace(/^[\s\u2022*-]+/, "").trim()}`)
      .join("\n");

  if (parsed.requiredSkills.length > 0) {
    sections.push(`Required:\n${bullets(parsed.requiredSkills)}`);
  }
  if (parsed.niceToHaveSkills.length > 0) {
    sections.push(`Preferred:\n${bullets(parsed.niceToHaveSkills)}`);
  }

  return sections.join("\n\n");
}

/** Best-effort domain for `companies.emailDomain` — the Phase 2 join key. */
export function emailDomainFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
