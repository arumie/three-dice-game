"use client";

import { useState } from "react";
import {
	ChevronLeft,
	ChevronRight,
	Beer,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DiceDisplay } from "./dice-display";
import type { RoundModel } from "@/lib/models";
import type { SelectGameParticipant } from "@/db/schema";
import { formatSpecialRoll, getNameById } from "@/lib/game-helpers";

interface RoundBrowserProps {
	rounds: RoundModel[];
	participants: SelectGameParticipant[];
}

export function RoundBrowser({ rounds, participants }: RoundBrowserProps) {
	const completedRounds = rounds.filter((r) => r.status === "completed");
	const [currentIndex, setCurrentIndex] = useState(
		Math.max(0, completedRounds.length - 1),
	);

	if (completedRounds.length === 0) {
		return null;
	}

	const round = completedRounds[currentIndex];
	const hasPrev = currentIndex > 0;
	const hasNext = currentIndex < completedRounds.length - 1;

	const loserName = round.losingParticipantId
		? getNameById(round.losingParticipantId, participants)
		: null;

	return (
		<Card className="mx-auto w-full max-w-2xl">
			{/* Header with navigation */}
			<CardHeader className="px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
				<div className="flex items-center justify-between">
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						disabled={!hasPrev}
						onClick={() => setCurrentIndex((i) => i - 1)}
					>
						<ChevronLeft className="size-4" />
						<span className="sr-only">Previous round</span>
					</Button>

					<CardTitle className="text-base sm:text-lg">
						Round {round.roundNumber}
						<span className="ml-2 text-xs font-normal text-muted-foreground">
							of {completedRounds.length}
						</span>
					</CardTitle>

					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						disabled={!hasNext}
						onClick={() => setCurrentIndex((i) => i + 1)}
					>
						<ChevronRight className="size-4" />
						<span className="sr-only">Next round</span>
					</Button>
				</div>
			</CardHeader>

			<Separator />

			<CardContent className="flex flex-col gap-4 px-4 py-4 sm:px-6">
				{/* Immunity banner */}
				{round.firstRollImmunity && (
					<div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
						<ShieldAlert className="size-4 shrink-0 text-amber-500" />
						<span className="text-muted-foreground">
							First-roll immunity — {loserName} took the penalty
						</span>
					</div>
				)}

				{/* Player turns */}
				<div className="flex flex-col gap-1.5">
					{round.playerOrder.map((participantId) => {
						const name = getNameById(participantId, participants);
						const turn = round.turns.find(
							(t) => t.participantId === participantId,
						);
						const isLoser =
							participantId === round.losingParticipantId;
						const special = turn
							? formatSpecialRoll(turn.specialRollType)
							: null;
						const lastRoll =
							turn && turn.rolls.length > 0
								? turn.rolls[turn.rolls.length - 1]
								: null;

						return (
							<div
								key={participantId}
								className={`flex flex-col gap-2 rounded-md border px-3 py-2 ${
									isLoser
										? "border-destructive/30 bg-destructive/5"
										: turn?.isSafe
											? "border-green-500/30 bg-green-500/5"
											: "border-border"
								}`}
							>
								<div className="flex items-center justify-between">
									<span
										className={`text-sm font-medium ${isLoser ? "text-destructive" : ""}`}
									>
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
											{turn?.finalScore ?? "—"}
										</span>
									)}
								</div>
								{lastRoll && (
									<div className="flex justify-end">
										<DiceDisplay
											dice={lastRoll.dice.map((d) => ({ ...d, kept: false }))}
											size="sm"
										/>
									</div>
								)}
							</div>
						);
					})}
				</div>

				{/* Round result */}
				{round.allSafe ? (
					<>
						<Separator />
						<div className="flex items-center justify-between rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2 text-sm">
							<span className="flex items-center gap-2">
								<ShieldCheck className="size-4 text-green-500" />
								<span>All safe — penalty carried over</span>
							</span>
							<Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
								{round.currentPenaltySips}{" "}
								{round.currentPenaltySips === 1 ? "sip" : "sips"}
							</Badge>
						</div>
					</>
				) : round.losingParticipantId && round.finalPenaltySips ? (
					<>
						<Separator />
						<div className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm">
							<span className="flex items-center gap-2">
								<Beer className="size-4 text-destructive" />
								<span>
									<span className="font-medium">
										{loserName}
									</span>{" "}
									lost this round
								</span>
							</span>
							<Badge variant="destructive" className="text-xs">
								{round.finalPenaltySips}{" "}
								{round.finalPenaltySips === 1 ? "sip" : "sips"}
							</Badge>
						</div>
					</>
				) : null}

				{/* Carry-over note */}
				{(round.carryOverSips ?? 0) > 0 && !round.allSafe && (
					<div className="text-center text-[11px] text-muted-foreground">
						Includes {round.carryOverSips} carry-over {round.carryOverSips === 1 ? "sip" : "sips"}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
