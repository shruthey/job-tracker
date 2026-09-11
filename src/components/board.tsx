"use client";

import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Link from "next/link";

import type { ApplicationStatus, ApplicationTag, Sponsorship } from "@/db/schema";
import { BOARD_ORDER, isTagAllowed } from "@/db/schema";
import {
  formatDateTime,
  formatSalary,
  relativeDays,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/format";
import { TagList } from "@/components/tag-chip";
import { SponsorshipBadge } from "@/components/sponsorship-badge";
import { ExternalLinkIcon } from "@/components/icons";
import { moveApplication } from "@/lib/actions";

const STORAGE_KEY = "board:visible-columns";

/**
 * Columns shown until the user says otherwise. The three end-states — saved,
 * ghosted, withdrawn — are hidden by default: they accumulate and are rarely
 * what you are looking at.
 */
const DEFAULT_VISIBLE = BOARD_ORDER.filter(
  (s) => s !== "saved" && s !== "ghosted" && s !== "withdrawn",
);

function readStored(): ApplicationStatus[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    // Drop anything not a current status, so a renamed enum value cannot
    // resurrect a column that no longer exists.
    const valid = parsed.filter((s): s is ApplicationStatus =>
      BOARD_ORDER.includes(s as ApplicationStatus),
    );
    return valid.length > 0 ? valid : null;
  } catch {
    // Private mode, disabled storage, or malformed JSON — fall back to defaults.
    return null;
  }
}

/**
 * A tiny store over localStorage, so the preference can be read during render
 * without an effect. `useSyncExternalStore` compares snapshots by identity, so
 * `cached` must hold a stable array until the value actually changes.
 */
const listeners = new Set<() => void>();
let cached: ApplicationStatus[] | null = null;

const SERVER_SNAPSHOT: ApplicationStatus[] = [...DEFAULT_VISIBLE];

function subscribeToColumns(onChange: () => void) {
  listeners.add(onChange);
  // Another tab changing the preference should update this one too.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cached = null;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getColumnsSnapshot(): ApplicationStatus[] {
  if (cached === null) cached = readStored() ?? SERVER_SNAPSHOT;
  return cached;
}

function getServerColumnsSnapshot(): ApplicationStatus[] {
  return SERVER_SNAPSHOT;
}

function writeStored(next: ApplicationStatus[]) {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable; the choice still applies for this session.
  }
  for (const listener of listeners) listener();
}

function ColumnPicker({
  visible,
  onChange,
  counts,
}: {
  visible: ApplicationStatus[];
  onChange: (next: ApplicationStatus[]) => void;
  counts: Map<ApplicationStatus, number>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on an outside click or Escape, the way a menu is expected to behave.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle(status: ApplicationStatus) {
    const next = visible.includes(status)
      ? visible.filter((s) => s !== status)
      : // Keep board order rather than click order.
        BOARD_ORDER.filter((s) => s === status || visible.includes(s));

    // Never let the board become empty — there would be nowhere to drop a card.
    if (next.length === 0) return;
    onChange(next);
  }

  const hiddenCount = BOARD_ORDER.length - visible.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Columns
        {hiddenCount > 0 ? (
          <span className="ml-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            {visible.length}/{BOARD_ORDER.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1.5 w-60 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <ul className="flex flex-col">
            {BOARD_ORDER.map((status) => {
              const checked = visible.includes(status);
              const isLast = checked && visible.length === 1;

              return (
                <li key={status}>
                  <label
                    className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${
                      isLast
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isLast}
                      onChange={() => toggle(status)}
                      className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-600"
                    />
                    <span className="flex-1 text-zinc-800 dark:text-zinc-200">
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                      {counts.get(status) ?? 0}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-1 flex gap-1 border-t border-zinc-200 pt-1 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => onChange([...BOARD_ORDER])}
              className="flex-1 rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Show all
            </button>
            <button
              type="button"
              onClick={() => onChange([...DEFAULT_VISIBLE])}
              className="flex-1 rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Reset
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type Card = {
  id: string;
  title: string;
  status: ApplicationStatus;
  boardOrder: number;
  companyName: string;
  location: string | null;
  remoteType: "onsite" | "hybrid" | "remote" | null;
  sponsorship: Sponsorship | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  jobUrl: string | null;
  updatedAt: Date;
  tags: ApplicationTag[];
  nextInterviewAt: Date | null;
};

function CardTile({
  card,
  dragging,
  showCompany,
}: {
  card: Card;
  dragging?: boolean;
  showCompany?: boolean;
}) {
  const salary = formatSalary(card.salaryMin, card.salaryMax, card.currency);

  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white px-2.5 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 ${
        dragging ? "opacity-50" : ""
      }`}
    >
      {/* Extra right padding clears the external-link icon overlaid above. */}
      <p
        className={`text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100 ${
          card.jobUrl ? "pr-6" : ""
        }`}
      >
        {card.title}
      </p>
      {showCompany ? (
        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
          {card.companyName}
        </p>
      ) : null}
      {card.location ? (
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
          {card.location}
          {card.remoteType ? ` · ${card.remoteType}` : ""}
        </p>
      ) : null}
      {/*
        Only the tags that belong to this column. A card dragged backwards
        keeps its earlier tags in the database — they stay visible and
        removable on the detail page, just not here, where they would read as
        belonging to the current stage.
      */}
      {card.sponsorship ? (
        <SponsorshipBadge sponsorship={card.sponsorship} className="mt-1.5" />
      ) : null}
      <TagList
        tags={card.tags.filter((tag) => isTagAllowed(card.status, tag))}
        className="mt-1.5"
      />
      {card.nextInterviewAt ? (
        <p className="mt-1 text-xs font-medium text-violet-700 dark:text-violet-300">
          {`Interview · ${formatDateTime(card.nextInterviewAt)}`}
        </p>
      ) : null}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {salary ? (
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {salary}
          </span>
        ) : (
          <span />
        )}
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {relativeDays(card.updatedAt)}
        </span>
      </div>
    </div>
  );
}

function DraggableCard({ card }: { card: Card }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="relative touch-none"
    >
      {/* The link is keyboard-reachable; dnd-kit owns the pointer gestures. */}
      <Link href={`/applications/${card.id}`} draggable={false}>
        <CardTile card={card} dragging={isDragging} />
      </Link>
      {/*
        A sibling of the card link rather than a child: nesting <a> in <a> is
        invalid HTML. stopPropagation keeps a click on the icon from also
        starting a drag or opening the detail page behind it.
      */}
      {card.jobUrl ? (
        <a
          href={card.jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          draggable={false}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          title="Open job posting"
          aria-label={`Open the job posting for ${card.title} at ${card.companyName} in a new tab`}
          className="absolute right-1.5 top-1.5 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-500 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <ExternalLinkIcon />
        </a>
      ) : null}
    </div>
  );
}

/**
 * Cards for one column, bucketed by company so several roles at the same
 * employer read as one block. Companies keep the alphabetical order the board
 * already sorts by, as do the roles within each bucket.
 */
function groupByCompany(cards: Card[]): { companyName: string; cards: Card[] }[] {
  const groups: { companyName: string; cards: Card[] }[] = [];
  const byName = new Map<string, { companyName: string; cards: Card[] }>();

  for (const card of cards) {
    let group = byName.get(card.companyName);
    if (!group) {
      group = { companyName: card.companyName, cards: [] };
      byName.set(card.companyName, group);
      groups.push(group);
    }
    group.cards.push(card);
  }

  return groups;
}

function Column({
  status,
  cards,
}: {
  status: ApplicationStatus;
  cards: Card[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border p-2 transition-colors ${
        isOver
          ? "border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-800"
          : "border-zinc-200 bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-900/40"
      }`}
    >
      <header className="flex items-center justify-between px-1.5 py-1.5">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {cards.length}
        </span>
      </header>
      <div className="flex flex-col gap-4 p-1">
        {groupByCompany(cards).map((group) => (
          <div key={group.companyName} className="flex flex-col gap-1">
            {/*
              A filled bar rather than a bare label: the group boundary has to
              survive a column of same-sized cards, so the header carries its
              own background and the cards below hang off a matching rail.
            */}
            <div className="flex items-baseline justify-between gap-2 rounded-md bg-zinc-200/80 px-2 py-1 dark:bg-zinc-800">
              <span className="truncate text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                {group.companyName}
              </span>
              {group.cards.length > 1 ? (
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
                  {group.cards.length}
                </span>
              ) : null}
            </div>
            <div className="flex flex-col gap-1 border-l-2 border-zinc-200/80 pl-1.5 dark:border-zinc-800">
              {group.cards.map((card) => (
                <DraggableCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        ))}
        {cards.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
            Nothing here
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function Board({ cards }: { cards: Card[] }) {
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * localStorage is external state, so it is read through
   * `useSyncExternalStore` rather than an effect. The server snapshot is the
   * default set, which keeps the first client render identical to the server's.
   */
  const visible = useSyncExternalStore(
    subscribeToColumns,
    getColumnsSnapshot,
    getServerColumnsSnapshot,
  );

  function updateVisible(next: ApplicationStatus[]) {
    writeStored(next);
  }

  // The card jumps columns immediately; the server action reconciles after.
  const [optimisticCards, moveCard] = useOptimistic(
    cards,
    (state: Card[], move: { id: string; status: ApplicationStatus }) =>
      state.map((c) => (c.id === move.id ? { ...c, status: move.status } : c)),
  );

  // A small distance constraint keeps a click-to-open from starting a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);

    const { active, over } = event;
    if (!over) return;

    const id = String(active.id);
    const toStatus = String(over.id) as ApplicationStatus;
    const card = optimisticCards.find((c) => c.id === id);
    if (!card || card.status === toStatus) return;

    // Land at the end of the destination column, in the sparse scheme.
    const columnMax = optimisticCards
      .filter((c) => c.status === toStatus)
      .reduce((max, c) => Math.max(max, c.boardOrder), 0);

    startTransition(async () => {
      moveCard({ id, status: toStatus });
      const result = await moveApplication({
        applicationId: id,
        toStatus,
        boardOrder: columnMax + 1000,
      });
      if (!result.ok) setError(result.message ?? "Could not move the card.");
    });
  }

  const activeCard = activeId
    ? optimisticCards.find((c) => c.id === activeId)
    : null;

  // Counts come from all cards, not just visible ones, so the picker can show
  // what is sitting in a column before you turn it on.
  const counts = new Map<ApplicationStatus, number>();
  for (const card of optimisticCards) {
    counts.set(card.status, (counts.get(card.status) ?? 0) + 1);
  }

  const hiddenCards = optimisticCards.filter(
    (c) => !visible.includes(c.status),
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {hiddenCards > 0
            ? `${hiddenCards} ${hiddenCards === 1 ? "card" : "cards"} in hidden columns`
            : " "}
        </p>
        <ColumnPicker
          visible={visible}
          onChange={updateVisible}
          counts={counts}
        />
      </div>

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-300">
          {error}
        </p>
      ) : null}
      {/* dnd-kit derives its `aria-describedby` from this id, and without one it
          falls back to a module-level counter — which keeps incrementing on the
          server but restarts at 0 in the browser, so the two never agree.
          A fixed id makes the markup identical on both sides. */}
      <DndContext
        id="board"
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {visible.map((status) => (
            <Column
              key={status}
              status={status}
              cards={optimisticCards
                .filter((c) => c.status === status)
                .sort(
                  (a, b) =>
                    a.companyName.localeCompare(b.companyName) ||
                    a.title.localeCompare(b.title),
                )}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <CardTile card={activeCard} showCompany /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
