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
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {pending ? "Checking…" : "Run stale check"}
      </button>
    </div>
  );
}
