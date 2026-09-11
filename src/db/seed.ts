/**
 * Seeds ~15 applications with status history spread over the past few months.
 *
 * The history is what matters: analytics derive time-in-stage and funnel
 * conversion from `status_events`, so events are backdated along a realistic
 * path rather than all stamped at insert time.
 *
 * Run with `npm run db:seed`. Idempotent — it truncates first.
 */
import "dotenv/config";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

import * as schema from "./schema";
import type { ApplicationStatus } from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/job_tracker";

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|co|gmbh|plc)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type SeedCompany = {
  name: string;
  website: string;
  emailDomain: string;
};

type SeedApplication = {
  company: string;
  title: string;
  source: string;
  location: string;
  remoteType: "onsite" | "hybrid" | "remote";
  salaryMin?: number;
  salaryMax?: number;
  /** [status, daysAgo] in chronological order. First entry is the creation. */
  path: [ApplicationStatus, number][];
};

const COMPANIES: SeedCompany[] = [
  { name: "Stripe", website: "https://stripe.com", emailDomain: "stripe.com" },
  { name: "Linear", website: "https://linear.app", emailDomain: "linear.app" },
  { name: "Vercel", website: "https://vercel.com", emailDomain: "vercel.com" },
  { name: "Anthropic", website: "https://anthropic.com", emailDomain: "anthropic.com" },
  { name: "Figma", website: "https://figma.com", emailDomain: "figma.com" },
  { name: "Notion", website: "https://notion.so", emailDomain: "makenotion.com" },
  { name: "Ramp", website: "https://ramp.com", emailDomain: "ramp.com" },
  { name: "Datadog", website: "https://datadoghq.com", emailDomain: "datadoghq.com" },
  { name: "Cloudflare", website: "https://cloudflare.com", emailDomain: "cloudflare.com" },
  { name: "Supabase", website: "https://supabase.com", emailDomain: "supabase.io" },
  { name: "Render", website: "https://render.com", emailDomain: "render.com" },
  { name: "Retool", website: "https://retool.com", emailDomain: "retool.com" },
];

const APPLICATIONS: SeedApplication[] = [
  {
    company: "Stripe",
    title: "Senior Software Engineer, Payments",
    source: "referral",
    location: "San Francisco, CA",
    remoteType: "hybrid",
    salaryMin: 190000,
    salaryMax: 250000,
    path: [["saved", 96], ["applied", 94], ["screen", 88], ["interview", 80], ["onsite", 70], ["offer", 62]],
  },
  {
    company: "Linear",
    title: "Product Engineer",
    source: "LinkedIn",
    location: "Remote (US)",
    remoteType: "remote",
    salaryMin: 170000,
    salaryMax: 210000,
    path: [["saved", 88], ["applied", 86], ["screen", 79], ["interview", 71], ["onsite", 60], ["rejected", 52]],
  },
  {
    company: "Vercel",
    title: "Staff Frontend Engineer",
    source: "careers page",
    location: "Remote (Global)",
    remoteType: "remote",
    salaryMin: 200000,
    salaryMax: 260000,
    path: [["saved", 75], ["applied", 73], ["screen", 66], ["interview", 58], ["onsite", 47]],
  },
  {
    company: "Anthropic",
    title: "Software Engineer, Product",
    source: "referral",
    location: "San Francisco, CA",
    remoteType: "hybrid",
    salaryMin: 220000,
    salaryMax: 300000,
    path: [["saved", 68], ["applied", 66], ["screen", 59], ["interview", 50]],
  },
  {
    company: "Figma",
    title: "Senior Engineer, Design Systems",
    source: "LinkedIn",
    location: "New York, NY",
    remoteType: "hybrid",
    salaryMin: 185000,
    salaryMax: 235000,
    path: [["saved", 64], ["applied", 61], ["screen", 54], ["rejected", 46]],
  },
  {
    company: "Notion",
    title: "Full Stack Engineer",
    source: "careers page",
    location: "Remote (US)",
    remoteType: "remote",
    salaryMin: 175000,
    salaryMax: 220000,
    path: [["saved", 58], ["applied", 55], ["screen", 48], ["interview", 40]],
  },
  {
    company: "Ramp",
    title: "Backend Engineer, Platform",
    source: "recruiter outreach",
    location: "New York, NY",
    remoteType: "onsite",
    salaryMin: 195000,
    salaryMax: 245000,
    path: [["saved", 52], ["applied", 49], ["screen", 42]],
  },
  {
    company: "Datadog",
    title: "Software Engineer II",
    source: "LinkedIn",
    location: "Boston, MA",
    remoteType: "hybrid",
    salaryMin: 160000,
    salaryMax: 200000,
    // Applied and never heard back — the ghosting sweep's target.
    path: [["saved", 47], ["applied", 44], ["ghosted", 12]],
  },
  {
    company: "Cloudflare",
    title: "Systems Engineer",
    source: "careers page",
    location: "Austin, TX",
    remoteType: "hybrid",
    salaryMin: 165000,
    salaryMax: 205000,
    path: [["saved", 40], ["applied", 37], ["screen", 30], ["interview", 22]],
  },
  {
    company: "Supabase",
    title: "Developer Experience Engineer",
    source: "Twitter",
    location: "Remote (Global)",
    remoteType: "remote",
    salaryMin: 150000,
    salaryMax: 190000,
    path: [["saved", 34], ["applied", 31], ["screen", 24]],
  },
  {
    company: "Render",
    title: "Infrastructure Engineer",
    source: "LinkedIn",
    location: "Remote (US)",
    remoteType: "remote",
    salaryMin: 170000,
    salaryMax: 215000,
    path: [["saved", 28], ["applied", 25], ["withdrawn", 18]],
  },
  {
    company: "Retool",
    title: "Product Engineer, Enterprise",
    source: "referral",
    location: "San Francisco, CA",
    remoteType: "onsite",
    salaryMin: 180000,
    salaryMax: 230000,
    path: [["saved", 22], ["applied", 19], ["screen", 11]],
  },
  {
    company: "Stripe",
    title: "Engineering Manager, Billing",
    source: "recruiter outreach",
    location: "Seattle, WA",
    remoteType: "hybrid",
    salaryMin: 230000,
    salaryMax: 290000,
    path: [["saved", 16], ["applied", 13]],
  },
  {
    company: "Figma",
    title: "Platform Engineer",
    source: "careers page",
    location: "Remote (US)",
    remoteType: "remote",
    path: [["saved", 9], ["applied", 6]],
  },
  {
    company: "Anthropic",
    title: "Infrastructure Engineer, Compute",
    source: "LinkedIn",
    location: "Remote (US)",
    remoteType: "remote",
    salaryMin: 210000,
    salaryMax: 280000,
    path: [["saved", 4]],
  },
];

async function main() {
  console.log("seeding", connectionString.replace(/:[^:@]+@/, ":***@"));

  // Cascades to applications, status_events, documents, reminders, interviews.
  await db.execute(
    sql`truncate table ${schema.companies}, ${schema.applications} restart identity cascade`,
  );

  const companyIds = new Map<string, string>();
  for (const c of COMPANIES) {
    const [row] = await db
      .insert(schema.companies)
      .values({
        name: c.name,
        normalizedName: normalize(c.name),
        website: c.website,
        emailDomain: c.emailDomain,
      })
      .returning({ id: schema.companies.id });
    companyIds.set(c.name, row.id);
  }
  console.log(`  ${COMPANIES.length} companies`);

  // Board position per column, assigned in the sparse 1000/2000/3000 scheme.
  const columnCursor = new Map<ApplicationStatus, number>();

  let eventCount = 0;
  for (const app of APPLICATIONS) {
    const companyId = companyIds.get(app.company);
    if (!companyId) throw new Error(`unknown company ${app.company}`);

    const finalStatus = app.path[app.path.length - 1][0];
    const createdAt = daysAgo(app.path[0][1]);
    const appliedEntry = app.path.find(([s]) => s === "applied");

    const order = (columnCursor.get(finalStatus) ?? 0) + 1000;
    columnCursor.set(finalStatus, order);

    const [inserted] = await db
      .insert(schema.applications)
      .values({
        companyId,
        title: app.title,
        status: finalStatus,
        source: app.source,
        location: app.location,
        remoteType: app.remoteType,
        salaryMin: app.salaryMin ?? null,
        salaryMax: app.salaryMax ?? null,
        currency: app.salaryMin ? "USD" : null,
        jobUrl: `https://example.com/jobs/${normalize(app.company).replace(/\s+/g, "-")}`,
        appliedAt: appliedEntry ? daysAgo(appliedEntry[1]) : null,
        boardOrder: order,
        createdAt,
        updatedAt: daysAgo(app.path[app.path.length - 1][1]),
      })
      .returning({ id: schema.applications.id });

    // Walk the path, writing one event per transition. The first entry is the
    // creation event, so its `fromStatus` is null.
    let previous: ApplicationStatus | null = null;
    for (const [status, days] of app.path) {
      await db.insert(schema.statusEvents).values({
        applicationId: inserted.id,
        fromStatus: previous,
        toStatus: status,
        occurredAt: daysAgo(days),
        source: status === "ghosted" ? "system" : "manual",
      });
      previous = status;
      eventCount++;
    }

    // A couple of open follow-up reminders so the reminders UI has something.
    if (finalStatus === "screen" || finalStatus === "interview") {
      await db.insert(schema.reminders).values({
        applicationId: inserted.id,
        dueAt: daysAgo(-3),
        kind: "follow_up",
        message: `Follow up with ${app.company} about ${app.title}`,
      });
    }
  }

  console.log(`  ${APPLICATIONS.length} applications`);
  console.log(`  ${eventCount} status events`);
  console.log("done");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
