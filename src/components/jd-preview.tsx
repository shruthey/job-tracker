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
          className="max-h-96 w-full overflow-y-auto whitespace-pre-wrap rounded-md border border-chrome bg-ground px-3 py-2 text-xs leading-relaxed text-ink dark:border-chrome dark:bg-chrome dark:text-muted"
        >
          {segments.map((segment, i) =>
            segment.emphasis ? (
              <strong
                key={i}
                className="font-semibold text-ink dark:text-muted"
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
          className="rounded-md border border-dashed border-chrome px-3 py-4 text-center text-xs text-muted dark:border-chrome dark:text-muted"
        >
          No description.
        </p>
      )}
    </>
  );
}
