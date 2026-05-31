"use client";

import {
  Beer,
  ChevronRight,
  Clock,
  Crown,
  Dices,
  Frown,
  Skull,
  Users,
} from "lucide-react";
import Link from "next/link";
import { PlayerName } from "@/components/player-name";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatStatus, getStatusVariant } from "@/lib/game-helpers";
import type { GameModel, ParticipantStats } from "@/lib/models";

interface GameListCardProps {
  session: GameModel;
  stats: ParticipantStats[];
}

function formatDuration(start: Date, end: Date): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function GameListCard({ session, stats }: GameListCardProps) {
  const completedRounds = session.rounds.filter(
    (r) => r.status === "completed",
  ).length;
  const totalRounds = session.rounds.length;
  const isCompleted = session.status === "completed";

  const href = isCompleted
    ? `/game-session/${session.id}/summary`
    : `/game-session/${session.id}`;

  // Sort stats: most rounds won first, then fewest sips
  const sortedStats = [...stats].sort((a, b) => {
    if (b.roundsWon !== a.roundsWon) return b.roundsWon - a.roundsWon;
    return a.sipsDrunk - b.sipsDrunk;
  });

  const leader = sortedStats[0];
  const trailer = sortedStats[sortedStats.length - 1];
  const biggestDrinker = [...stats].sort(
    (a, b) => b.sipsDrunk - a.sipsDrunk,
  )[0];

  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:border-primary/30 hover:bg-accent/30">
        <CardHeader className="px-4 pb-2 pt-4 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:size-9">
                <Dices className="size-4 text-primary sm:size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold sm:text-base">
                  {session.config.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {session.participants.length}
                  </span>
                  <span className="text-muted-foreground/30">·</span>
                  <span>
                    {isCompleted
                      ? `${completedRounds} rounds`
                      : `Round ${totalRounds}`}
                  </span>
                  {isCompleted && session.startedAt && session.completedAt && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDuration(session.startedAt, session.completedAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge
                variant={getStatusVariant(session.status)}
                className="text-[10px] sm:text-xs"
              >
                {formatStatus(session.status)}
              </Badge>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 pt-1 sm:px-5">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {sortedStats.map((s, idx) => {
              const isLeader =
                s.participantId === leader?.participantId && s.roundsWon > 0;
              const isTrailer =
                s.participantId === trailer?.participantId &&
                s.participantId !== leader?.participantId &&
                sortedStats.length > 1;
              const isMostDrunk =
                s.participantId === biggestDrinker?.participantId &&
                s.sipsDrunk > 0;

              return (
                <div
                  key={s.participantId}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs sm:gap-3 sm:px-3 sm:py-2 sm:text-sm ${
                    isLeader
                      ? "bg-yellow-500/5"
                      : isTrailer
                        ? "bg-purple-500/5"
                        : isMostDrunk
                          ? "bg-red-500/5"
                          : ""
                  }`}
                >
                  {/* Rank */}
                  <div
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold sm:size-6 sm:text-xs ${
                      isLeader
                        ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                        : isTrailer
                          ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isLeader ? (
                      <Crown className="size-2.5 sm:size-3" />
                    ) : isTrailer ? (
                      <Frown className="size-2.5 sm:size-3" />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Name */}
                  <span className="min-w-16 flex-1 truncate font-semibold sm:min-w-20">
                    <PlayerName
                      participantId={s.participantId}
                      participants={session.participants}
                    />
                  </span>

                  {/* Stats */}
                  <span
                    className={`flex shrink-0 items-center gap-1 font-medium tabular-nums ${
                      isMostDrunk ? "text-red-500" : "text-muted-foreground"
                    }`}
                    title="Sips drunk"
                  >
                    {isMostDrunk ? (
                      <Skull className="size-3 sm:size-3.5" />
                    ) : (
                      <Beer className="size-3 sm:size-3.5" />
                    )}
                    {s.sipsDrunk}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
