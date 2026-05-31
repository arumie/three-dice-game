"use client";

import { Beer, Crown, Dices, Trophy, User } from "lucide-react";
import Link from "next/link";
import type { AggregatedPlayerStats } from "@/lib/models";

interface PlayerSummaryCardProps {
  username: string;
  memberSince: string;
  stats: AggregatedPlayerStats;
}

function StatChip({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof Dices;
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md border px-2 py-1.5 sm:px-3">
      <Icon className={`size-3.5 sm:size-4 ${color ?? "text-primary"}`} />
      <span
        className={`text-sm font-bold tabular-nums sm:text-base ${color ?? ""}`}
      >
        {value}
      </span>
      <span className="text-[9px] text-muted-foreground sm:text-[10px]">
        {label}
      </span>
    </div>
  );
}

export function PlayerSummaryCard({
  username,
  memberSince,
  stats,
}: PlayerSummaryCardProps) {
  const hasPlayed = stats.gamesPlayed > 0;

  return (
    <Link
      href={`/player/${encodeURIComponent(username)}`}
      className="flex flex-col gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <User className="size-5 text-primary" />
        </div>
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold sm:text-base">
            {username}
          </span>
          <span className="text-xs text-muted-foreground">
            {hasPlayed ? `Member since ${memberSince}` : "No games yet"}
          </span>
        </div>
      </div>

      {hasPlayed && (
        <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-2">
          <StatChip icon={Dices} value={stats.gamesPlayed} label="Played" />
          <StatChip
            icon={Crown}
            value={stats.gamesWon}
            label="Won"
            color="text-yellow-600 dark:text-yellow-400"
          />
          <StatChip icon={Trophy} value={stats.roundsWon} label="Rounds" />
          <StatChip
            icon={Beer}
            value={stats.sipsDrunk}
            label="Sips"
            color="text-red-500"
          />
        </div>
      )}
    </Link>
  );
}
