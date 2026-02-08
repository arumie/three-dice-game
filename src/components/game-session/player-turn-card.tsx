"use client";

import { useState, useTransition, useOptimistic } from "react";
import { Dices, RotateCcw, Check, Beer, Hand, Footprints, Play, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DiceDisplay } from "./dice-display";
import { EnterDiceDialog } from "./enter-dice-dialog";
import { AwardSipsDialog } from "./award-sips-dialog";
import type { PlayerTurnModel, RollModel, RoundModel } from "@/lib/models";
import type { Dice, SelectGameParticipant } from "@/db/schema";
import { formatSpecialRoll, getNameById } from "@/lib/game-helpers";
import { calculateScore, detectSpecialRoll, isSafeRoll } from "@/lib/game-utils";
import {
	rollDiceAction,
	endTurnAction,
	startRoundAction,
} from "@/app/actions";

interface PlayerTurnCardProps {
	gameSessionId: number;
	round: RoundModel;
	currentTurn: PlayerTurnModel | null;
	participants: SelectGameParticipant[];
	currentParticipantId: number;
}

type OptimisticAction =
	| { type: "roll"; dice: Dice }
	| { type: "endTurn" };

function applyOptimisticUpdate(
	currentRound: RoundModel,
	action: OptimisticAction,
): RoundModel {
	if (action.type === "roll") {
		const { dice } = action;
		const score = calculateScore(dice);
		const specialRollType = detectSpecialRoll(dice);

		const newRoll: RollModel = {
			id: -Date.now(),
			gameSessionId: currentRound.gameSessionId,
			playerTurnId: -1,
			rollNumber: 1,
			dice,
			rolledAt: new Date(),
			score,
			specialRollType,
		};

		// Find the active (in-progress) turn
		const activeTurn = currentRound.turns.find((t) => !t.isComplete && t.totalRollsUsed > 0);

		if (activeTurn) {
			// Re-roll: add roll to existing turn
			newRoll.playerTurnId = activeTurn.id;
			newRoll.rollNumber = activeTurn.totalRollsUsed + 1;
			const isSafe = isSafeRoll(specialRollType);
			const updatedTurns = currentRound.turns.map((t) => {
				if (t.id !== activeTurn.id) return t;
				const updatedRolls = [...t.rolls, newRoll];
				return {
					...t,
					rolls: updatedRolls,
					totalRollsUsed: updatedRolls.length,
					finalScore: isSafe ? null : score,
					isSafe,
					specialRollType,
				};
			});
			return { ...currentRound, turns: updatedTurns };
		}

		// First roll: create optimistic turn
		const nextParticipantId = currentRound.playerOrder.find(
			(pid) => !currentRound.turns.some((t) => t.participantId === pid),
		);
		if (nextParticipantId == null) return currentRound;

		const isSafe = isSafeRoll(specialRollType);
		const newTurn: PlayerTurnModel = {
			id: -Date.now(),
			gameSessionId: currentRound.gameSessionId,
			roundId: currentRound.id,
			participantId: nextParticipantId,
			turnOrder: currentRound.turns.length,
			endedAt: null,
			sipsAwardedTo: null,
			rolls: [newRoll],
			totalRollsUsed: 1,
			finalScore: isSafe ? null : score,
			isSafe,
			specialRollType,
			completedAt: new Date(),
			isComplete: false,
		};
		return { ...currentRound, turns: [...currentRound.turns, newTurn] };
	}

	if (action.type === "endTurn") {
		// Mark the active turn as complete
		const updatedTurns = currentRound.turns.map((t) => {
			if (!t.isComplete && t.totalRollsUsed > 0) {
				return { ...t, isComplete: true, endedAt: new Date() };
			}
			return t;
		});
		return { ...currentRound, turns: updatedTurns };
	}

	return currentRound;
}

export function PlayerTurnCard({
	gameSessionId,
	round,
	currentTurn,
	participants,
	currentParticipantId,
}: PlayerTurnCardProps) {
	const [isPending, startTransition] = useTransition();
	const [optimisticRound, addOptimistic] = useOptimistic(round, applyOptimisticUpdate);

	// Derive current state from the optimistic round
	const oCurrentTurn = optimisticRound.turns.find((t) => !t.isComplete && t.totalRollsUsed > 0)
		?? currentTurn;
	const oCurrentParticipantId = optimisticRound.turns.find((t) => !t.isComplete)
		? optimisticRound.turns.find((t) => !t.isComplete)!.participantId
		: optimisticRound.playerOrder.find(
			(pid) => !optimisticRound.turns.some((t) => t.participantId === pid && t.isComplete),
		) ?? currentParticipantId;

	const playerName = getNameById(oCurrentParticipantId, participants);
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
	// Clear "kept" highlighting when re-rolling is no longer possible
	// or when a special roll is showing (kept markers are irrelevant)
	const isSafeResult = latestRoll ? isSafeRoll(latestRoll.specialRollType) : false;
	const currentDice = canReRoll && !isSafeResult
		? rawDice
		: rawDice.map((d) => ({ ...d, kept: false }));
	const isFirstRoll = !hasDice;
	const specialLabel = latestRoll
		? formatSpecialRoll(latestRoll.specialRollType)
		: null;

	// Compute the score to beat: lowest among completed, non-safe players
	const completedNonSafe = optimisticRound.turns.filter(
		(t) => t.participantId !== oCurrentParticipantId && !t.isSafe && t.finalScore !== null,
	);
	const scoreToBeat = completedNonSafe.length > 0
		? Math.min(...completedNonSafe.map((t) => t.finalScore as number))
		: null;
	const scoreToBeatPlayer = scoreToBeat !== null
		? completedNonSafe.find((t) => t.finalScore === scoreToBeat)
		: null;
	const scoreToBeatName = scoreToBeatPlayer
		? getNameById(scoreToBeatPlayer.participantId, participants)
		: null;

	// Detect special roll states
	const isStairsRoll =
		latestRoll?.specialRollType === "stairs" ||
		latestRoll?.specialRollType === "super_stairs";
	const isSpecialRoll = isStairsRoll || latestRoll?.specialRollType === "three_of_a_kind";

	// Stairs sips to award = player's position in round (1-indexed turnOrder)
	const currentTurnOrder = oCurrentTurn?.turnOrder ?? 0;
	const stairsSipsToAward = isStairsRoll
		? (latestRoll?.specialRollType === "super_stairs"
			? (currentTurnOrder + 1) * 2
			: currentTurnOrder + 1)
		: 0;

	// Track which dice are selected for re-rolling (inverted: selected = will be re-rolled)
	const [selectedForReRoll, setSelectedForReRoll] = useState<Set<number>>(
		new Set(),
	);
	const [enterDiceOpen, setEnterDiceOpen] = useState(false);
	const [awardSipsOpen, setAwardSipsOpen] = useState(false);

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

	function handleOpenEnterDice() {
		setEnterDiceOpen(true);
	}

	function handleDiceEntered(values: number[]) {
		// Build the full dice array for the optimistic update
		let optimisticDice: Dice;
		const reRollIndices = isFirstRoll ? undefined : Array.from(selectedForReRoll);

		if (isFirstRoll) {
			optimisticDice = values.map((v) => ({ value: v, kept: false }));
		} else {
			// Merge kept dice with new values
			let newIdx = 0;
			optimisticDice = currentDice.map((die, idx) => {
				if (selectedForReRoll.has(idx)) {
					return { value: values[newIdx++], kept: false };
				}
				return { value: die.value, kept: true };
			});
		}

		setSelectedForReRoll(new Set());

		startTransition(async () => {
			addOptimistic({ type: "roll", dice: optimisticDice });
			await rollDiceAction({
				gameSessionId,
				diceValues: values,
				reRollIndices,
			});
		});
	}

	function handleEndTurn() {
		startTransition(async () => {
			addOptimistic({ type: "endTurn" });
			await endTurnAction({ gameSessionId });
		});
	}

	function handleAwardSips(targetParticipantId: number) {
		startTransition(async () => {
			addOptimistic({ type: "endTurn" });
			await endTurnAction({ gameSessionId, awardedToParticipantId: targetParticipantId });
		});
	}

	function handleStartRound() {
		startTransition(async () => {
			await startRoundAction({ gameSessionId });
		});
	}

	// Round complete summary
	if (isRoundComplete) {
		const loserName = optimisticRound.losingParticipantId
			? getNameById(optimisticRound.losingParticipantId, participants)
			: null;

		return (
			<Card className="flex h-full w-full flex-col">
				<CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
					<CardTitle className="text-lg sm:text-xl">
						Round {optimisticRound.roundNumber} Complete
					</CardTitle>
				</CardHeader>
				<Separator />
			<CardContent className="flex flex-1 flex-col items-center gap-4 px-4 py-6 sm:px-6 sm:py-8">
				{optimisticRound.allSafe ? (
					/* ---- All Safe: no loser, penalty carries over ---- */
					<>
						<div className="flex flex-col items-center gap-2 text-center">
							<ShieldCheck className="size-10 text-green-500 sm:size-12" />
							<p className="text-lg font-semibold sm:text-xl">
								Everyone is safe!
							</p>
							<p className="text-sm text-muted-foreground">
								No loser this round — everyone rolls again
							</p>
							<Badge
								variant="outline"
								className="text-sm px-3 py-1 border-amber-500/50 text-amber-600 dark:text-amber-400"
							>
								{optimisticRound.currentPenaltySips} {optimisticRound.currentPenaltySips === 1 ? "sip" : "sips"} carry over
							</Badge>
						</div>

						<Separator className="my-2" />

						<div className="flex w-full flex-col gap-2">
							<h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Results
							</h4>
							{optimisticRound.turns.map((t) => {
								const name = getNameById(
									t.participantId,
									participants,
								);
								const special = formatSpecialRoll(
									t.specialRollType,
								);
								return (
									<div
										key={t.id}
										className="flex items-center justify-between rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2"
									>
										<span className="text-sm font-medium">
											{name}
										</span>
										{special ? (
											<Badge
												variant="outline"
												className="text-[10px] px-1.5 py-0"
											>
												{special}
											</Badge>
										) : (
											<span className="text-sm font-semibold tabular-nums">
												{t.finalScore ?? "—"}
											</span>
										)}
									</div>
								);
							})}
						</div>
					</>
				) : optimisticRound.losingParticipantId && optimisticRound.finalPenaltySips ? (
					/* ---- Normal round complete: someone lost ---- */
					<>
						<div className="flex flex-col items-center gap-2 text-center">
							{optimisticRound.falseStart ? (
								<>
									<ShieldAlert className="size-10 text-amber-500 sm:size-12" />
									<p className="text-sm text-muted-foreground">
										Nobody likes a lucky first roller...
									</p>
									<p className="text-lg font-semibold sm:text-xl">
										{loserName} takes the penalty!
									</p>
								</>
							) : (
								<>
									<Beer className="size-10 text-destructive sm:size-12" />
									<p className="text-lg font-semibold sm:text-xl">
										{loserName} drinks!
									</p>
								</>
							)}
							<Badge
								variant="destructive"
								className="text-sm px-3 py-1"
							>
								{optimisticRound.finalPenaltySips} {optimisticRound.finalPenaltySips === 1 ? "sip" : "sips"}
							</Badge>
						</div>

						<Separator className="my-2" />

						<div className="flex w-full flex-col gap-2.5">
							<h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
								Final Scores
							</h4>
							{optimisticRound.turns.map((t) => {
								const name = getNameById(
									t.participantId,
									participants,
								);
								const isLoser =
									t.participantId ===
									optimisticRound.losingParticipantId;
								const special = formatSpecialRoll(
									t.specialRollType,
								);
								return (
									<div
										key={t.id}
										className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
											isLoser
												? "border-destructive/30 bg-destructive/5"
												: ""
										}`}
									>
										<span
											className={`text-base font-semibold ${isLoser ? "text-destructive" : ""}`}
										>
											{name}
										</span>
										{special ? (
											<Badge
												variant="outline"
												className="text-xs px-2.5 py-0.5"
											>
												{special}
											</Badge>
										) : (
											<span className="text-base font-bold tabular-nums">
												{t.finalScore ?? "—"}
											</span>
										)}
									</div>
								);
							})}
						</div>
					</>
				) : null}
				</CardContent>

				<Separator />

				<CardFooter className="mt-auto px-4 py-3 sm:px-6 sm:py-4">
					<Button
						className="w-full"
						disabled={isPending}
						onClick={handleStartRound}
					>
						{isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Play className="size-4" />
						)}
						{optimisticRound.allSafe ? (
							<>
								Continue — Everyone Rolls Again
							</>
						) : (
							<>
								Start Round {optimisticRound.roundNumber + 1}
								{loserName && (
									<span className="ml-1 text-xs opacity-75">
										— {loserName} starts
									</span>
								)}
							</>
						)}
					</Button>
				</CardFooter>
			</Card>
		);
	}

	return (
		<>
			<Card className="flex h-full w-full flex-col">
				<CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
					<div className="flex items-center justify-between gap-2">
						<CardTitle className="text-lg sm:text-xl">
							{playerName}&apos;s Turn
						</CardTitle>
						<Badge variant="outline" className="text-xs">
							Roll {rollCount} / {optimisticRound.maxRollsAllowed}
						</Badge>
					</div>
				</CardHeader>

				<Separator />

				<CardContent className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6 sm:px-6 sm:py-8">
				{/* Dice display */}
				<div className="flex flex-col items-center gap-3">
				{hasDice ? (
				<div className={isSpecialRoll
					? "rounded-xl border-2 border-green-500 bg-green-500/5 p-3 shadow-sm shadow-green-500/20"
					: ""
				}>
					<DiceDisplay
						dice={currentDice}
						selectedIndices={canReRoll ? selectedForReRoll : undefined}
						size="lg"
						interactive={canReRoll}
						onToggleKeep={toggleReRoll}
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

				{/* Score or special roll label */}
				{hasDice && (
					isSpecialRoll && specialLabel ? (
						<Badge variant="default" className="text-sm px-3 py-1">
							{specialLabel}
						</Badge>
					) : (
						<span className="text-2xl font-bold tabular-nums sm:text-3xl">
							{latestRoll.score}
						</span>
					)
				)}

					{/* Stairs award info */}
					{isStairsRoll && stairsSipsToAward > 0 && (
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
				</div>

				{/* Score to beat (hidden when stairs — player is safe) */}
				{scoreToBeat !== null && !isStairsRoll && (
					<div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
						<span>Beat</span>
						<span className="font-semibold text-foreground tabular-nums">
							{scoreToBeat}
						</span>
						{scoreToBeatName && (
							<span className="text-xs">({scoreToBeatName})</span>
						)}
					</div>
				)}

			{/* Hint text */}
			{canReRoll && (
						<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
							{selectedForReRoll.size > 0 ? (
								<>
									<RotateCcw className="size-3" />
									{selectedForReRoll.size === 3
										? "All dice selected for re-roll"
										: `${selectedForReRoll.size} ${selectedForReRoll.size === 1 ? "die" : "dice"} selected for re-roll`}
								</>
							) : (
								<>
									<Hand className="size-3" />
									Tap dice to select them for re-rolling
								</>
							)}
						</p>
					)}
				</CardContent>

				<Separator />

		{/* Action buttons — pinned to bottom */}
		<CardFooter className="mt-auto flex flex-col gap-2 px-4 py-3 sm:flex-row sm:px-6 sm:py-4">
			{isFirstRoll ? (
				<Button
					className="w-full"
					disabled={isPending}
					onClick={handleOpenEnterDice}
				>
					<Hand className="size-4" />
					Enter First Roll
				</Button>
			) : (
				<>
					{canReRoll && (
						<Button
							variant={isStairsRoll ? "outline" : "default"}
							className="w-full sm:flex-1"
							disabled={!hasSelection || isPending}
							onClick={handleOpenEnterDice}
						>
							<RotateCcw className="size-4" />
							Re-roll{hasSelection ? ` (${diceToReRoll})` : ""}
						</Button>
					)}
				{isStairsRoll ? (
					<Button
						className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white"
						disabled={isPending}
						onClick={() => setAwardSipsOpen(true)}
					>
						<Footprints className="size-4" />
						Award {stairsSipsToAward} {stairsSipsToAward === 1 ? "Sip" : "Sips"}
					</Button>
				) : (
					<Button
						variant={canReRoll ? "secondary" : "default"}
						className="w-full sm:flex-1"
						disabled={isPending}
						onClick={handleEndTurn}
					>
						{isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Check className="size-4" />
						)}
						End Turn
					</Button>
				)}
				</>
			)}
		</CardFooter>
			</Card>

		{/* Enter real dice dialog */}
		<EnterDiceDialog
			open={enterDiceOpen}
			onOpenChange={setEnterDiceOpen}
			diceCount={isFirstRoll ? 3 : diceToReRoll}
			onConfirm={handleDiceEntered}
		/>

		{/* Award sips dialog (stairs) */}
		<AwardSipsDialog
			open={awardSipsOpen}
			onOpenChange={setAwardSipsOpen}
			sipsToAward={stairsSipsToAward}
			participants={participants}
			currentParticipantId={oCurrentParticipantId}
			onConfirm={handleAwardSips}
		/>
	</>
	);
}
