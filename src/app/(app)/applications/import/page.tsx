import { JdImport } from "@/components/jd-import";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Import from a job description
      </h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Paste a link or the posting text, and the fields are extracted for you to review.
      </p>
      <JdImport />
    </div>
  );
}
