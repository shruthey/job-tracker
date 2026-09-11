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
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <Link href="/board" className="flex items-center gap-2">
            {/* The same mark as the browser tab, in the brand gradient, so the
                tab and the page read as one product. */}
            <BrandMark />
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-sm font-semibold tracking-tight text-transparent dark:from-violet-300 dark:to-indigo-300">
              Job Tracker
            </span>
          </Link>

          <NavLinks />

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/applications/import"
              className="rounded-lg border border-violet-200 px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300 dark:hover:border-violet-700 dark:hover:bg-violet-950/50"
            >
              Import from JD
            </Link>
            <Link
              href="/applications/new"
              className="rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-violet-600/25 transition-shadow hover:shadow-md hover:shadow-violet-600/35"
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
