"use client";

import {
  Beer,
  ChevronDown,
  CircleHelp,
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
  UserMinus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { endGameAction } from "@/app/actions";
import { DiceLoading } from "@/components/dice-loading";
import { PlayerName } from "@/components/player-name";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  formatStatus,
  getStatusVariant,
  isLeaderParticipantStats,
  isTrailerParticipantStats,
  sortParticipantStats,
} from "@/lib/game-helpers";
import { suppressGameSync } from "@/lib/game-sync";
import type { GameModel, ParticipantStats } from "@/lib/models";
import { isParticipantActiveForNextRound } from "@/lib/roster";
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
  const [legendOpen, setLegendOpen] = useState(false);

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
  // biome-ignore lint/correctness/useExhaustiveDependencies: gameSessionId is the intended trigger to reset state when switching games without remount.
  useEffect(() => {
    setIsNavigating(false);
    setEndGameOpen(false);
  }, [gameSessionId]);

  const statIconSize = "size-3 sm:size-5";

  const completedRounds = session.rounds.filter(
    (r) => r.status === "completed",
  ).length;
  const totalRounds = session.rounds.length;
  const latestCompletedRoundNumber =
    session.rounds.filter((r) => r.status === "completed").at(-1)
      ?.roundNumber ?? 0;

  const activeParticipantIds = new Set(
    session.participants
      .filter((p) =>
        isParticipantActiveForNextRound(p, latestCompletedRoundNumber),
      )
      .map((p) => p.id),
  );

  const activeStats = stats.filter((s) =>
    activeParticipantIds.has(s.participantId),
  );
  const retiredStats = stats.filter(
    (s) => !activeParticipantIds.has(s.participantId),
  );

  const sortedActiveStats = sortParticipantStats(activeStats);
  const sortedRetiredStats = sortParticipantStats(retiredStats);

  const maxSipsDrunk = Math.max(0, ...activeStats.map((s) => s.sipsDrunk));
  const maxRetiredSipsDrunk = Math.max(
    0,
    ...retiredStats.map((s) => s.sipsDrunk),
  );

  function isMostDrunkStats(s: ParticipantStats, amongActive: boolean) {
    const max = amongActive ? maxSipsDrunk : maxRetiredSipsDrunk;
    return s.sipsDrunk > 0 && s.sipsDrunk === max;
  }

  const activeCount = activeParticipantIds.size;

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
                    {activeCount}
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
          {/* Icon legend accordion */}
          <div className="mb-3 rounded-lg border border-border bg-muted/30">
            <button
              type="button"
              onClick={() => setLegendOpen((v) => !v)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={legendOpen}
            >
              <CircleHelp className="size-3.5" />
              Icon Legend
              <ChevronDown
                className={`ml-auto size-3.5 transition-transform ${legendOpen ? "rotate-180" : ""}`}
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${legendOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <div
                  className={`border-t border-border px-4 pb-3 pt-2.5 transition-opacity duration-200 ${legendOpen ? "opacity-100" : "opacity-0"}`}
                >
                  <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Crown className="size-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-muted-foreground">Leader</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Frown className="size-4 shrink-0 text-purple-600 dark:text-purple-400" />
                      <span className="text-muted-foreground">Trailer</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserMinus className="size-4 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">Retired</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="size-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">Rounds won</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Beer className="size-4 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">Sips drunk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skull className="size-4 shrink-0 text-red-500" />
                      <span className="text-muted-foreground">
                        Sips drunk (most drunk)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dices className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span className="text-muted-foreground">
                        Special rolls
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Toilet className="size-4 shrink-0 text-amber-800 dark:text-amber-600" />
                      <span className="text-muted-foreground">Shit stairs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span className="text-muted-foreground">
                        Lowest score rolls
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <span className="flex size-4 shrink-0 items-center justify-center">
                        <Beer className="size-3.5 text-amber-600 dark:text-amber-400" />
                      </span>
                      <span className="text-muted-foreground">
                        Beer tracker (14 sips per beer)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {sortedActiveStats.map((s, idx) => {
              const isLeader = isLeaderParticipantStats(s, sortedActiveStats);
              const isTrailer = isTrailerParticipantStats(s, sortedActiveStats);
              const isMostDrunk = isMostDrunkStats(s, true);

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

          {sortedRetiredStats.length > 0 && (
            <>
              <Separator className="my-4" />
              <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <UserMinus className="size-3.5" />
                Retired ({sortedRetiredStats.length})
              </h3>
              <div className="grid grid-cols-1 gap-1.5 opacity-90 sm:grid-cols-2 lg:grid-cols-3">
                {sortedRetiredStats.map((s) => {
                  const isMostDrunk = isMostDrunkStats(s, false);
                  const participant = session.participants.find(
                    (p) => p.id === s.participantId,
                  );

                  return (
                    <div
                      key={s.participantId}
                      className="flex flex-col gap-2 rounded-xl border border-muted bg-muted/20 px-4 py-3"
                    >
                      <div className="mb-2 flex items-center gap-4">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <UserMinus className="size-4" />
                        </div>
                        <span className="min-w-0 flex-1 truncate text-base font-semibold text-muted-foreground">
                          <PlayerName
                            participantId={s.participantId}
                            participants={session.participants}
                          />
                        </span>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          Retired
                          {participant?.retiredAfterRoundNumber != null
                            ? ` · R${participant.retiredAfterRoundNumber}`
                            : ""}
                        </Badge>
                      </div>
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
                            isMostDrunk
                              ? "text-red-500"
                              : "text-muted-foreground"
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
                      </div>
                      <BeerTracker sipsDrunk={s.sipsDrunk} />
                    </div>
                  );
                })}
              </div>
            </>
          )}
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
