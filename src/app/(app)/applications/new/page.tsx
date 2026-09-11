import { createApplication } from "@/lib/actions";
import { ApplicationForm } from "@/components/application-form";

export default function NewApplicationPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        New application
      </h1>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <ApplicationForm
          action={createApplication}
          submitLabel="Create application"
          cancelHref="/applications"
        />
      </div>
    </div>
  );
}
