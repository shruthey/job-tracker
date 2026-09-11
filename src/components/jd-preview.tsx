import { highlightJd } from "@/lib/highlight-jd";

/**
 * The description, shown read-only with years of experience, tools, and
 * technologies emphasized.
 *
 * The text is not editable here — it comes from the parsed posting, and the
 * hidden input is what carries it through the form submission unchanged.
 */
export function JdPreview({
  id,
  name,
  value,
}: {
  id: string;
  name: string;
  value: string;
}) {
  const segments = highlightJd(value);

  return (
    <>
      {/* Round-trips the description so saving the form cannot drop it. */}
      <input type="hidden" name={name} value={value} />

      {value.trim() ? (
        <div
          id={id}
          className="max-h-96 w-full overflow-y-auto whitespace-pre-wrap rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
        >
          {segments.map((segment, i) =>
            segment.emphasis ? (
              <strong
                key={i}
                className="font-semibold text-zinc-950 dark:text-zinc-50"
              >
                {segment.text}
              </strong>
            ) : (
              <span key={i}>{segment.text}</span>
            ),
          )}
        </div>
      ) : (
        <p
          id={id}
          className="rounded-md border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
        >
          No description.
        </p>
      )}
    </>
  );
}
