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
        className="rounded-full p-0.5 text-muted transition-colors hover:bg-ground hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-chrome dark:text-muted dark:hover:bg-chrome dark:hover:text-muted"
      >
        <InfoIcon className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <span
          id={panelId}
          role="tooltip"
          // Opens downward: upward it would cover the column header on the
          // board, and the first row's panel would clip off the top of a table.
          className="absolute top-full right-0 z-20 mt-1 w-max max-w-52 rounded-md border border-chrome bg-surface px-2 py-1.5 text-left shadow-lg dark:border-chrome dark:bg-chrome"
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted dark:text-muted">
            {contacts.length === 1 ? "Contact" : "Contacts"}
          </span>
          {contacts.map((name) => (
            <span
              key={name}
              className="block truncate text-xs text-ink dark:text-muted"
            >
              {name}
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}
