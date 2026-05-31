"use client";

import {
  Check,
  Dices,
  Footprints,
  Hand,
  Loader2,
  RotateCcw,
  Toilet,
  TrendingDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { endTurnAction, rollDiceAction, startRoundAction } from "@/app/actions";
import { PlayerName } from "@/components/player-name";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Dice } from "@/db/schema";
import { formatSpecialRoll, getNameById } from "@/lib/game-helpers";
import { suppressGameSync } from "@/lib/game-sync";
import {
  computeScoreToBeat,
  computeStairsSipsToAward,
  isSafeRoll,
  violatesGentlemanRule,
} from "@/lib/game-utils";
import type {
  ParticipantWithPlayer,
  PlayerTurnModel,
  RollModel,
  RoundModel,
} from "@/lib/models";
import { AwardSipsDialog } from "./award-sips-dialog";
import { DiceDisplay } from "./dice-display";
import { EnterDiceDialog } from "./enter-dice-dialog";
import { APP_DICE_EVENT } from "./game-state-card";
import { GentlemanRuleDialog } from "./gentleman-rule-dialog";
import { applyOptimisticUpdate } from "./optimistic-round";
import { RoundCompleteCard } from "./round-complete-card";

const END_TURN_COOLDOWN_MS = 1_500;

// ─── Presentational Sub-components ───────────────────────────────────────────

function DiceSection({
  hasDice,
  currentDice,
  isRolling,
  rollingIndices,
  isSpecialRoll,
  specialLabel,
  isLowestRoll,
  isShitStairsRoll,
  latestRoll,
  canReRoll,
  selectedForReRoll,
  stairsSipsToAward,
  isStairsRoll,
  onToggleKeep,
}: {
  hasDice: boolean;
  currentDice: Dice;
  isRolling: boolean;
  rollingIndices: Set<number>;
  isSpecialRoll: boolean;
  specialLabel: string | null;
  isLowestRoll: boolean;
  isShitStairsRoll: boolean;
  latestRoll: RollModel | null;
  canReRoll: boolean;
  selectedForReRoll: Set<number>;
  stairsSipsToAward: number;
  isStairsRoll: boolean;
  onToggleKeep: (index: number) => void;
}) {
  const showDice = hasDice || isRolling;

  return (
    <div className="flex flex-col items-center gap-3">
      {showDice ? (
        <div
          className={
            !isRolling && isSpecialRoll
              ? "rounded-xl border-2 border-green-500 bg-green-500/5 p-3 shadow-sm shadow-green-500/20"
              : ""
          }
        >
          <DiceDisplay
            dice={currentDice}
            selectedIndices={
              !isRolling && canReRoll ? selectedForReRoll : undefined
            }
            rollingIndices={isRolling ? rollingIndices : undefined}
            size="lg"
            interactive={!isRolling && canReRoll}
            onToggleKeep={onToggleKeep}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex size-18 items-center justify-center rounded-lg border-2 border-dashed border-border"
            >
              <Dices className="size-6 text-muted-foreground/40" />
            </div>
          ))}
        </div>
      )}

      {/* Score or special roll label — hidden during rolling animation */}
      {hasDice &&
        !isRolling &&
        (isSpecialRoll && specialLabel ? (
          <Badge variant="default" className="text-sm px-3 py-1">
            {specialLabel}
          </Badge>
        ) : isShitStairsRoll && specialLabel ? (
          <Badge
            variant="outline"
            className="text-sm px-3 py-1 border-amber-700/50 text-amber-700 dark:text-amber-500"
          >
            {specialLabel}
          </Badge>
        ) : isLowestRoll ? (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            Lowest!
          </Badge>
        ) : (
          <span className="text-2xl font-bold tabular-nums sm:text-3xl">
            {latestRoll?.score}
          </span>
        ))}

      {/* Stairs award info */}
      {!isRolling && isStairsRoll && stairsSipsToAward > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm">
          <Footprints className="size-4 text-green-600 dark:text-green-400" />
          <span className="text-muted-foreground">
            You can award{" "}
            <span className="font-semibold text-green-600 dark:text-green-400">
              {stairsSipsToAward} {stairsSipsToAward === 1 ? "sip" : "sips"}
            </span>{" "}
            to a player
          </span>
        </div>
      )}

      {/* Lowest roll — everyone drinks */}
      {!isRolling && isLowestRoll && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
          <TrendingDown className="size-4 text-amber-600 dark:text-amber-400" />
          <span className="text-muted-foreground">
            Rock bottom!{" "}
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              Everyone takes a sip for that disaster
            </span>
          </span>
        </div>
      )}

      {/* Shit stairs — almost but not quite */}
      {!isRolling && isShitStairsRoll && (
        <div className="flex items-center gap-2 rounded-md border border-amber-700/30 bg-amber-700/5 px-3 py-2 text-sm">
          <Toilet className="size-4 text-amber-700 dark:text-amber-500" />
          <span className="text-muted-foreground">
            D&apos;oh!{" "}
            <span className="font-semibold text-amber-700 dark:text-amber-500">
              So close, yet so far from real stairs
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

function ScoreToBeatBar({
  score,
  playerName,
}: {
  score: number;
  playerName: string | null;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
      <span>Beat</span>
      <span className="font-semibold text-foreground tabular-nums">
        {score}
      </span>
      {playerName && <span className="text-xs">({playerName})</span>}
    </div>
  );
}

function ReRollHint({ selectedCount }: { selectedCount: number }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {selectedCount > 0 ? (
        <>
          <RotateCcw className="size-3" />
          {selectedCount === 3
            ? "All dice selected for re-roll"
            : `${selectedCount} ${selectedCount === 1 ? "die" : "dice"} selected for re-roll`}
        </>
      ) : (
        <>
          <Hand className="size-3" />
          Tap dice to select them for re-rolling
        </>
      )}
    </p>
  );
}

function TurnActionButtons({
  isFirstRoll,
  canReRoll,
  isStairsRoll,
  hasSelection,
  diceToReRoll,
  stairsSipsToAward,
  isPending,
  isEndTurnCooldown,
  isGentlemanRuleViolation,
  isRolling,
  useAppDice,
  nextPlayerName,
  onEnterDice,
  onRollDice,
  onAwardSips,
  onGentlemanRule,
  onEndTurn,
}: {
  isFirstRoll: boolean;
  canReRoll: boolean;
  isStairsRoll: boolean;
  hasSelection: boolean;
  diceToReRoll: number;
  stairsSipsToAward: number;
  isPending: boolean;
  isEndTurnCooldown: boolean;
  isGentlemanRuleViolation: boolean;
  isRolling: boolean;
  useAppDice: boolean;
  nextPlayerName: string | null;
  onEnterDice: () => void;
  onRollDice: () => void;
  onAwardSips: () => void;
  onGentlemanRule: () => void;
  onEndTurn: () => void;
}) {
  const endTurnDisabled = isPending || isEndTurnCooldown;
  if (isFirstRoll) {
    return (
      <CardFooter className="mt-auto flex flex-col gap-2 px-4 py-3 sm:flex-row sm:px-6 sm:py-4">
        <Button
          className="w-full h-14 sm:h-10"
          onClick={useAppDice ? onRollDice : onEnterDice}
          disabled={isRolling}
        >
          {useAppDice ? (
            <Dices className="size-4" />
          ) : (
            <Hand className="size-4" />
          )}
          {useAppDice ? "Roll Dice" : "Enter First Roll"}
        </Button>
      </CardFooter>
    );
  }

  return (
    <CardFooter className="mt-auto flex flex-col gap-4 px-4 py-3 sm:flex-row sm:gap-2 sm:px-6 sm:py-4">
      {canReRoll && (
        <Button
          variant={isStairsRoll ? "outline" : "default"}
          className="w-full h-12 sm:h-10 sm:flex-1"
          disabled={!hasSelection || isRolling}
          onClick={useAppDice ? onRollDice : onEnterDice}
        >
          <RotateCcw className="size-4" />
          Re-roll{hasSelection ? ` (${diceToReRoll})` : ""}
        </Button>
      )}
      {isStairsRoll ? (
        <Button
          className={`w-full h-12 sm:h-10 sm:flex-1 bg-green-600 hover:bg-green-700 text-white${canReRoll ? " max-sm:mt-1" : ""}`}
          onClick={onAwardSips}
          disabled={endTurnDisabled}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Footprints className="size-4" />
          )}
          Award {stairsSipsToAward} {stairsSipsToAward === 1 ? "Sip" : "Sips"}
        </Button>
      ) : (
        <Button
          variant={canReRoll ? "secondary" : "default"}
          className={`w-full h-12 sm:h-10 sm:flex-1${canReRoll ? " max-sm:mt-1" : ""}`}
          onClick={isGentlemanRuleViolation ? onGentlemanRule : onEndTurn}
          disabled={endTurnDisabled}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          {nextPlayerName
            ? `End Turn — ${nextPlayerName} is up next!`
            : "End Turn"}
        </Button>
      )}
    </CardFooter>
  );
}

// ─── Player Turn Card ────────────────────────────────────────────────────────

interface PlayerTurnCardProps {
  gameSessionId: number;
  round: RoundModel;
  currentTurn: PlayerTurnModel | null;
  participants: ParticipantWithPlayer[];
  currentParticipantId: number;
}

export function PlayerTurnCard({
  gameSessionId,
  round,
  currentTurn,
  participants,
  currentParticipantId,
}: PlayerTurnCardProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticRound, addOptimistic] = useOptimistic(
    round,
    applyOptimisticUpdate,
  );
  const router = useRouter();

  const PENDING_TIMEOUT_MS = 5_000;
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setIsTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      setIsTimedOut(true);
      toast.error("Action timed out. Please try again.");
      router.refresh();
    }, PENDING_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [isPending, router]);

  const effectivePending = isPending && !isTimedOut;

  // Derive current state from the optimistic round
  const oCurrentTurn =
    optimisticRound.turns.find((t) => !t.isComplete && t.totalRollsUsed > 0) ??
    currentTurn;
  const oIncompleteTurn = optimisticRound.turns.find((t) => !t.isComplete);
  const oCurrentParticipantId = oIncompleteTurn
    ? oIncompleteTurn.participantId
    : (optimisticRound.playerOrder.find(
        (pid) =>
          !optimisticRound.turns.some(
            (t) => t.participantId === pid && t.isComplete,
          ),
      ) ?? currentParticipantId);

  const isRoundComplete = optimisticRound.status === "completed";

  // Current dice state — the latest roll's dice
  const latestRoll =
    oCurrentTurn && oCurrentTurn.rolls.length > 0
      ? oCurrentTurn.rolls[oCurrentTurn.rolls.length - 1]
      : null;
  const rawDice = latestRoll?.dice ?? [
    { value: 0, kept: false },
    { value: 0, kept: false },
    { value: 0, kept: false },
  ];
  const rollCount = oCurrentTurn?.totalRollsUsed ?? 0;
  const hasDice = latestRoll !== null;
  const canReRoll = hasDice && rollCount < optimisticRound.maxRollsAllowed;
  const isLowestRoll = latestRoll?.specialRollType === "lowest";
  const isSafeResult = latestRoll
    ? isSafeRoll(latestRoll.specialRollType)
    : false;
  const currentDice =
    canReRoll && !isSafeResult && !isLowestRoll
      ? rawDice
      : rawDice.map((d) => ({ ...d, kept: false }));
  const isFirstRoll = !hasDice;
  const specialLabel = latestRoll
    ? formatSpecialRoll(latestRoll.specialRollType)
    : null;

  // Compute the score to beat using extracted utility
  const scoreToBeatResult = computeScoreToBeat(
    optimisticRound.turns,
    oCurrentParticipantId,
  );
  const scoreToBeat = scoreToBeatResult?.score ?? null;
  const scoreToBeatName = scoreToBeatResult
    ? getNameById(scoreToBeatResult.participantId, participants)
    : null;

  // Detect special roll states
  const isStairsRoll =
    latestRoll?.specialRollType === "stairs" ||
    latestRoll?.specialRollType === "super_stairs";
  const isShitStairsRoll = latestRoll?.specialRollType === "shit_stairs";
  const isSpecialRoll =
    isStairsRoll || latestRoll?.specialRollType === "three_of_a_kind";

  // Stairs sips to award using extracted utility
  const currentTurnOrder = oCurrentTurn?.turnOrder ?? 0;
  const stairsSipsToAward = computeStairsSipsToAward(
    latestRoll?.specialRollType ?? "none",
    currentTurnOrder,
  );

  // Next player in turn order (null if current player is last)
  const currentOrderIndex = optimisticRound.playerOrder.indexOf(
    oCurrentParticipantId,
  );
  const nextParticipantId =
    currentOrderIndex >= 0 &&
    currentOrderIndex < optimisticRound.playerOrder.length - 1
      ? optimisticRound.playerOrder[currentOrderIndex + 1]
      : null;
  const nextPlayerName =
    nextParticipantId != null
      ? getNameById(nextParticipantId, participants)
      : null;

  // Gentleman rule: last player can't end turn if their score is too high to lose
  const isLastPlayer =
    (oCurrentTurn?.turnOrder ?? -1) === optimisticRound.playerOrder.length - 1;
  const isGentlemanRuleViolation = violatesGentlemanRule({
    isLastPlayer,
    isSafe: isSafeResult,
    hasRollsRemaining: canReRoll,
    currentScore: latestRoll?.score ?? null,
    lowestScoreToBeat: scoreToBeat,
  });

  // "Use App Dice" — synced from GameStateCard via custom event + sessionStorage
  const [useAppDice, setUseAppDice] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(`useAppDice:${gameSessionId}`) === "true";
  });

  useEffect(() => {
    function onAppDiceChanged(e: Event) {
      setUseAppDice((e as CustomEvent).detail);
    }
    window.addEventListener(APP_DICE_EVENT, onAppDiceChanged);
    return () => window.removeEventListener(APP_DICE_EVENT, onAppDiceChanged);
  }, []);

  // Track which dice are selected for re-rolling (inverted: selected = will be re-rolled)
  const [selectedForReRoll, setSelectedForReRoll] = useState<Set<number>>(
    new Set(),
  );
  const [enterDiceOpen, setEnterDiceOpen] = useState(false);
  const [awardSipsOpen, setAwardSipsOpen] = useState(false);
  const [gentlemanRuleOpen, setGentlemanRuleOpen] = useState(false);

  const [isEndTurnCooldown, setIsEndTurnCooldown] = useState(false);
  const endTurnCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevParticipantIdRef = useRef<number | null>(null);

  const startEndTurnCooldown = useCallback(() => {
    setIsEndTurnCooldown(true);
    if (endTurnCooldownRef.current) {
      clearTimeout(endTurnCooldownRef.current);
    }
    endTurnCooldownRef.current = setTimeout(() => {
      endTurnCooldownRef.current = null;
      setIsEndTurnCooldown(false);
    }, END_TURN_COOLDOWN_MS);
  }, []);

  useEffect(() => {
    if (
      prevParticipantIdRef.current !== null &&
      prevParticipantIdRef.current !== oCurrentParticipantId
    ) {
      startEndTurnCooldown();
    }
    prevParticipantIdRef.current = oCurrentParticipantId;
  }, [oCurrentParticipantId, startEndTurnCooldown]);

  useEffect(() => {
    return () => {
      if (endTurnCooldownRef.current) {
        clearTimeout(endTurnCooldownRef.current);
      }
    };
  }, []);

  // Rolling animation state
  const [rollingIndices, setRollingIndices] = useState<Set<number>>(new Set());
  const rollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRollRef = useRef<{
    optimisticDice: Dice;
    values: number[];
    reRollIndices?: number[];
  } | null>(null);

  useEffect(() => {
    return () => {
      if (rollingTimeoutRef.current) {
        clearTimeout(rollingTimeoutRef.current);
      }
    };
  }, []);

  const isRolling = rollingIndices.size > 0;

  function toggleReRoll(index: number) {
    if (!canReRoll) return;
    setSelectedForReRoll((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  const diceToReRoll = isFirstRoll ? 3 : selectedForReRoll.size;
  const hasSelection = diceToReRoll > 0;

  function handleAutoRoll() {
    const count = isFirstRoll ? 3 : diceToReRoll;
    const values = Array.from(
      { length: count },
      () => Math.floor(Math.random() * 6) + 1,
    );
    handleDiceEntered(values, true);
  }

  function applyPendingRoll() {
    const pending = pendingRollRef.current;
    if (!pending) return;
    pendingRollRef.current = null;

    suppressGameSync();
    startTransition(async () => {
      try {
        addOptimistic({ type: "roll", dice: pending.optimisticDice });
        await rollDiceAction({
          gameSessionId,
          diceValues: pending.values,
          reRollIndices: pending.reRollIndices,
        });
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  function handleDiceEntered(values: number[], wasAutoRolled: boolean) {
    let optimisticDice: Dice;
    const reRollIndices = isFirstRoll
      ? undefined
      : Array.from(selectedForReRoll);

    if (isFirstRoll) {
      optimisticDice = values.map((v) => ({ value: v, kept: false }));
    } else {
      let newIdx = 0;
      optimisticDice = currentDice.map((die, idx) => {
        if (selectedForReRoll.has(idx)) {
          return { value: values[newIdx++], kept: false };
        }
        return { value: die.value, kept: true };
      });
    }

    setSelectedForReRoll(new Set());

    if (wasAutoRolled) {
      const indices = isFirstRoll
        ? new Set([0, 1, 2])
        : new Set(selectedForReRoll);

      setRollingIndices(indices);
      pendingRollRef.current = { optimisticDice, values, reRollIndices };

      rollingTimeoutRef.current = setTimeout(() => {
        rollingTimeoutRef.current = null;
        setRollingIndices(new Set());
        applyPendingRoll();
      }, 600);
      return;
    }

    pendingRollRef.current = { optimisticDice, values, reRollIndices };
    applyPendingRoll();
  }

  function handleEndTurn() {
    startEndTurnCooldown();
    suppressGameSync();
    startTransition(async () => {
      try {
        addOptimistic({ type: "endTurn" });
        await endTurnAction({ gameSessionId });
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  function handleAwardSips(targetParticipantId: number) {
    startEndTurnCooldown();
    suppressGameSync();
    startTransition(async () => {
      try {
        addOptimistic({ type: "endTurn" });
        await endTurnAction({
          gameSessionId,
          awardedToParticipantId: targetParticipantId,
        });
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  function handleStartRound(startingParticipantId?: number) {
    suppressGameSync();
    startTransition(async () => {
      try {
        await startRoundAction({ gameSessionId, startingParticipantId });
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  // ─── Round Complete ────────────────────────────────────────────────────

  if (isRoundComplete) {
    return (
      <RoundCompleteCard
        round={optimisticRound}
        participants={participants}
        isPending={effectivePending}
        onStartRound={handleStartRound}
      />
    );
  }

  // ─── Active Turn ───────────────────────────────────────────────────────

  return (
    <>
      <Card className="flex h-full flex-1 w-full flex-col">
        <CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg sm:text-xl">
              <PlayerName
                participantId={oCurrentParticipantId}
                participants={participants}
              />
              &apos;s Turn
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Roll {rollCount} / {optimisticRound.maxRollsAllowed}
            </Badge>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <DiceSection
            hasDice={hasDice}
            currentDice={currentDice}
            isRolling={isRolling}
            rollingIndices={rollingIndices}
            isSpecialRoll={isSpecialRoll}
            specialLabel={specialLabel}
            isLowestRoll={isLowestRoll}
            isShitStairsRoll={isShitStairsRoll}
            latestRoll={latestRoll}
            canReRoll={canReRoll}
            selectedForReRoll={selectedForReRoll}
            stairsSipsToAward={stairsSipsToAward}
            isStairsRoll={isStairsRoll}
            onToggleKeep={toggleReRoll}
          />

          {scoreToBeat !== null && !isStairsRoll && (
            <ScoreToBeatBar score={scoreToBeat} playerName={scoreToBeatName} />
          )}

          {canReRoll && <ReRollHint selectedCount={selectedForReRoll.size} />}
        </CardContent>

        <Separator />

        <TurnActionButtons
          isFirstRoll={isFirstRoll}
          canReRoll={canReRoll}
          isStairsRoll={isStairsRoll}
          hasSelection={hasSelection}
          diceToReRoll={diceToReRoll}
          stairsSipsToAward={stairsSipsToAward}
          isPending={effectivePending}
          isEndTurnCooldown={isEndTurnCooldown}
          isGentlemanRuleViolation={isGentlemanRuleViolation}
          isRolling={isRolling}
          useAppDice={useAppDice}
          nextPlayerName={nextPlayerName}
          onEnterDice={() => setEnterDiceOpen(true)}
          onRollDice={handleAutoRoll}
          onAwardSips={() => setAwardSipsOpen(true)}
          onGentlemanRule={() => setGentlemanRuleOpen(true)}
          onEndTurn={handleEndTurn}
        />
      </Card>

      <EnterDiceDialog
        open={enterDiceOpen}
        onOpenChange={setEnterDiceOpen}
        diceCount={isFirstRoll ? 3 : diceToReRoll}
        onConfirm={handleDiceEntered}
      />

      <AwardSipsDialog
        open={awardSipsOpen}
        onOpenChange={setAwardSipsOpen}
        sipsToAward={stairsSipsToAward}
        participants={participants}
        currentParticipantId={oCurrentParticipantId}
        onConfirm={handleAwardSips}
      />

      <GentlemanRuleDialog
        open={gentlemanRuleOpen}
        onOpenChange={setGentlemanRuleOpen}
        currentScore={latestRoll?.score ?? 0}
        scoreToBeat={scoreToBeat ?? 0}
        onEndTurn={() => {
          setGentlemanRuleOpen(false);
          handleEndTurn();
        }}
      />
    </>
  );
}
