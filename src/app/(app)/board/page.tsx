import { Board } from "@/components/board";
import { listBoard } from "@/lib/queries";

/**
 * Reads live database state on every request, so it must never be prerendered
 * into a build-time snapshot.
 */
export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const cards = await listBoard();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-muted">
          Board
        </h1>
        <p className="text-sm text-muted dark:text-muted">
          Drag a card to change its status.
        </p>
      </div>
      <Board cards={cards} />
    </div>
  );
}
