/**
 * The shared width cap, previously applied once on `main` in the app layout.
 * It moved out here so a page can choose its own: `main` now supplies only the
 * page gutter, and each page wraps its own content in this.
 *
 * Two sizes, because the pages divide into two kinds:
 *
 *   default  the reading-width cap the app has always used. Right for pages
 *            that are mostly prose, forms, and narrow tables, where a longer
 *            line is harder to read rather than more useful.
 *   wide     for pages laid out in columns, where the extra width becomes
 *            another column of content instead of a longer line. Companies is
 *            this: its grid splits into two columns, and capping it at the
 *            reading width squeezes both.
 *
 * The board uses neither — it renders without this wrapper and takes the full
 * viewport, because its columns scroll sideways and every pixel a cap trims is
 * a column the user has to scroll to reach.
 */
export function PageWidth({
  size = "default",
  children,
}: {
  size?: "default" | "wide";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mx-auto w-full ${size === "wide" ? "max-w-[110rem]" : "max-w-7xl"}`}
    >
      {children}
    </div>
  );
}
