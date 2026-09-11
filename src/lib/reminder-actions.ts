"use server";

import { revalidatePath } from "next/cache";

import { checkStaleApplications, type SweepResult } from "@/lib/reminders";

/** Manual trigger for the sweep. In Phase 2 EventBridge calls the same function. */
export async function runSweep(): Promise<SweepResult> {
  const result = await checkStaleApplications();

  revalidatePath("/reminders");
  revalidatePath("/board");
  revalidatePath("/applications");

  return result;
}
