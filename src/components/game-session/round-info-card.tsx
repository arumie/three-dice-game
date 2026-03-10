import { Beer, ChevronRight, Clock, Flame, Skull } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DiceDisplay } from "./dice-display";
import type { RoundModel } from "@/lib/models";
import type { SelectGameParticipant } from "@/db/schema";
import {
  formatSpecialRoll,
  formatStatus,
  getNameById,
  getStatusVariant,
} from "@/lib/game-helpers";

interface RoundInfoCardProps {
  round: RoundModel;
  participants: SelectGameParticipant[];
  currentParticipantId?: number;
}

function getSipsSeverity(sips: number) {
  if (sips >= 10) return "extreme";
  if (sips >= 7) return "high";
  if (sips >= 4) return "medium";
  return "low";
}

function SipsAtStake({ sips }: { sips: number }) {
  const severity = getSipsSeverity(sips);

  const config = {
    low: {
      bg: "bg-amber-500/5",
      border: "border-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
      numColor: "text-amber-600 dark:text-amber-400",
      icon: Beer,
      label: "sips at stake",
    },
    medium: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      text: "text-orange-600 dark:text-orange-400",
      numColor: "text-orange-600 dark:text-orange-400",
      icon: Beer,
      label: "sips at stake",
    },
    high: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-600 dark:text-red-400",
      numColor: "text-red-600 dark:text-red-400",
      icon: Flame,
      label: "sips at stake!",
    },
    extreme: {
      bg: "bg-red-500/15",
      border: "border-red-500/40",
      text: "text-red-600 dark:text-red-400",
      numColor: "text-red-600 dark:text-red-400",
      icon: Skull,
      label: "sips at stake!!",
    },
  }[severity];

  const Icon = config.icon;

  return (
    <div
      className={`mx-4 my-3 flex items-center gap-3 rounded-lg border px-3 py-2.5 sm:mx-5 ${config.bg} ${config.border}`}
    >
      <Icon
        className={`size-5 shrink-0 ${config.text} ${severity === "extreme" ? "animate-pulse" : ""}`}
      />
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-2xl font-bold tabular-nums leading-none ${config.numColor}`}
        >
          {sips}
        </span>
        <span className={`text-sm font-medium ${config.text}`}>
          {config.label}
        </span>
      </div>
    </div>
  );
}

export function RoundInfoCard({
  round,
  participants,
  currentParticipantId,
}: RoundInfoCardProps) {
  // Find the lowest score among completed, non-safe players to determine who's losing
  const completedScores = round.turns
    .filter((t) => !t.isSafe && t.finalScore !== null)
    .map((t) => ({
      participantId: t.participantId,
      score: t.finalScore as number,
    }));
  const lowestScore =
    completedScores.length > 0
      ? Math.min(...completedScores.map((s) => s.score))
      : null;
  const losingParticipantIds = new Set(
    completedScores
      .filter((s) => s.score === lowestScore)
      .map((s) => s.participantId),
  );

  function getRowStyle(
    participantId: number,
    isCurrent: boolean,
    turnData: (typeof round.turns)[number] | undefined,
  ) {
    if (isCurrent) return "border-primary/50 bg-primary/5";
    if (!turnData || !turnData.isComplete) return "border-border";
    if (turnData.isSafe) return "border-green-500/50 bg-green-500/5";
    if (losingParticipantIds.has(participantId))
      return "border-red-500/50 bg-red-500/5";
    if (turnData.finalScore !== null && turnData.finalScore > lowestScore!)
      return "border-green-500/50 bg-green-500/5";
    return "border-border";
  }

  return (
    <Card className="h-full w-full">
      <CardHeader className="px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">
            Round {round.roundNumber}
          </CardTitle>
          <Badge variant={getStatusVariant(round.status)}>
            {formatStatus(round.status)}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      {/* Sips at stake — escalating severity */}
      <SipsAtStake sips={round.currentPenaltySips} />

      {/* Carry-over note */}
      {(round.carryOverSips ?? 0) > 0 && (
        <div className="mx-4 -mt-1 mb-1 text-center text-[11px] text-muted-foreground sm:mx-5">
          Includes {round.carryOverSips} carry-over{" "}
          {round.carryOverSips === 1 ? "sip" : "sips"} from all-safe round
        </div>
      )}

      <CardContent className="flex flex-col gap-3 px-4 py-3 sm:px-5 sm:py-4">
        {/* Player order */}
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Player Order
        </h3>
        <div className="flex flex-col gap-1.5">
          {round.playerOrder.map((participantId, idx) => {
            const name = getNameById(participantId, participants);
            const turnData = round.turns.find(
              (t) => t.participantId === participantId,
            );
            const isCurrent =
              round.status !== "completed" &&
              participantId === currentParticipantId;
            const isCompleted = turnData?.isComplete === true;
            const specialLabel = turnData?.specialRollType
              ? formatSpecialRoll(turnData.specialRollType)
              : null;

            return (
              <div
                key={participantId}
                className={`flex flex-col gap-2 rounded-md border px-3 py-2 transition-colors ${getRowStyle(participantId, isCurrent, turnData)}`}
              >
                {/* Top row: order, name, status badge / score */}
                <div className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium">
                    {name}
                    {isCurrent && (
                      <ChevronRight className="ml-1 inline size-3.5 text-primary" />
                    )}
                  </span>
                  {isCompleted ? (
                    specialLabel ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {specialLabel}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 tabular-nums"
                      >
                        {turnData.finalScore}
                      </Badge>
                    )
                  ) : isCurrent ? (
                    <Badge
                      variant="default"
                      className="text-[10px] px-1.5 py-0"
                    >
                      Playing
                    </Badge>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      Waiting
                    </span>
                  )}
                </div>

                {/* Bottom row: dice (only if player has rolled) */}
                {isCompleted && turnData.rolls.length > 0 && (
                  <div className="flex justify-end">
                    <DiceDisplay
                      dice={turnData.rolls[turnData.rolls.length - 1].dice.map(
                        (d) => ({ ...d, kept: false }),
                      )}
                      size="sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Round result (if completed) */}
        {round.status === "completed" &&
          round.losingParticipantIds.length > 0 &&
          round.finalPenaltySips && (
            <>
              <Separator />
              <div className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">
                    {round.losingParticipantIds
                      .map((id) => getNameById(id, participants))
                      .join(" & ")}
                  </span>{" "}
                  lost this round
                </span>
                <Badge variant="destructive" className="text-xs">
                  {round.finalPenaltySips} sips
                  {round.losingParticipantIds.length > 1 ? " each" : ""}
                </Badge>
              </div>
            </>
          )}
      </CardContent>
    </Card>
  );
}
