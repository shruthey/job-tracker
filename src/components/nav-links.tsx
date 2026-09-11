"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/board", label: "Board" },
  { href: "/applications", label: "Applications" },
  { href: "/companies", label: "Companies" },
  { href: "/analytics", label: "Analytics" },
  { href: "/reminders", label: "Reminders" },
  { href: "/admin", label: "Admin" },
];

/**
 * A client component only because the active link needs the current path.
 * `startsWith` rather than equality so a detail page keeps its section lit —
 * /applications/123 should still show Applications as where you are.
 */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1">
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-violet-100 font-medium text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
