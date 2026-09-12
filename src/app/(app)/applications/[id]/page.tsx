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
import { PageWidth } from "@/components/page";

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
    <PageWidth>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-muted">
                {application.title}
              </h1>
              {application.jobUrl ? (
                <a
                  href={application.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open job posting"
                  aria-label={`Open the job posting for ${application.title} at ${application.companyName} in a new tab`}
                  className="-ml-1.5 rounded p-1.5 text-muted transition-colors hover:bg-ground hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-chrome dark:text-muted dark:hover:bg-chrome dark:hover:text-muted"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                </a>
              ) : null}
              <StatusBadge status={application.status} />
            </div>
            <p className="mt-1 text-sm text-muted dark:text-muted">
              {application.companyWebsite ? (
                <a
                  href={application.companyWebsite}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-ink dark:hover:text-muted"
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
                className="rounded-lg border border-chrome bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-warn hover:bg-warn/20 hover:text-ink dark:border-chrome dark:bg-chrome dark:text-muted dark:hover:border-warn dark:hover:bg-warn/20 dark:hover:text-ink"
              >
                Archive
              </button>
            </form>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <section className="rounded-xl border border-chrome bg-surface p-5 shadow-sm dark:border-chrome dark:bg-chrome">
              <h2 className="mb-3 text-sm font-semibold text-ink dark:text-muted">
                Tags
              </h2>
              <TagPicker
                applicationId={id}
                status={application.status}
                tags={application.tags}
              />
            </section>

            <div className="rounded-xl border border-chrome bg-surface p-6 shadow-sm dark:border-chrome dark:bg-chrome">
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

            <section className="rounded-xl border border-chrome bg-surface p-5 shadow-sm dark:border-chrome dark:bg-chrome">
              <h2 className="mb-3 text-sm font-semibold text-ink dark:text-muted">
                Status history
              </h2>
              {history.length === 0 ? (
                <p className="text-sm text-muted dark:text-muted">
                  No transitions recorded.
                </p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {history.map((event) => (
                    <li key={event.id} className="flex gap-3 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-chrome dark:bg-chrome" />
                      <div>
                        <p className="text-ink dark:text-muted">
                          {event.fromStatus
                            ? `${STATUS_LABELS[event.fromStatus]} → ${STATUS_LABELS[event.toStatus]}`
                            : `Created as ${STATUS_LABELS[event.toStatus]}`}
                        </p>
                        <p className="text-xs text-muted dark:text-muted">
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
              className="text-sm text-muted underline hover:text-ink dark:text-muted dark:hover:text-muted"
            >
              ← Back to all applications
            </Link>
          </div>
        </div>
      </div>
    </PageWidth>
  );
}
