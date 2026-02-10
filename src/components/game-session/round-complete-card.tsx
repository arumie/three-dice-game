"use client";

import { useState, useEffect } from "react";
import { Dices, Beer, Play, Loader2, ShieldAlert, ShieldCheck, TrendingDown, Crown } from "lucide-react";
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
import { TiebreakerDialog } from "./tiebreaker-dialog";
import type { RoundModel } from "@/lib/models";
import type { SelectGameParticipant } from "@/db/schema";
import { formatSpecialRoll, getNameById, formatNamesList } from "@/lib/game-helpers";
import { computeLowestRollCounts } from "@/lib/game-utils";

// ─── Presentational Sub-components ───────────────────────────────────────────

function LowestRollsBanner({
	lowestRolls,
	participants,
}: {
	lowestRolls: { participantId: number; count: number }[];
	participants: SelectGameParticipant[];
}) {
	if (lowestRolls.length === 0) return null;

	return (
		<div className="flex w-full flex-col gap-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
			{lowestRolls.map((lr) => (
				<div key={lr.participantId} className="flex items-center gap-2">
					<TrendingDown className="size-4 text-amber-600 dark:text-amber-400" />
					<span className="text-muted-foreground">
						<span className="font-semibold">{getNameById(lr.participantId, participants)}</span>
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

function TurnScoreRow({
	turn,
	participants,
	isLoser,
	variant,
}: {
	turn: RoundModel["turns"][number];
	participants: SelectGameParticipant[];
	isLoser?: boolean;
	variant: "safe" | "final";
}) {
	const name = getNameById(turn.participantId, participants);
	const special = formatSpecialRoll(turn.specialRollType);

	if (variant === "safe") {
		return (
			<div className="flex items-center justify-between rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2">
				<span className="text-sm font-medium">{name}</span>
				{special ? (
					<Badge variant="outline" className="text-[10px] px-1.5 py-0">
						{special}
					</Badge>
				) : (
					<span className="text-sm font-semibold tabular-nums">
						{turn.finalScore ?? "—"}
					</span>
				)}
			</div>
		);
	}

	return (
		<div
			className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
				isLoser ? "border-destructive/30 bg-destructive/5" : ""
			}`}
		>
			<span className={`text-base font-semibold ${isLoser ? "text-destructive" : ""}`}>
				{name}
			</span>
			{special ? (
				<Badge variant="outline" className="text-xs px-2.5 py-0.5">
					{special}
				</Badge>
			) : (
				<span className="text-base font-bold tabular-nums">
					{turn.finalScore ?? "—"}
				</span>
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
					{round.currentPenaltySips} {round.currentPenaltySips === 1 ? "sip" : "sips"} carry over
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
					<p className="text-sm text-muted-foreground">
						It&apos;s a tie!
					</p>
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
			<Badge
				variant="destructive"
				className="text-sm px-3 py-1"
			>
				{round.finalPenaltySips} {round.finalPenaltySips === 1 ? "sip" : "sips"}{isTiedLoss ? " each" : ""}
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
	participants: SelectGameParticipant[];
	loserIds?: number[];
	variant: "safe" | "final";
}) {
	return (
		<div className={`flex w-full flex-col ${variant === "safe" ? "gap-2" : "gap-2.5"}`}>
			<h4 className={`uppercase tracking-wider text-muted-foreground ${
				variant === "safe"
					? "text-xs font-medium"
					: "text-sm font-semibold"
			}`}>
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
				<Button
					className="w-full h-12 sm:h-10"
					onClick={onTiebreakerClick}
				>
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

// ─── Round Complete Card ─────────────────────────────────────────────────────

interface RoundCompleteCardProps {
	round: RoundModel;
	participants: SelectGameParticipant[];
	isPending: boolean;
	onStartRound: (startingParticipantId?: number) => void;
}

export function RoundCompleteCard({
	round,
	participants,
	isPending,
	onStartRound,
}: RoundCompleteCardProps) {
	const loserIds = round.losingParticipantIds;
	const isTiedLoss = loserIds.length > 1;
	const loserNames = loserIds.map((id) => getNameById(id, participants));
	const loserNamesFormatted = formatNamesList(loserNames);

	// Tiebreaker state for tied losses — reset when the round changes
	const [tiebreakerOpen, setTiebreakerOpen] = useState(false);
	const [tiebreakerWinnerId, setTiebreakerWinnerId] = useState<number | null>(null);
	useEffect(() => {
		setTiebreakerWinnerId(null);
		setTiebreakerOpen(false);
	}, [round.id]);

	// For the "starts next round" label
	const starterName = isTiedLoss && tiebreakerWinnerId
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
						<LowestRollsBanner lowestRolls={lowestRolls} participants={participants} />
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

				<RoundCompleteFooter
					round={round}
					isPending={isPending}
					needsTiebreaker={needsTiebreaker}
					starterName={starterName}
					onTiebreakerClick={() => setTiebreakerOpen(true)}
					onStartRound={() => onStartRound(isTiedLoss ? tiebreakerWinnerId ?? undefined : undefined)}
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
