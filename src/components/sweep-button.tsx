"use client";

import { useState, useTransition } from "react";

import { runSweep } from "@/lib/reminder-actions";

export function SweepButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      {message ? (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{message}</span>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await runSweep();
            setMessage(
              `${result.stale} stale · ${result.remindersCreated} reminders · ${result.ghosted} ghosted`,
            );
          })
        }
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:border-violet-300 hover:text-violet-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-violet-700 dark:hover:text-violet-300"
      >
        {pending ? "Checking…" : "Run stale check"}
      </button>
    </div>
  );
}
