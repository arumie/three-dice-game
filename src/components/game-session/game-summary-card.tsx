"use client";

import Link from "next/link";
import {
	Crown,
	Trophy,
	Beer,
	Skull,
	Dices,
	Clock,
	Users,
	Footprints,
	Plus,
	CircleArrowDown,
	Toilet,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { GameModel, ParticipantStats } from "@/lib/models";
import { getNameById } from "@/lib/game-helpers";

interface GameSummaryCardProps {
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
	if (minutes > 0) {
		return `${minutes}m`;
	}
	return "< 1m";
}

export function GameSummaryCard({ session, stats }: GameSummaryCardProps) {
	const completedRounds = session.rounds.filter(
		(r) => r.status === "completed",
	).length;

	// Sort: most rounds won first, then fewest sips drunk
	const sortedStats = [...stats].sort((a, b) => {
		if (b.roundsWon !== a.roundsWon) return b.roundsWon - a.roundsWon;
		return a.sipsDrunk - b.sipsDrunk;
	});

	const winner = sortedStats[0];
	const winnerName = getNameById(winner.participantId, session.participants);
	const biggestDrinker = [...stats].sort(
		(a, b) => b.sipsDrunk - a.sipsDrunk,
	)[0];

	const duration =
		session.createdAt && session.completedAt
			? formatDuration(session.createdAt, session.completedAt)
			: null;

	return (
		<Card className="mx-auto w-full max-w-2xl overflow-hidden">
			{/* Winner banner */}
			<CardHeader className="relative px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
				<div className="flex flex-col items-center gap-3 text-center">
					<div className="flex size-14 items-center justify-center rounded-full bg-yellow-500/15 sm:size-16">
						<Crown className="size-7 text-yellow-500 sm:size-8" />
					</div>
					<div>
						<p className="text-sm text-muted-foreground">
							Game Over
						</p>
						<h1 className="text-2xl font-bold sm:text-3xl">
							{winnerName} wins!
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							{session.config.name}
						</p>
					</div>

					{/* Game meta */}
					<div className="flex items-center gap-4 text-xs text-muted-foreground">
						<span className="flex items-center gap-1">
							<Users className="size-3" />
							{session.participants.length} players
						</span>
						<span className="flex items-center gap-1">
							<Dices className="size-3" />
							{completedRounds} rounds
						</span>
						{duration && (
							<span className="flex items-center gap-1">
								<Clock className="size-3" />
								{duration}
							</span>
						)}
					</div>
				</div>
			</CardHeader>

			<Separator />

			{/* Leaderboard */}
			<CardContent className="px-4 py-5 sm:px-6">
				<h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					Final Standings
				</h3>
				<div className="flex flex-col gap-2">
					{sortedStats.map((s, idx) => {
						const name = getNameById(
							s.participantId,
							session.participants,
						);
						const isWinner =
							s.participantId === winner.participantId &&
							s.roundsWon > 0;
						const isMostDrunk =
							s.participantId ===
								biggestDrinker.participantId &&
							s.sipsDrunk > 0;

						const specialTotal =
							s.threeOfAKindCount +
							s.stairsCount +
							s.superStairsCount;

						return (
							<div
								key={s.participantId}
								className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
									isWinner
										? "border-yellow-500/30 bg-yellow-500/5"
										: isMostDrunk
											? "border-red-500/20 bg-red-500/5"
											: "border-border"
								}`}
							>
								{/* Rank */}
								<div
									className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
										idx === 0
											? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
											: idx === 1
												? "bg-muted text-muted-foreground"
												: "bg-muted text-muted-foreground"
									}`}
								>
									{isWinner ? (
										<Crown className="size-3.5" />
									) : (
										idx + 1
									)}
								</div>

								{/* Name */}
								<span className="flex-1 truncate text-sm font-medium">
									{name}
								</span>

								{/* Stats */}
								<div className="flex items-center gap-3 text-xs tabular-nums">
									<span
										className="flex items-center gap-1 font-medium text-primary"
										title="Rounds won"
									>
										<Trophy className="size-3" />
										{s.roundsWon}
									</span>
									<span
										className={`flex items-center gap-1 font-medium ${
											isMostDrunk
												? "text-red-500"
												: "text-muted-foreground"
										}`}
										title="Sips drunk"
									>
										{isMostDrunk ? (
											<Skull className="size-3" />
										) : (
											<Beer className="size-3" />
										)}
										{s.sipsDrunk}
									</span>
									{s.sipsAwarded > 0 && (
										<span
											className="flex items-center gap-1 font-medium text-green-600 dark:text-green-400"
											title="Sips awarded"
										>
											<Footprints className="size-3" />
											{s.sipsAwarded}
										</span>
									)}
									{s.sipsReceived > 0 && (
										<span
											className="flex items-center gap-1 font-medium text-orange-500"
											title="Sips received from stairs"
										>
											<CircleArrowDown className="size-3" />
											{s.sipsReceived}
										</span>
									)}
									{specialTotal > 0 && (
										<span
											className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400"
											title={`${s.threeOfAKindCount} three of a kind, ${s.stairsCount} stairs, ${s.superStairsCount} super stairs`}
										>
											<Dices className="size-3" />
											{specialTotal}
										</span>
									)}
									{s.shitStairsCount > 0 && (
										<span
											className="flex items-center gap-1 font-medium text-amber-800 dark:text-amber-600"
											title="Shit stairs"
										>
											<Toilet className="size-3" />
											{s.shitStairsCount}
										</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>

			<Separator />

			<CardFooter className="px-4 py-4 sm:px-6">
				<Button asChild className="w-full">
					<Link href="/">
						<Plus className="size-4" />
						New Game
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
