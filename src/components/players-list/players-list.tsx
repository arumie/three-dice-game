"use client";

import { LoadMoreList } from "@/components/load-more-list";
import { PlayerSummaryCard } from "@/components/players-list/player-summary-card";
import { PLAYERS_LIST_PAGE_SIZE, type PlayerListEntry } from "@/lib/pagination";

interface PlayersListProps {
  playerRows: PlayerListEntry[];
}

export function PlayersList({ playerRows }: PlayersListProps) {
  return (
    <LoadMoreList
      className="flex flex-col gap-2"
      pageSize={PLAYERS_LIST_PAGE_SIZE}
      items={playerRows}
      getKey={({ player }) => player.id}
      renderItem={({ player, memberSince, stats }) => (
        <PlayerSummaryCard
          username={player.username}
          memberSince={memberSince}
          stats={stats}
        />
      )}
    />
  );
}
