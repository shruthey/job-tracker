import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { NavLinks } from "@/components/nav-links";
import { BrandMark } from "@/components/icons";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      {/*
        Sticky so the nav and the primary actions stay reachable on the board,
        which scrolls both ways. The blur keeps the tinted page ground visible
        through the bar instead of capping it with a flat white slab.
      */}
      <header className="sticky top-0 z-30 border-b border-chrome/80 bg-surface/80 backdrop-blur-md dark:border-chrome/80 dark:bg-chrome/80">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <Link href="/board" className="flex items-center gap-2">
            {/* The same mark as the browser tab, in the brand gradient, so the
                tab and the page read as one product. */}
            <BrandMark />
            <span className="bg-gradient-to-r from-brand to-brand bg-clip-text text-sm font-semibold tracking-tight text-transparent dark:from-brand dark:to-brand">
              Job Tracker
            </span>
          </Link>

          <NavLinks />

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/applications/import"
              className="rounded-lg border border-brand px-3 py-1.5 text-sm font-medium text-brand transition-colors hover:border-brand hover:bg-brand/20 dark:border-brand dark:text-ink dark:hover:border-brand dark:hover:bg-brand/50"
            >
              Import from JD
            </Link>
            <Link
              href="/applications/new"
              className="rounded-lg bg-gradient-to-br from-brand to-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-brand/25 transition-shadow hover:shadow-md hover:shadow-brand/35"
            >
              New application
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
