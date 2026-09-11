import { JdImport } from "@/components/jd-import";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-muted">
        Import from a job description
      </h1>
      <p className="mb-6 mt-1 text-sm text-muted dark:text-muted">
        Paste a link or the posting text, and the fields are extracted for you to review.
      </p>
      <JdImport />
    </div>
  );
}
