"use client";

import { useActionState, useState, useTransition } from "react";

import type { Document } from "@/db/schema";
import { getDownloadUrl, removeDocument, uploadDocument } from "@/lib/document-actions";
import { formatDate } from "@/lib/format";

function formatSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPanel({
  applicationId,
  documents,
}: {
  applicationId: string;
  documents: Document[];
}) {
  const upload = uploadDocument.bind(null, applicationId);
  const [state, formAction, pending] = useActionState(upload, { ok: true });
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Presign at click time so the URL is always fresh when it is used.
  function download(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const url = await getDownloadUrl(id);
      setBusyId(null);
      if (url) window.open(url, "_blank", "noopener");
    });
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Documents
      </h2>

      {documents.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No resume or cover letter attached yet.
        </p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-start justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => download(doc.id)}
                  disabled={busyId === doc.id}
                  className="block truncate text-sm font-medium text-zinc-900 underline hover:text-zinc-600 disabled:opacity-50 dark:text-zinc-100"
                >
                  {busyId === doc.id ? "Preparing…" : doc.filename}
                </button>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {doc.kind === "resume" ? "Resume" : "Cover letter"}
                  {doc.sizeBytes ? ` · ${formatSize(doc.sizeBytes)}` : ""}
                  {` · ${formatDate(doc.createdAt)}`}
                </p>
                <p
                  className="truncate font-mono text-[10px] text-zinc-400 dark:text-zinc-600"
                  title={doc.contentHash}
                >
                  {doc.contentHash.slice(0, 12)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => startTransition(() => removeDocument(doc.id))}
                className="shrink-0 text-xs text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <select
          name="kind"
          defaultValue="resume"
          className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm transition-colors focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <option value="resume">Resume</option>
          <option value="cover_letter">Cover letter</option>
        </select>
        <input
          type="file"
          name="file"
          required
          accept=".pdf,.doc,.docx,.txt,.md"
          className="text-xs text-zinc-600 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-violet-600/25 transition-shadow hover:shadow-md hover:shadow-violet-600/35 disabled:opacity-50 disabled:shadow-none"
        >
          {pending ? "Uploading…" : "Upload"}
        </button>
        {state.message ? (
          <p
            className={`text-xs ${
              state.ok
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
