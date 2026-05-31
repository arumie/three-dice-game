"use client";

import { useState } from "react";
import { GameListCard } from "@/components/games-list/game-list-card";
import { Button } from "@/components/ui/button";
import { GAMES_LIST_PAGE_SIZE, type GameListEntry } from "@/lib/pagination";

interface GamesListSectionsProps {
  inProgressData: GameListEntry[];
  completedData: GameListEntry[];
  pageSize?: number;
}

export function GamesListSections({
  inProgressData,
  completedData,
  pageSize = GAMES_LIST_PAGE_SIZE,
}: GamesListSectionsProps) {
  const allItems = [...inProgressData, ...completedData];
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const visibleItems = allItems.slice(0, visibleCount);
  const remaining = allItems.length - visibleCount;

  const visibleInProgress = visibleItems.filter(
    (entry) => entry.session.status !== "completed",
  );
  const visibleCompleted = visibleItems.filter(
    (entry) => entry.session.status === "completed",
  );

  return (
    <div className="flex flex-col gap-6">
      {visibleInProgress.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground sm:text-base">
            In Progress ({inProgressData.length})
          </h2>
          {visibleInProgress.map(({ session, stats }) => (
            <GameListCard key={session.id} session={session} stats={stats} />
          ))}
        </div>
      )}

      {visibleInProgress.length > 0 && visibleCompleted.length > 0 && (
        <hr className="border-border" />
      )}

      {visibleCompleted.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground sm:text-base">
            Completed ({completedData.length})
          </h2>
          {visibleCompleted.map(({ session, stats }) => (
            <GameListCard key={session.id} session={session} stats={stats} />
          ))}
        </div>
      )}

      {remaining > 0 && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setVisibleCount((count) => count + pageSize)}
        >
          Load more ({remaining} remaining)
        </Button>
      )}
    </div>
  );
}
