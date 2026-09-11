import { createApplication } from "@/lib/actions";
import { ApplicationForm } from "@/components/application-form";

export default function NewApplicationPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-ink dark:text-muted">
        New application
      </h1>
      <div className="rounded-xl border border-chrome bg-surface p-6 shadow-sm dark:border-chrome dark:bg-chrome">
        <ApplicationForm
          action={createApplication}
          submitLabel="Create application"
          cancelHref="/applications"
        />
      </div>
    </div>
  );
}
