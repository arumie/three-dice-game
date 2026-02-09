"use client";

import { useState, useCallback } from "react";
import { Dices, Crown, RotateCcw, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { DiceDisplay } from "./dice-display";
import { cn } from "@/lib/utils";
import type { SelectGameParticipant } from "@/db/schema";
import { getParticipantName } from "@/lib/game-helpers";

const DICE_VALUES = [1, 2, 3, 4, 5, 6];

interface TiebreakerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tiedParticipantIds: number[];
	participants: SelectGameParticipant[];
	onConfirm: (winnerId: number) => void;
}

export function TiebreakerDialog({
	open,
	onOpenChange,
	tiedParticipantIds,
	participants,
	onConfirm,
}: TiebreakerDialogProps) {
	// Track which participants still need to roll in this tiebreaker round
	const [activeIds, setActiveIds] = useState<number[]>(tiedParticipantIds);
	// Map of participantId -> die value (null = not yet rolled)
	const [rolls, setRolls] = useState<Map<number, number | null>>(
		() => new Map(tiedParticipantIds.map((id) => [id, null])),
	);
	const [winnerId, setWinnerId] = useState<number | null>(null);

	// Reset state when dialog opens with new participants
	const resetState = useCallback(
		(ids: number[]) => {
			setActiveIds(ids);
			setRolls(new Map(ids.map((id) => [id, null])));
			setWinnerId(null);
		},
		[],
	);

	// Handle open changes — reset when opening
	function handleOpenChange(v: boolean) {
		if (v) {
			resetState(tiedParticipantIds);
		}
		onOpenChange(v);
	}

	function setValueForPlayer(participantId: number, value: number) {
		setRolls((prev) => {
			const next = new Map(prev);
			next.set(participantId, value);
			return next;
		});
	}

	function randomRollForPlayer(participantId: number) {
		const value = Math.floor(Math.random() * 6) + 1;
		setValueForPlayer(participantId, value);
	}

	// Check if all active participants have rolled
	const allRolled = activeIds.every((id) => rolls.get(id) != null);

	// Determine the result once everyone has rolled
	const highestValue = allRolled
		? Math.max(...activeIds.map((id) => rolls.get(id)!))
		: null;

	const highestRollers = allRolled
		? activeIds.filter((id) => rolls.get(id) === highestValue)
		: [];

	const resolvedWinnerId = allRolled && highestRollers.length === 1
		? highestRollers[0]
		: null;
	const hasWinner = resolvedWinnerId != null;
	const hasTie = allRolled && highestRollers.length > 1;

	function handleReRoll() {
		// Only the tied players re-roll
		setActiveIds(highestRollers);
		setRolls(new Map(highestRollers.map((id) => [id, null])));
		setWinnerId(null);
	}

	function handleConfirm() {
		if (resolvedWinnerId == null) return;
		setWinnerId(resolvedWinnerId);
		onConfirm(resolvedWinnerId);
		onOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Dices className="size-5" />
						Tiebreaker Roll
					</DialogTitle>
					<DialogDescription>
						Each tied loser rolls a single die. Highest roll starts
						the next round.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 py-2">
					{activeIds.map((id) => {
						const name = getParticipantName(
							participants.find((p) => p.id === id)!,
						);
						const value = rolls.get(id) ?? null;
						const isHighest = hasWinner && id === resolvedWinnerId;
						const isTiedHigh = hasTie && highestRollers.includes(id);

						return (
							<div
								key={id}
								className={cn(
									"flex flex-col gap-2.5 rounded-lg border px-4 py-3 transition-colors",
									isHighest
										? "border-green-500/50 bg-green-500/5"
										: isTiedHigh
											? "border-amber-500/50 bg-amber-500/5"
											: "border-border",
								)}
							>
								{/* Player name row */}
								<div className="flex items-center gap-3">
									<div
										className={cn(
											"flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
											isHighest
												? "bg-green-500 text-white"
												: "bg-muted text-muted-foreground",
										)}
									>
										{name.charAt(0).toUpperCase()}
									</div>
									<span className="flex-1 text-sm font-medium">
										{name}
										{isHighest && (
											<Crown className="ml-1.5 inline size-3.5 text-green-500" />
										)}
									</span>
									{value != null && (
										<DiceDisplay
											dice={[{ value, kept: false }]}
											size="sm"
										/>
									)}
								</div>

								{/* Die picker or result */}
								{value == null && (
									<div className="flex items-center gap-2">
										<div className="flex gap-1.5">
											{DICE_VALUES.map((v) => (
												<button
													key={v}
													type="button"
													onClick={() => setValueForPlayer(id, v)}
													className={cn(
														"flex size-9 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all",
														"border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5",
													)}
												>
													{v}
												</button>
											))}
										</div>
										<Button
											size="icon"
											variant="ghost"
											className="size-9 shrink-0"
											onClick={() => randomRollForPlayer(id)}
											title="Roll for me"
										>
											<Shuffle className="size-4" />
										</Button>
									</div>
								)}
							</div>
						);
					})}
				</div>

				{/* Tie notice */}
				{hasTie && (
					<p className="text-center text-sm text-muted-foreground">
						Still tied! The tied players need to re-roll.
					</p>
				)}

				<DialogFooter>
					{hasTie ? (
						<Button onClick={handleReRoll} className="w-full">
							<RotateCcw className="size-4" />
							Re-roll Tiebreaker
						</Button>
					) : hasWinner && resolvedWinnerId != null ? (
						<Button onClick={handleConfirm} className="w-full">
							<Crown className="size-4" />
							{getParticipantName(
								participants.find((p) => p.id === resolvedWinnerId)!,
							)}{" "}
							Starts Next Round
						</Button>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
