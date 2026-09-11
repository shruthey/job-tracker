import { NextResponse } from "next/server";

import { checkStaleApplications } from "@/lib/reminders";

/**
 * Dev stand-in for the Phase 2 EventBridge schedule, which will invoke
 * `checkStaleApplications()` directly. Blocked outside development so a
 * deployed build cannot have its data mutated by an unauthenticated GET.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const url = new URL(request.url);
  const staleDays = Number(url.searchParams.get("staleDays") ?? "");
  const ghostDays = Number(url.searchParams.get("ghostDays") ?? "");
  const markGhosted = url.searchParams.get("markGhosted") !== "false";

  const result = await checkStaleApplications({
    ...(Number.isFinite(staleDays) && staleDays > 0 ? { staleDays } : {}),
    ...(Number.isFinite(ghostDays) && ghostDays > 0 ? { ghostDays } : {}),
    markGhosted,
  });

  return NextResponse.json(result);
}
