"use client";

import { useId, useState } from "react";

import { InfoIcon } from "@/components/icons";

/**
 * Read-only peek at a company's contact names, used on the board and the
 * applications list. Contacts are added on the Companies page — this only
 * shows what is already there, and renders nothing at all when there are none,
 * so the icon's presence is itself the signal that a contact exists.
 *
 * Opens on hover *and* on focus/click: hover alone would put the names out of
 * reach of the keyboard and of touch, where there is no hover state.
 */
export function ContactsHint({
  contacts,
  companyName,
  className = "",
}: {
  contacts: string[];
  companyName: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  if (contacts.length === 0) return null;

  const label =
    contacts.length === 1
      ? `1 contact at ${companyName}`
      : `${contacts.length} contacts at ${companyName}`;

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        // The card behind this is a drag handle and a link; neither should
        // react to a press on the icon.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? panelId : undefined}
        className="rounded-full p-0.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-500 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <InfoIcon className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <span
          id={panelId}
          role="tooltip"
          // Opens downward: upward it would cover the column header on the
          // board, and the first row's panel would clip off the top of a table.
          className="absolute top-full right-0 z-20 mt-1 w-max max-w-52 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-left shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {contacts.length === 1 ? "Contact" : "Contacts"}
          </span>
          {contacts.map((name) => (
            <span
              key={name}
              className="block truncate text-xs text-zinc-800 dark:text-zinc-100"
            >
              {name}
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}
