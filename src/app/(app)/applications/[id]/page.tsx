import Link from "next/link";
import { notFound } from "next/navigation";

import { updateApplication, archiveApplication } from "@/lib/actions";
import { ApplicationForm } from "@/components/application-form";
import { StatusBadge } from "@/components/status-badge";
import { DocumentsPanel } from "@/components/documents-panel";
import { InterviewsPanel } from "@/components/interviews-panel";
import { TagPicker } from "@/components/tag-picker";
import { ExternalLinkIcon } from "@/components/icons";
import {
  getApplication,
  getStatusHistory,
  listDocuments,
  listInterviews,
} from "@/lib/queries";
import { formatDate, STATUS_LABELS } from "@/lib/format";

export default async function ApplicationDetailPage(
  props: PageProps<"/applications/[id]">,
) {
  const { id } = await props.params;

  const application = await getApplication(id);
  if (!application) notFound();

  const [history, docs, interviews] = await Promise.all([
    getStatusHistory(id),
    listDocuments(id),
    listInterviews(id),
  ]);

  // Bind the id so the form's action keeps the (prev, formData) signature.
  const action = updateApplication.bind(null, id);
  const archive = archiveApplication.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {application.title}
            </h1>
            {application.jobUrl ? (
              <a
                href={application.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open job posting"
                aria-label={`Open the job posting for ${application.title} at ${application.companyName} in a new tab`}
                className="-ml-1.5 rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-500 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <ExternalLinkIcon className="h-4 w-4" />
              </a>
            ) : null}
            <StatusBadge status={application.status} />
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {application.companyWebsite ? (
              <a
                href={application.companyWebsite}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {application.companyName}
              </a>
            ) : (
              application.companyName
            )}
            {" · created "}
            {formatDate(application.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={archive}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-rose-800 dark:hover:bg-rose-950 dark:hover:text-rose-300"
            >
              Archive
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Tags
            </h2>
            <TagPicker
              applicationId={id}
              status={application.status}
              tags={application.tags}
            />
          </section>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <ApplicationForm
              action={action}
              submitLabel="Save changes"
              cancelHref="/applications"
              jdPosition="top"
              values={{
                company: application.companyName,
                title: application.title,
                status: application.status,
                jobUrl: application.jobUrl ?? "",
                location: application.location ?? "",
                remoteType: application.remoteType ?? "",
                sponsorship: application.sponsorship ?? "",
                salaryMin: application.salaryMin,
                salaryMax: application.salaryMax,
                currency: application.currency ?? "",
                jdRaw: application.jdRaw ?? "",
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <InterviewsPanel applicationId={id} interviews={interviews} />

          <DocumentsPanel applicationId={id} documents={docs} />

          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Status history
            </h2>
            {history.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No transitions recorded.
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {history.map((event) => (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                    <div>
                      <p className="text-zinc-900 dark:text-zinc-100">
                        {event.fromStatus
                          ? `${STATUS_LABELS[event.fromStatus]} → ${STATUS_LABELS[event.toStatus]}`
                          : `Created as ${STATUS_LABELS[event.toStatus]}`}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDate(event.occurredAt)}
                        {event.source !== "manual" ? ` · ${event.source}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <Link
            href="/applications"
            className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Back to all applications
          </Link>
        </div>
      </div>
    </div>
  );
}
