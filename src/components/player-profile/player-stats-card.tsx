"use client";

import {
  Award,
  Beer,
  CircleArrowDown,
  Crown,
  Dices,
  Footprints,
  type LucideIcon,
  Skull,
  Toilet,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AggregatedPlayerStats } from "@/lib/models";

type AwardDef = {
  label: string;
  icon: LucideIcon;
  color: string;
  value: number;
};

function StatBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 sm:px-3">
      <Icon className={`size-4 sm:size-5 ${color ?? "text-primary"}`} />
      <span
        className={`text-lg font-bold tabular-nums sm:text-2xl ${color ?? ""}`}
      >
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground sm:text-xs">
        {label}
      </span>
    </div>
  );
}

export function PlayerStatsCard({ stats }: { stats: AggregatedPlayerStats }) {
  const awards: AwardDef[] = [
    stats.gamesWon > 0 && {
      label: "Games Won",
      icon: Crown,
      color: "text-yellow-600 dark:text-yellow-400",
      value: stats.gamesWon,
    },
    stats.roundsWon > 0 && {
      label: "Rounds Won",
      icon: Trophy,
      color: "text-primary",
      value: stats.roundsWon,
    },
    stats.roundsLost > 0 && {
      label: "Rounds Lost",
      icon: Skull,
      color: "text-red-500",
      value: stats.roundsLost,
    },
    stats.sipsDrunk > 0 && {
      label: "Sips Drunk",
      icon: Beer,
      color: "text-red-500",
      value: stats.sipsDrunk,
    },
    stats.sipsAwarded > 0 && {
      label: "Sips Awarded",
      icon: Footprints,
      color: "text-green-600 dark:text-green-400",
      value: stats.sipsAwarded,
    },
    stats.sipsReceived > 0 && {
      label: "Sips Received",
      icon: CircleArrowDown,
      color: "text-orange-500",
      value: stats.sipsReceived,
    },
    stats.threeOfAKindCount > 0 && {
      label: "Three of a Kind",
      icon: Dices,
      color: "text-amber-600 dark:text-amber-400",
      value: stats.threeOfAKindCount,
    },
    stats.stairsCount > 0 && {
      label: "Stairs",
      icon: Footprints,
      color: "text-blue-500",
      value: stats.stairsCount,
    },
    stats.shitStairsCount > 0 && {
      label: "Shit Stairs",
      icon: Toilet,
      color: "text-amber-800 dark:text-amber-600",
      value: stats.shitStairsCount,
    },
    stats.lowestScoreCount > 0 && {
      label: "Lowest Score",
      icon: TrendingDown,
      color: "text-amber-600 dark:text-amber-400",
      value: stats.lowestScoreCount,
    },
    stats.tiebreakerWins > 0 && {
      label: "Tiebreaker Wins",
      icon: Crown,
      color: "text-green-500",
      value: stats.tiebreakerWins,
    },
  ].filter((a): a is AwardDef => !!a);

  return (
    <Card className="w-full">
      <CardContent className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground sm:text-base">
          <Trophy className="size-4 sm:size-5" />
          Career Stats
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatBox
            icon={Dices}
            label="Games Played"
            value={stats.gamesPlayed}
          />
          <StatBox
            icon={Crown}
            label="Games Won"
            value={stats.gamesWon}
            color="text-yellow-600 dark:text-yellow-400"
          />
          <StatBox icon={Trophy} label="Rounds Won" value={stats.roundsWon} />
          <StatBox
            icon={Beer}
            label="Sips Drunk"
            value={stats.sipsDrunk}
            color="text-red-500"
          />
        </div>
      </CardContent>

      {awards.length > 0 && (
        <>
          <Separator />
          <CardContent className="px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Award className="size-3.5" />
              Detailed Stats
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              {awards.map((award) => {
                const Icon = award.icon;
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
                    </div>
                    <span className="text-sm font-bold sm:text-base">
                      {award.value}
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
