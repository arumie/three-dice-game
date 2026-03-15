"use client";

import {
  Beer,
  Crown,
  Dices,
  Frown,
  Home,
  LogOut,
  MoreVertical,
  Skull,
  Toilet,
  TrendingDown,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { endGameAction } from "@/app/actions";
import { suppressGameSync } from "@/lib/game-sync";
import { DiceLoading } from "@/components/dice-loading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { formatStatus, getStatusVariant } from "@/lib/game-helpers";
import type { GameModel, ParticipantStats } from "@/lib/models";
import { PlayerName } from "@/components/player-name";
import { BeerTracker } from "./beer-tracker";

interface GameStateCardProps {
  session: GameModel;
  stats: ParticipantStats[];
  gameSessionId: number;
}

export const APP_DICE_EVENT = "appDiceChanged";

export function GameStateCard({
  session,
  stats,
  gameSessionId,
}: GameStateCardProps) {
  const router = useRouter();
  const [endGameOpen, setEndGameOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const appDiceKey = `useAppDice:${gameSessionId}`;
  const [useAppDice, setUseAppDice] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(appDiceKey) === "true";
  });

  function toggleAppDice(checked: boolean) {
    setUseAppDice(checked);
    sessionStorage.setItem(appDiceKey, String(checked));
    window.dispatchEvent(new CustomEvent(APP_DICE_EVENT, { detail: checked }));
  }

  // Reset navigating state when returning to this page (e.g. browser back)
  useEffect(() => {
    setIsNavigating(false);
    setEndGameOpen(false);
  }, [gameSessionId]);

  const statIconSize = "size-3 sm:size-5";

  const completedRounds = session.rounds.filter(
    (r) => r.status === "completed",
  ).length;
  const totalRounds = session.rounds.length;

  // Sort stats for the leaderboard: fewest sips drunk = winning
  const sortedStats = [...stats].sort((a, b) => {
    if (b.roundsWon !== a.roundsWon) return b.roundsWon - a.roundsWon;
    if (a.sipsDrunk !== b.sipsDrunk) return a.sipsDrunk - b.sipsDrunk;
    return a.participantId - b.participantId;
  });

  // Determine leader/trailer/biggest drinker by comparing stats values
  // so all tied players get the same designation
  const topStats = sortedStats[0];
  const bottomStats = sortedStats[sortedStats.length - 1];
  const maxSipsDrunk = Math.max(...stats.map((s) => s.sipsDrunk));

  function isLeaderStats(s: ParticipantStats) {
    return (
      s.roundsWon > 0 &&
      s.roundsWon === topStats.roundsWon &&
      s.sipsDrunk === topStats.sipsDrunk
    );
  }

  function isTrailerStats(s: ParticipantStats) {
    return (
      sortedStats.length > 1 &&
      s.roundsWon === bottomStats.roundsWon &&
      s.sipsDrunk === bottomStats.sipsDrunk &&
      !isLeaderStats(s)
    );
  }

  function isMostDrunkStats(s: ParticipantStats) {
    return s.sipsDrunk > 0 && s.sipsDrunk === maxSipsDrunk;
  }

  async function handleEndGame() {
    suppressGameSync();
    setIsNavigating(true);
    try {
      // Show loading for at least 1 second before the action fires,
      // because endGameAction revalidates the cache which triggers an
      // immediate server-side redirect — without this delay the dialog
      // would flash and disappear instantly.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await endGameAction({ gameSessionId });
      router.push(`/game-session/${gameSessionId}/summary`);
    } catch {
      setIsNavigating(false);
      setEndGameOpen(false);
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header with gradient accent */}
        <CardHeader className="relative px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Dices className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold sm:text-lg">
                  {session.config.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {session.participants.length}
                  </span>
                  <span className="text-muted-foreground/30">·</span>
                  <span>Round {totalRounds}</span>
                  {completedRounds < totalRounds && (
                    <Badge
                      variant="default"
                      className="ml-1 px-1.5 py-0 text-[10px]"
                    >
                      Live
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={getStatusVariant(session.status)}
                className="hidden sm:inline-flex"
              >
                {formatStatus(session.status)}
              </Badge>
              <Button variant="ghost" size="icon" className="size-8" asChild>
                <Link href="/">
                  <Home className="size-4" />
                  <span className="sr-only">Home</span>
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreVertical className="size-4" />
                    <span className="sr-only">Game menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2">
                      <Dices className="size-4" />
                      App Dice
                    </span>
                    <Switch
                      size="sm"
                      checked={useAppDice}
                      onCheckedChange={toggleAppDice}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setEndGameOpen(true)}
                  >
                    <LogOut className="size-4" />
                    End Game
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        {/* Scoreboard */}
        <CardContent className="px-4 pb-4 pt-0 sm:px-5">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {sortedStats.map((s, idx) => {
              const isLeader = isLeaderStats(s);
              const isTrailer = isTrailerStats(s);
              const isMostDrunk = isMostDrunkStats(s);

              return (
                <div
                  key={s.participantId}
                  className={`flex flex-col gap-2 rounded-xl border px-4 py-3 transition-colors ${
                    isLeader
                      ? "border-yellow-500/30 bg-yellow-500/5"
                      : isTrailer
                        ? "border-purple-500/30 bg-purple-500/5"
                        : isMostDrunk
                          ? "border-red-500/20 bg-red-500/5"
                          : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-4 mb-2">
                    {/* Rank indicator */}
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                        isLeader
                          ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                          : isTrailer
                            ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isLeader ? (
                        <Crown className="size-5" />
                      ) : isTrailer ? (
                        <Frown className="size-5" />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    {/* Name */}
                    <span className="min-w-0 flex-1 truncate text-base font-semibold">
                      <PlayerName
                        participantId={s.participantId}
                        participants={session.participants}
                      />
                    </span>

                    {/* Stats */}
                    <div className="flex items-center gap-2 text-sm tabular-nums sm:gap-4 sm:text-base">
                      <span
                        className="flex items-center gap-1 font-bold text-primary sm:gap-1.5"
                        title="Rounds won"
                      >
                        <Trophy className={statIconSize} />
                        {s.roundsWon}
                      </span>
                      <span
                        className={`flex items-center gap-1 font-bold sm:gap-1.5 ${
                          isMostDrunk ? "text-red-500" : "text-muted-foreground"
                        }`}
                        title="Sips drunk"
                      >
                        {isMostDrunk ? (
                          <Skull className={statIconSize} />
                        ) : (
                          <Beer className={statIconSize} />
                        )}
                        {s.sipsDrunk}
                      </span>
                      {s.threeOfAKindCount +
                        s.stairsCount +
                        s.superStairsCount >
                        0 && (
                        <span
                          className="flex items-center gap-1 font-bold text-amber-600 sm:gap-1.5 dark:text-amber-400"
                          title={`${s.threeOfAKindCount} three of a kind, ${s.stairsCount} stairs, ${s.superStairsCount} super stairs`}
                        >
                          <Dices className={statIconSize} />
                          {s.threeOfAKindCount +
                            s.stairsCount +
                            s.superStairsCount}
                        </span>
                      )}
                      {s.shitStairsCount > 0 && (
                        <span
                          className="flex items-center gap-1 font-bold text-amber-800 sm:gap-1.5 dark:text-amber-600"
                          title="Shit stairs"
                        >
                          <Toilet className={statIconSize} />
                          {s.shitStairsCount}
                        </span>
                      )}
                      {s.lowestScoreCount > 0 && (
                        <span
                          className="flex items-center gap-1 font-bold text-amber-600 sm:gap-1.5 dark:text-amber-400"
                          title="Lowest score rolls"
                        >
                          <TrendingDown className={statIconSize} />
                          {s.lowestScoreCount}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Beer tracker */}
                  <BeerTracker sipsDrunk={s.sipsDrunk} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* End game confirmation */}
      <AlertDialog
        open={endGameOpen}
        onOpenChange={(v) => {
          if (!isNavigating) setEndGameOpen(v);
        }}
      >
        <AlertDialogContent>
          {isNavigating ? (
            <DiceLoading message="Ending game..." cycleMessages={false} />
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>End Game Session?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will end the current game session for all players. The
                  current round will be abandoned. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleEndGame();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <LogOut className="size-4" />
                  End Game
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
