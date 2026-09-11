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
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Board
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Drag a card to change its status.
        </p>
      </div>
      <Board cards={cards} />
    </div>
  );
}
