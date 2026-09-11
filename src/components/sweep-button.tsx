"use client";

import { useState, useTransition } from "react";

import { runSweep } from "@/lib/reminder-actions";

export function SweepButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      {message ? (
        <span className="text-xs text-muted dark:text-muted">{message}</span>
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
        className="rounded-lg border border-chrome bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition-colors hover:border-brand hover:text-brand disabled:opacity-50 dark:border-chrome dark:bg-chrome dark:text-muted dark:hover:border-brand dark:hover:text-brand"
      >
        {pending ? "Checking…" : "Run stale check"}
      </button>
    </div>
  );
}
