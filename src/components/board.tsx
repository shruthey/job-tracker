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
  statusBadgeStyle,
  statusColumnStyle,
  statusDotStyle,
  statusLineStyle,
  STATUS_LABELS,
} from "@/lib/format";
import { TagList } from "@/components/tag-chip";
import { SponsorshipBadge } from "@/components/sponsorship-badge";
import { CalendarIcon, ChevronRightIcon, ExternalLinkIcon } from "@/components/icons";
import { ContactsHint } from "@/components/contacts-hint";
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

/**
 * Collapsed groups, keyed `status/company` so the same employer can be folded
 * in one column and open in another. Stored as a list rather than a set
 * because it has to survive `JSON.stringify`.
 *
 * A second tiny store over localStorage, same shape as the column preference
 * above: `useSyncExternalStore` compares by identity, so `collapsedCache` must
 * hold a stable value until the preference actually changes.
 */
const COLLAPSED_KEY = "board:collapsed-groups";

const collapsedListeners = new Set<() => void>();
let collapsedCache: ReadonlySet<string> | null = null;

const EMPTY_COLLAPSED: ReadonlySet<string> = new Set<string>();

function groupKey(status: ApplicationStatus, companyName: string) {
  return `${status}/${companyName}`;
}

function readCollapsed(): ReadonlySet<string> | null {
  try {
    const raw = window.localStorage.getItem(COLLAPSED_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    return new Set(parsed.filter((k): k is string => typeof k === "string"));
  } catch {
    // Private mode, disabled storage, or malformed JSON — nothing collapsed.
    return null;
  }
}

function subscribeToCollapsed(onChange: () => void) {
  collapsedListeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === COLLAPSED_KEY) {
      collapsedCache = null;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    collapsedListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getCollapsedSnapshot(): ReadonlySet<string> {
  if (collapsedCache === null) collapsedCache = readCollapsed() ?? EMPTY_COLLAPSED;
  return collapsedCache;
}

function getServerCollapsedSnapshot(): ReadonlySet<string> {
  return EMPTY_COLLAPSED;
}

function writeCollapsed(next: ReadonlySet<string>) {
  collapsedCache = next;
  try {
    window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
  } catch {
    // Storage unavailable; the choice still applies for this session.
  }
  for (const listener of collapsedListeners) listener();
}

function toggleCollapsed(key: string) {
  const next = new Set(getCollapsedSnapshot());
  if (!next.delete(key)) next.add(key);
  writeCollapsed(next);
}

/**
 * Collapse or expand a batch of groups at once, for the board-level control.
 * Keys outside the batch are left alone, so folding everything in the visible
 * columns does not disturb a column that is currently hidden.
 */
function setCollapsedFor(keys: string[], isCollapsed: boolean) {
  const next = new Set(getCollapsedSnapshot());
  for (const key of keys) {
    if (isCollapsed) next.add(key);
    else next.delete(key);
  }
  writeCollapsed(next);
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
        className="rounded-lg border border-chrome bg-surface px-3 py-1.5 text-sm text-ink shadow-sm transition-colors hover:border-brand hover:text-brand dark:border-chrome dark:bg-chrome dark:text-muted dark:hover:border-brand dark:hover:text-brand"
      >
        Columns
        {hiddenCount > 0 ? (
          <span className="ml-1.5 text-xs text-muted dark:text-muted">
            {visible.length}/{BOARD_ORDER.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1.5 w-60 rounded-xl border border-chrome bg-surface p-1.5 shadow-xl shadow-chrome/10 dark:border-chrome dark:bg-chrome dark:shadow-black/40">
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
                        : "cursor-pointer hover:bg-ground dark:hover:bg-chrome"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isLast}
                      onChange={() => toggle(status)}
                      className="h-3.5 w-3.5 rounded border-chrome accent-brand dark:border-chrome"
                    />
                    <span
                      className={`inline-flex flex-1 items-center gap-1.5 text-ink dark:text-muted ${
                        checked ? "" : "opacity-60"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={statusDotStyle(status)}
                      />
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="text-xs tabular-nums text-muted dark:text-muted">
                      {counts.get(status) ?? 0}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-1 flex gap-1 border-t border-chrome pt-1 dark:border-chrome">
            <button
              type="button"
              onClick={() => onChange([...BOARD_ORDER])}
              className="flex-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-ground dark:text-muted dark:hover:bg-chrome"
            >
              Show all
            </button>
            <button
              type="button"
              onClick={() => onChange([...DEFAULT_VISIBLE])}
              className="flex-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-ground dark:text-muted dark:hover:bg-chrome"
            >
              Reset
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One control rather than a pair of buttons: with the groups either all folded
 * or not, a second button would always be the no-op one. The label says what
 * the click will do.
 */
function CollapseAllToggle({
  groupKeys,
  collapsed,
}: {
  groupKeys: string[];
  collapsed: ReadonlySet<string>;
}) {
  if (groupKeys.length === 0) return null;

  // Anything still open means the useful action is to collapse.
  const anyExpanded = groupKeys.some((key) => !collapsed.has(key));

  return (
    <button
      type="button"
      onClick={() => setCollapsedFor(groupKeys, anyExpanded)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-chrome bg-surface px-3 py-1.5 text-sm text-ink shadow-sm transition-colors hover:border-brand hover:text-brand dark:border-chrome dark:bg-chrome dark:text-muted dark:hover:border-brand dark:hover:text-brand"
    >
      <ChevronRightIcon
        className={`h-3 w-3 text-muted transition-transform dark:text-muted ${
          anyExpanded ? "rotate-90" : ""
        }`}
      />
      {anyExpanded ? "Collapse all" : "Expand all"}
    </button>
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
  contacts: string[];
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
      className={`group rounded-lg border border-chrome border-l-4 bg-surface px-2.5 py-2 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/25 hover:ring-2 hover:ring-brand/40 dark:border-chrome dark:bg-chrome/90 dark:hover:border-brand dark:hover:bg-chrome dark:hover:shadow-brand/25 dark:hover:ring-brand/40 ${
        dragging ? "opacity-50" : ""
      }`}
      style={{ borderLeftColor: statusLineStyle(card.status).borderColor }}
    >
      {/* Extra right padding clears the external-link icon overlaid above. */}
      <p
        className={`text-sm font-semibold leading-snug text-ink transition-colors group-hover:text-brand dark:text-muted dark:group-hover:text-brand ${
          card.jobUrl ? "pr-6" : ""
        }`}
      >
        {card.title}
      </p>
      {showCompany ? (
        <p className="mt-0.5 text-xs font-medium text-ink dark:text-muted">
          {card.companyName}
        </p>
      ) : null}
      {card.location ? (
        <p className="mt-0.5 text-xs text-muted dark:text-muted">
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
        <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-brand/20 px-1.5 py-0.5 text-xs font-medium text-ink ring-1 ring-inset ring-brand dark:bg-brand/30 dark:text-ink dark:ring-brand">
          <CalendarIcon className="h-3 w-3" />
          {formatDateTime(card.nextInterviewAt)}
        </p>
      ) : null}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {salary ? (
          <span className="text-xs font-semibold text-brand dark:text-brand">
            {salary}
          </span>
        ) : (
          <span />
        )}
        <span className="text-xs text-muted dark:text-muted">
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
          className="absolute right-1.5 top-1.5 rounded p-1 text-muted transition-colors hover:bg-ground hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-chrome dark:text-muted dark:hover:bg-chrome dark:hover:text-muted"
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
  const collapsed = useSyncExternalStore(
    subscribeToCollapsed,
    getCollapsedSnapshot,
    getServerCollapsedSnapshot,
  );

  return (
    <section
      ref={setNodeRef}
      className="flex w-72 shrink-0 flex-col rounded-xl border p-2 transition-colors"
      style={statusColumnStyle(status, isOver)}
    >
      <header className="flex items-center justify-between px-1.5 py-1.5">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
          style={statusBadgeStyle(status)}
        >
          {STATUS_LABELS[status]}
        </span>
        <span className="text-xs tabular-nums text-muted dark:text-muted">
          {cards.length}
        </span>
      </header>
      <div className="flex flex-col gap-4 p-1">
        {groupByCompany(cards).map((group) => {
          const key = groupKey(status, group.companyName);
          const isCollapsed = collapsed.has(key);
          const panelId = `group-${key.replace(/[^a-zA-Z0-9]+/g, "-")}`;

          return (
            <div key={group.companyName} className="flex flex-col gap-1">
              {/*
                A filled bar rather than a bare label: the group boundary has
                to survive a column of same-sized cards, so the header carries
                its own background and the cards below hang off a matching
                rail. The whole bar is the toggle — a bigger target than the
                chevron alone.
              */}
              <div
                className="flex items-center gap-1 rounded-md border-l-[3px] bg-surface/70 pr-2 dark:bg-chrome/70"
                style={statusLineStyle(status)}
              >
                {/*
                  The toggle is its own element rather than the whole bar,
                  because the contacts hint beside it is a button too and a
                  button cannot nest inside another.
                */}
                <button
                  type="button"
                  onClick={() => toggleCollapsed(key)}
                  aria-expanded={!isCollapsed}
                  aria-controls={panelId}
                  className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-chrome/5 dark:hover:bg-ground/10"
                >
                  <ChevronRightIcon
                    className={`h-3 w-3 shrink-0 text-muted transition-transform dark:text-muted ${
                      isCollapsed ? "" : "rotate-90"
                    }`}
                  />
                  <span className="truncate text-[11px] font-bold uppercase tracking-wider text-ink dark:text-muted">
                    {group.companyName}
                  </span>
                  {/* Collapsed, the count is the only clue to what is inside. */}
                  {group.cards.length > 1 || isCollapsed ? (
                    <span className="ml-auto shrink-0 text-[11px] font-semibold tabular-nums text-muted dark:text-muted">
                      {group.cards.length}
                    </span>
                  ) : null}
                </button>
                {/*
                  Contacts belong to the company, so they hang off the company
                  header rather than any one role. Every card in the group
                  carries the same list; the first is as good as any.
                */}
                <ContactsHint
                  contacts={group.cards[0].contacts}
                  companyName={group.companyName}
                />
              </div>
              {/*
                The rail continues the header's left border down the group, so
                the header and its cards share one left edge instead of the
                header overhanging them.
              */}
              {isCollapsed ? null : (
                <div
                  id={panelId}
                  className="flex flex-col gap-1 pl-1.5"
                >
                  {group.cards.map((card) => (
                    <DraggableCard key={card.id} card={card} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {cards.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted dark:text-muted">
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

  // Only the groups on screen: the control should not silently fold away
  // groups in a column the user cannot see.
  const collapsed = useSyncExternalStore(
    subscribeToCollapsed,
    getCollapsedSnapshot,
    getServerCollapsedSnapshot,
  );

  const groupKeys = [
    ...new Set(
      optimisticCards
        .filter((c) => visible.includes(c.status))
        .map((c) => groupKey(c.status, c.companyName)),
    ),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted dark:text-muted">
          {hiddenCards > 0
            ? `${hiddenCards} ${hiddenCards === 1 ? "card" : "cards"} in hidden columns`
            : " "}
        </p>
        <div className="flex items-center gap-2">
          <CollapseAllToggle groupKeys={groupKeys} collapsed={collapsed} />
          <ColumnPicker
            visible={visible}
            onChange={updateVisible}
            counts={counts}
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-warn bg-warn/20 px-3 py-2 text-sm text-ink dark:border-warn dark:bg-warn/30 dark:text-ink">
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
