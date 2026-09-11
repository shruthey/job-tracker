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
    <section className="rounded-xl border border-chrome bg-surface p-5 shadow-sm dark:border-chrome dark:bg-chrome">
      <h2 className="mb-3 text-sm font-semibold text-ink dark:text-muted">
        Documents
      </h2>

      {documents.length === 0 ? (
        <p className="text-sm text-muted dark:text-muted">
          No resume or cover letter attached yet.
        </p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-start justify-between gap-2 rounded-md border border-chrome px-3 py-2 dark:border-chrome"
            >
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => download(doc.id)}
                  disabled={busyId === doc.id}
                  className="block truncate text-sm font-medium text-ink underline hover:text-muted disabled:opacity-50 dark:text-muted"
                >
                  {busyId === doc.id ? "Preparing…" : doc.filename}
                </button>
                <p className="text-xs text-muted dark:text-muted">
                  {doc.kind === "resume" ? "Resume" : "Cover letter"}
                  {doc.sizeBytes ? ` · ${formatSize(doc.sizeBytes)}` : ""}
                  {` · ${formatDate(doc.createdAt)}`}
                </p>
                <p
                  className="truncate font-mono text-[10px] text-muted dark:text-muted"
                  title={doc.contentHash}
                >
                  {doc.contentHash.slice(0, 12)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => startTransition(() => removeDocument(doc.id))}
                className="shrink-0 text-xs text-muted hover:text-warn dark:hover:text-warn"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-col gap-2 border-t border-chrome pt-4 dark:border-chrome">
        <select
          name="kind"
          defaultValue="resume"
          className="rounded-lg border border-chrome bg-surface px-2.5 py-1.5 text-sm transition-colors focus:border-brand dark:border-chrome dark:bg-chrome dark:text-muted"
        >
          <option value="resume">Resume</option>
          <option value="cover_letter">Cover letter</option>
        </select>
        <input
          type="file"
          name="file"
          required
          accept=".pdf,.doc,.docx,.txt,.md"
          className="text-xs text-muted file:mr-2 file:rounded-md file:border-0 file:bg-ground file:px-3 file:py-1.5 file:text-xs file:font-medium dark:text-muted dark:file:bg-chrome dark:file:text-muted"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-br from-brand to-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-brand/25 transition-shadow hover:shadow-md hover:shadow-brand/35 disabled:opacity-50 disabled:shadow-none"
        >
          {pending ? "Uploading…" : "Upload"}
        </button>
        {state.message ? (
          <p
            className={`text-xs ${
              state.ok
                ? "text-brand dark:text-brand"
                : "text-warn dark:text-warn"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
