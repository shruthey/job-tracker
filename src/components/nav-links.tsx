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
                ? "bg-brand/20 font-medium text-ink dark:bg-brand/30 dark:text-ink"
                : "text-muted hover:bg-ground hover:text-ink dark:text-muted dark:hover:bg-chrome dark:hover:text-muted"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
