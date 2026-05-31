"use client";

import {
  Beer,
  Crown,
  Dices,
  Loader2,
  Play,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { retirePlayerAction } from "@/app/actions";
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  formatNamesList,
  formatSpecialRoll,
  getNameById,
  getParticipantName,
} from "@/lib/game-helpers";
import {
  computeLowestRollCounts,
  computeStairsSipsToAward,
  getThreeOfAKindSips,
} from "@/lib/game-utils";
import type { ParticipantWithPlayer, RoundModel } from "@/lib/models";
import { isParticipantActiveForNextRound, MIN_PLAYERS } from "@/lib/roster";
import { cn } from "@/lib/utils";
import { AddPlayerDialog } from "./add-player-dialog";
import { DiceDisplay } from "./dice-display";
import { TiebreakerDialog } from "./tiebreaker-dialog";

// ─── Presentational Sub-components ───────────────────────────────────────────

function LowestRollsBanner({
  lowestRolls,
  participants,
}: {
  lowestRolls: { participantId: number; count: number }[];
  participants: ParticipantWithPlayer[];
}) {
  if (lowestRolls.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
      {lowestRolls.map((lr) => (
        <div key={lr.participantId} className="flex items-center gap-2">
          <TrendingDown className="size-4 text-amber-600 dark:text-amber-400" />
          <span className="text-muted-foreground">
            <span className="font-semibold">
              <PlayerName
                participantId={lr.participantId}
                participants={participants}
              />
            </span>
            {" rolled the lowest"}
            {lr.count > 1 ? ` ${lr.count} times` : ""}
            {" — everyone drinks "}
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {lr.count} {lr.count === 1 ? "sip" : "sips"}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function getSipAnnotation(
  turn: RoundModel["turns"][number],
  participants: ParticipantWithPlayer[],
): { text: string } | null {
  if (turn.specialRollType === "three_of_a_kind" && turn.rolls.length > 0) {
    const lastRoll = turn.rolls[turn.rolls.length - 1];
    const sips = getThreeOfAKindSips(lastRoll.dice[0].value);
    return { text: `Added ${sips} sips to the penalty` };
  }

  if (
    (turn.specialRollType === "stairs" ||
      turn.specialRollType === "super_stairs") &&
    turn.sipsAwardedTo != null
  ) {
    const sips = computeStairsSipsToAward(turn.specialRollType, turn.turnOrder);
    const targetName = getNameById(turn.sipsAwardedTo, participants);
    return {
      text: `Awarded ${sips} ${sips === 1 ? "sip" : "sips"} to ${targetName}`,
    };
  }

  return null;
}

function SipAnnotation({ annotation }: { annotation: { text: string } }) {
  const color = "text-amber-600 dark:text-amber-400";

  return <p className={`text-xs ${color}`}>{annotation.text}</p>;
}

function TurnScoreRow({
  turn,
  participants,
  isLoser,
  variant,
}: {
  turn: RoundModel["turns"][number];
  participants: ParticipantWithPlayer[];
  isLoser?: boolean;
  variant: "safe" | "final";
}) {
  const special = formatSpecialRoll(turn.specialRollType);
  const annotation = getSipAnnotation(turn, participants);
  const lastRoll =
    turn.rolls.length > 0 ? turn.rolls[turn.rolls.length - 1] : null;
  const isSafe = variant === "safe";

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 border",
        isSafe
          ? "rounded-md border-green-500/30 bg-green-500/5 px-3 py-2"
          : cn(
              "rounded-xl px-4 py-3",
              isLoser && "border-destructive/30 bg-destructive/5",
            ),
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            isSafe ? "text-sm font-medium" : "text-base font-semibold",
            isLoser && "text-destructive",
          )}
        >
          <PlayerName
            participantId={turn.participantId}
            participants={participants}
          />
        </span>
        <Badge
          variant="outline"
          className={cn(
            isSafe ? "text-[10px] px-1.5 py-0" : "text-xs px-2.5 py-0.5",
            special && "text-amber-600 dark:text-amber-400",
          )}
        >
          {special ?? turn.finalScore ?? "—"}
        </Badge>
      </div>
      {(lastRoll || annotation) && (
        <div className="flex items-center justify-between">
          {annotation ? <SipAnnotation annotation={annotation} /> : <span />}
          {lastRoll && <DiceDisplay dice={lastRoll.dice} size="xs" />}
        </div>
      )}
    </div>
  );
}

function RoundOutcomeBanner({
  round,
  loserNamesFormatted,
  isTiedLoss,
}: {
  round: RoundModel;
  loserNamesFormatted: string | null;
  isTiedLoss: boolean;
}) {
  if (round.allSafe) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <ShieldCheck className="size-10 text-green-500 sm:size-12" />
        <p className="text-lg font-semibold sm:text-xl">Everyone is safe!</p>
        <p className="text-sm text-muted-foreground">
          No loser this round — everyone rolls again
        </p>
        <Badge
          variant="outline"
          className="text-sm px-3 py-1 border-amber-500/50 text-amber-600 dark:text-amber-400"
        >
          {round.currentPenaltySips}{" "}
          {round.currentPenaltySips === 1 ? "sip" : "sips"} carry over
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {round.falseStart ? (
        <>
          <ShieldAlert className="size-10 text-amber-500 sm:size-12" />
          <p className="text-sm text-muted-foreground">
            Nobody likes a lucky first roller...
          </p>
          <p className="text-lg font-semibold sm:text-xl">
            {loserNamesFormatted} takes the penalty!
          </p>
        </>
      ) : isTiedLoss ? (
        <>
          <Beer className="size-10 text-destructive sm:size-12" />
          <p className="text-sm text-muted-foreground">It&apos;s a tie!</p>
          <p className="text-lg font-semibold sm:text-xl">
            {loserNamesFormatted} both drink!
          </p>
        </>
      ) : (
        <>
          <Beer className="size-10 text-destructive sm:size-12" />
          <p className="text-lg font-semibold sm:text-xl">
            {loserNamesFormatted} drinks!
          </p>
        </>
      )}
      <Badge variant="destructive" className="text-lg px-3 py-1">
        {round.finalPenaltySips} {round.finalPenaltySips === 1 ? "sip" : "sips"}
        {isTiedLoss ? " each" : ""}
      </Badge>
    </div>
  );
}

function TiebreakerWinnerBanner({ winnerName }: { winnerName: string }) {
  return (
    <div className="flex w-full items-center gap-2 rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm">
      <Crown className="size-4 text-green-600 dark:text-green-400" />
      <span className="text-muted-foreground">
        <span className="font-semibold text-green-600 dark:text-green-400">
          {winnerName}
        </span>
        {" won the tiebreaker and starts next round"}
      </span>
    </div>
  );
}

function TurnResultsList({
  turns,
  participants,
  loserIds,
  variant,
}: {
  turns: RoundModel["turns"];
  participants: ParticipantWithPlayer[];
  loserIds?: number[];
  variant: "safe" | "final";
}) {
  return (
    <div
      className={`flex w-full flex-col ${variant === "safe" ? "gap-2" : "gap-2.5"}`}
    >
      <h4
        className={`uppercase tracking-wider text-muted-foreground ${
          variant === "safe" ? "text-xs font-medium" : "text-sm font-semibold"
        }`}
      >
        {variant === "safe" ? "Results" : "Final Scores"}
      </h4>
      {turns.map((t) => (
        <TurnScoreRow
          key={t.id}
          turn={t}
          participants={participants}
          isLoser={loserIds?.includes(t.participantId)}
          variant={variant}
        />
      ))}
    </div>
  );
}

function RoundCompleteFooter({
  round,
  isPending,
  needsTiebreaker,
  starterName,
  onTiebreakerClick,
  onStartRound,
}: {
  round: RoundModel;
  isPending: boolean;
  needsTiebreaker: boolean;
  starterName: string | null;
  onTiebreakerClick: () => void;
  onStartRound: () => void;
}) {
  if (needsTiebreaker) {
    return (
      <CardFooter className="mt-auto flex flex-col gap-2 px-4 py-3 sm:px-6 sm:py-4">
        <Button className="w-full h-12 sm:h-10" onClick={onTiebreakerClick}>
          <Dices className="size-4" />
          Tiebreaker Roll
        </Button>
      </CardFooter>
    );
  }

  return (
    <CardFooter className="mt-auto flex flex-col gap-2 px-4 py-3 sm:px-6 sm:py-4">
      <Button
        className="w-full h-12 sm:h-10"
        onClick={onStartRound}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Play className="size-4" />
        )}
        {round.allSafe ? (
          <>Continue — Everyone Rolls Again</>
        ) : (
          <>
            Start Round {round.roundNumber + 1}
            {starterName && (
              <span className="ml-1 text-xs opacity-75">
                — {starterName} starts
              </span>
            )}
          </>
        )}
      </Button>
    </CardFooter>
  );
}

function RosterChangeBanner({
  icon: Icon,
  children,
  className,
}: {
  icon: typeof UserPlus;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm",
        className,
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="text-muted-foreground">{children}</span>
    </div>
  );
}

function RoundRosterPanel({
  round,
  participants,
  gameSessionId,
  needsTiebreaker,
  isPending,
}: {
  round: RoundModel;
  participants: ParticipantWithPlayer[];
  gameSessionId: number;
  needsTiebreaker: boolean;
  isPending: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [retireTarget, setRetireTarget] =
    useState<ParticipantWithPlayer | null>(null);
  const [isRetiring, startRetireTransition] = useTransition();

  const activeParticipants = participants.filter((p) =>
    isParticipantActiveForNextRound(p, round.roundNumber),
  );
  const canRetire =
    !needsTiebreaker && activeParticipants.length > MIN_PLAYERS && !isPending;
  const rosterLocked = needsTiebreaker || isPending;

  const pendingJoins = participants.filter(
    (p) => p.firstRoundNumber === round.roundNumber + 1,
  );
  const justRetired = participants.filter(
    (p) => p.retiredAfterRoundNumber === round.roundNumber,
  );

  function handleRetireConfirm() {
    if (!retireTarget) return;
    startRetireTransition(async () => {
      try {
        const result = await retirePlayerAction({
          gameSessionId,
          participantId: retireTarget.id,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`${getParticipantName(retireTarget)} retired`);
        setRetireTarget(null);
        router.refresh();
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <>
      <Separator className="my-2" />
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={rosterLocked}
            onClick={() => setAddOpen(true)}
          >
            <UserPlus className="size-4" />
            Add Player
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canRetire}
              >
                <UserMinus className="size-4" />
                Retire Player
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {activeParticipants.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onSelect={() => setRetireTarget(p)}
                >
                  {getParticipantName(p)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {pendingJoins.map((p) => (
          <RosterChangeBanner
            key={`join-${p.id}`}
            icon={UserPlus}
            className="border-primary/30 bg-primary/5"
          >
            <span className="font-semibold text-primary">
              {getParticipantName(p)}
            </span>
            {` will join in Round ${p.firstRoundNumber}`}
          </RosterChangeBanner>
        ))}

        {justRetired.map((p) => (
          <RosterChangeBanner
            key={`retire-${p.id}`}
            icon={UserMinus}
            className="border-muted-foreground/30 bg-muted/30"
          >
            <span className="font-semibold">{getParticipantName(p)}</span>
            {` retired after Round ${p.retiredAfterRoundNumber}`}
          </RosterChangeBanner>
        ))}
      </div>

      <AddPlayerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        gameSessionId={gameSessionId}
        activeParticipants={activeParticipants}
        onAdded={() => router.refresh()}
      />

      <AlertDialog
        open={retireTarget != null}
        onOpenChange={(open) => {
          if (!open) setRetireTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire player?</AlertDialogTitle>
            <AlertDialogDescription>
              {retireTarget
                ? `${getParticipantName(retireTarget)} will not play in Round ${round.roundNumber + 1}. Their stats from earlier rounds are kept.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRetiring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRetiring}
              onClick={(e) => {
                e.preventDefault();
                handleRetireConfirm();
              }}
            >
              Retire Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Round Complete Card ─────────────────────────────────────────────────────

interface RoundCompleteCardProps {
  round: RoundModel;
  participants: ParticipantWithPlayer[];
  gameSessionId: number;
  isPending: boolean;
  onStartRound: (startingParticipantId?: number) => void;
}

export function RoundCompleteCard({
  round,
  participants,
  gameSessionId,
  isPending,
  onStartRound,
}: RoundCompleteCardProps) {
  const loserIds = round.losingParticipantIds;
  const isTiedLoss = loserIds.length > 1;
  const loserNames = loserIds.map((id) => getNameById(id, participants));
  const loserNamesFormatted = formatNamesList(loserNames);

  // Tiebreaker state for tied losses — reset when the round changes
  const [tiebreakerOpen, setTiebreakerOpen] = useState(false);
  const [tiebreakerWinnerId, setTiebreakerWinnerId] = useState<number | null>(
    null,
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: round.id is the intended trigger to reset tiebreaker state when the round changes.
  useEffect(() => {
    setTiebreakerWinnerId(null);
    setTiebreakerOpen(false);
  }, [round.id]);

  // For the "starts next round" label
  const starterName =
    isTiedLoss && tiebreakerWinnerId
      ? getNameById(tiebreakerWinnerId, participants)
      : loserNames.length === 1
        ? loserNames[0]
        : null;

  // Count lowest rolls across all turns in this round
  const lowestRolls = computeLowestRollCounts(round.turns);
  const totalLowestRolls = lowestRolls.reduce((sum, lr) => sum + lr.count, 0);

  // Whether the tiebreaker needs to be completed before starting the next round
  const needsTiebreaker = isTiedLoss && tiebreakerWinnerId === null;

  const hasLoser = loserIds.length > 0 && round.finalPenaltySips;

  return (
    <>
      <Card className="flex h-full flex-1 w-full flex-col">
        <CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <CardTitle className="text-lg sm:text-xl">
            Round {round.roundNumber} Complete
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="flex flex-1 flex-col items-center gap-4 px-4 py-6 sm:px-6 sm:py-8">
          {(round.allSafe || hasLoser) && (
            <RoundOutcomeBanner
              round={round}
              loserNamesFormatted={loserNamesFormatted}
              isTiedLoss={isTiedLoss}
            />
          )}

          {hasLoser && isTiedLoss && tiebreakerWinnerId && (
            <TiebreakerWinnerBanner
              winnerName={getNameById(tiebreakerWinnerId, participants)}
            />
          )}

          {totalLowestRolls > 0 && (
            <LowestRollsBanner
              lowestRolls={lowestRolls}
              participants={participants}
            />
          )}

          {(round.allSafe || hasLoser) && (
            <>
              <Separator className="my-2" />
              <TurnResultsList
                turns={round.turns}
                participants={participants}
                loserIds={loserIds}
                variant={round.allSafe ? "safe" : "final"}
              />
            </>
          )}
        </CardContent>

        <Separator />

        <div className="px-4 py-4 sm:px-6">
          <RoundRosterPanel
            round={round}
            participants={participants}
            gameSessionId={gameSessionId}
            needsTiebreaker={needsTiebreaker}
            isPending={isPending}
          />
        </div>

        <Separator />

        <RoundCompleteFooter
          round={round}
          isPending={isPending}
          needsTiebreaker={needsTiebreaker}
          starterName={starterName}
          onTiebreakerClick={() => setTiebreakerOpen(true)}
          onStartRound={() =>
            onStartRound(
              isTiedLoss ? (tiebreakerWinnerId ?? undefined) : undefined,
            )
          }
        />
      </Card>

      {/* Tiebreaker dialog for tied losses */}
      {isTiedLoss && (
        <TiebreakerDialog
          open={tiebreakerOpen}
          onOpenChange={setTiebreakerOpen}
          tiedParticipantIds={loserIds}
          participants={participants}
          onConfirm={(winnerId) => {
            setTiebreakerWinnerId(winnerId);
            setTiebreakerOpen(false);
          }}
        />
      )}
    </>
  );
}
