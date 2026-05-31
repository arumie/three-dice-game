"use client";

import {
  Award,
  Beer,
  CircleArrowDown,
  Crown,
  Dices,
  Footprints,
  Hash,
  type LucideIcon,
  Skull,
  Sparkles,
  Toilet,
  TrendingDown,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AggregatedPlayerStats } from "@/lib/models";

interface GlobalStats {
  totalGames: number;
  inProgressGames: number;
  completedGames: number;
  totalRounds: number;
  totalSipsDrunk: number;
  totalThreeOfAKind: number;
  totalStairs: number;
  totalSuperStairs: number;
  totalShitStairs: number;
  totalLowestScores: number;
}

interface GlobalStatsCardProps {
  stats: GlobalStats;
  playerStats: AggregatedPlayerStats[];
}

export type { GlobalStats };

type AwardWinner = {
  name: string;
  username: string | null;
};

type AwardDef = {
  label: string;
  quip: string;
  icon: LucideIcon;
  color: string;
  winners: AwardWinner[];
  value: number;
};

function buildAward(
  players: AggregatedPlayerStats[],
  key: keyof AggregatedPlayerStats,
  label: string,
  quip: string,
  icon: LucideIcon,
  color: string,
): AwardDef | null {
  if (players.length === 0) return null;
  const value = Math.max(...players.map((p) => p[key] as number));
  if (value <= 0) return null;
  const winners: AwardWinner[] = players
    .filter((p) => (p[key] as number) === value)
    .map((p) => ({ name: p.name, username: p.username }));
  return {
    label,
    quip,
    icon,
    color,
    winners,
    value,
  };
}

function AwardName({
  name,
  username,
}: {
  name: string;
  username: string | null;
}) {
  if (username) {
    return (
      <Link
        href={`/player/${encodeURIComponent(username)}`}
        className="underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground"
      >
        {name}
      </Link>
    );
  }
  return <>{name}</>;
}

export function GlobalStatsCard({ stats, playerStats }: GlobalStatsCardProps) {
  const totalSpecials =
    stats.totalThreeOfAKind + stats.totalStairs + stats.totalSuperStairs;

  const awardDefs: AwardDef[] = [
    buildAward(
      playerStats,
      "gamesWon",
      "Most Victories",
      "Champion of champions",
      Crown,
      "text-yellow-600 dark:text-yellow-400",
    ),
    buildAward(
      playerStats,
      "roundsWon",
      "Most Wins",
      "Born winner",
      Trophy,
      "text-primary",
    ),
    buildAward(
      playerStats,
      "roundsLost",
      "Most Losses",
      "Better luck next time",
      Skull,
      "text-red-500",
    ),
    buildAward(
      playerStats,
      "sipsDrunk",
      "Biggest Drinker",
      "Cheers to that",
      Beer,
      "text-red-500",
    ),
    buildAward(
      playerStats,
      "sipsAwarded",
      "Top Bartender",
      "Drinks on you",
      Footprints,
      "text-green-600 dark:text-green-400",
    ),
    buildAward(
      playerStats,
      "sipsReceived",
      "Most Targeted",
      "What did you do to them?",
      CircleArrowDown,
      "text-orange-500",
    ),
    buildAward(
      playerStats,
      "threeOfAKindCount",
      "Triple Threat",
      "Three of a kind magnet",
      Dices,
      "text-amber-600 dark:text-amber-400",
    ),
    buildAward(
      playerStats,
      "stairsCount",
      "Stairway Master",
      "One step at a time",
      Footprints,
      "text-blue-500",
    ),
    buildAward(
      playerStats,
      "shitStairsCount",
      "Shit Stairs King",
      "Face, meet palm",
      Toilet,
      "text-amber-800 dark:text-amber-600",
    ),
    buildAward(
      playerStats,
      "lowestScoreCount",
      "Bottom Roller",
      "Couldn't roll worse if you tried",
      TrendingDown,
      "text-amber-600 dark:text-amber-400",
    ),
    buildAward(
      playerStats,
      "tiebreakerWins",
      "Tiebreaker Champ",
      "Luck favours the bold",
      Crown,
      "text-green-500",
    ),
  ].filter((a): a is AwardDef => a !== null);

  return (
    <Card className="w-full">
      <CardContent className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground sm:text-base">
          <Trophy className="size-4 sm:size-5" />
          All-Time Stats
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
          {/* Total Games */}
          <div className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 sm:px-3">
            <Hash className="size-4 text-primary sm:size-5" />
            <span className="text-lg font-bold tabular-nums sm:text-2xl">
              {stats.totalGames}
            </span>
            <span className="text-[10px] text-muted-foreground sm:text-xs">
              Games
            </span>
            {stats.totalGames > 0 && (
              <span className="text-[10px] text-muted-foreground/70">
                {stats.inProgressGames > 0 && (
                  <span className="text-primary">
                    {stats.inProgressGames} live
                  </span>
                )}
                {stats.inProgressGames > 0 && stats.completedGames > 0 && " · "}
                {stats.completedGames > 0 && (
                  <span>{stats.completedGames} done</span>
                )}
              </span>
            )}
          </div>

          {/* Total Rounds */}
          <div className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 sm:px-3">
            <Dices className="size-4 text-primary sm:size-5" />
            <span className="text-lg font-bold tabular-nums sm:text-2xl">
              {stats.totalRounds}
            </span>
            <span className="text-[10px] text-muted-foreground sm:text-xs">
              Rounds
            </span>
          </div>

          {/* Total Sips */}
          <div className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 sm:px-3">
            <Beer className="size-4 text-red-500 sm:size-5" />
            <span className="text-lg font-bold tabular-nums text-red-500 sm:text-2xl">
              {stats.totalSipsDrunk}
            </span>
            <span className="text-[10px] text-muted-foreground sm:text-xs">
              Sips Drunk
            </span>
          </div>

          {/* Special Rolls */}
          <div className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 sm:px-3">
            <Sparkles className="size-4 text-amber-600 dark:text-amber-400 sm:size-5" />
            <span className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400 sm:text-2xl">
              {totalSpecials}
            </span>
            <span className="text-[10px] text-muted-foreground sm:text-xs">
              Special Rolls
            </span>
            {totalSpecials > 0 && (
              <span className="text-[10px] text-muted-foreground/70">
                {stats.totalThreeOfAKind > 0 &&
                  `${stats.totalThreeOfAKind} 3oK`}
                {stats.totalThreeOfAKind > 0 && stats.totalStairs > 0 && " · "}
                {stats.totalStairs > 0 && `${stats.totalStairs} St`}
                {(stats.totalThreeOfAKind > 0 || stats.totalStairs > 0) &&
                  stats.totalSuperStairs > 0 &&
                  " · "}
                {stats.totalSuperStairs > 0 && `${stats.totalSuperStairs} SS`}
              </span>
            )}
          </div>

          {/* Shit Stairs */}
          <div className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 sm:px-3">
            <Toilet className="size-4 text-amber-800 dark:text-amber-600 sm:size-5" />
            <span className="text-lg font-bold tabular-nums text-amber-800 dark:text-amber-600 sm:text-2xl">
              {stats.totalShitStairs}
            </span>
            <span className="text-[10px] text-muted-foreground sm:text-xs">
              Shit Stairs
            </span>
          </div>

          {/* Lowest Scores */}
          <div className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 sm:px-3">
            <TrendingDown className="size-4 text-amber-600 dark:text-amber-400 sm:size-5" />
            <span className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400 sm:text-2xl">
              {stats.totalLowestScores}
            </span>
            <span className="text-[10px] text-muted-foreground sm:text-xs">
              Lowest
            </span>
          </div>
        </div>
      </CardContent>

      {/* All-Time Awards */}
      {awardDefs.length > 0 && (
        <>
          <Separator />
          <CardContent className="px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Award className="size-3.5" />
              All-Time Awards
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              {awardDefs.map((award) => {
                const Icon = award.icon;
                const isTie = award.winners.length > 1;
                return (
                  <div
                    key={award.label}
                    className="flex flex-col gap-1 rounded-lg border px-3 py-2.5 sm:rounded-xl sm:px-4 sm:py-3"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={`size-3.5 sm:size-4 ${award.color}`} />
                      <span className="text-xs font-semibold sm:text-sm">
                        {award.label}
                      </span>
                      {isTie && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[10px]">
                          Tie
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold sm:text-base">
                      {award.winners.map((winner, index) => (
                        <span key={winner.username ?? winner.name}>
                          {index > 0 && ", "}
                          <AwardName
                            name={winner.name}
                            username={winner.username}
                          />
                        </span>
                      ))}{" "}
                      <span className="text-xs font-normal text-muted-foreground sm:text-sm">
                        ({award.value})
                      </span>
                    </span>
                    <span className="text-[10px] italic text-muted-foreground sm:text-xs">
                      {award.quip}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}
