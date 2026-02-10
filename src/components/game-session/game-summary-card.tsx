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
	TrendingDown,
	Home,
	Award,
	Frown,
	type LucideIcon,
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
	const loser = sortedStats[sortedStats.length - 1];
	const winnerName = getNameById(winner.participantId, session.participants);
	const biggestDrinker = [...stats].sort(
		(a, b) => b.sipsDrunk - a.sipsDrunk,
	)[0];

	const duration =
		session.createdAt && session.completedAt
			? formatDuration(session.createdAt, session.completedAt)
			: null;

	// Build awards from stats
	type AwardDef = {
		label: string;
		quip: string;
		icon: LucideIcon;
		color: string;
		participantId: number;
		value: number;
	};

	const awardDefs: AwardDef[] = [
		...(() => {
			const top = [...stats].sort((a, b) => b.roundsWon - a.roundsWon)[0];
			return top.roundsWon > 0
				? [{ label: "Most Wins", quip: "Born winner", icon: Trophy, color: "text-primary", participantId: top.participantId, value: top.roundsWon }]
				: [];
		})(),
		...(() => {
			const top = [...stats].sort((a, b) => b.roundsLost - a.roundsLost)[0];
			return top.roundsLost > 0
				? [{ label: "Most Losses", quip: "Better luck next time", icon: Skull, color: "text-red-500", participantId: top.participantId, value: top.roundsLost }]
				: [];
		})(),
		...(() => {
			const top = [...stats].sort((a, b) => b.sipsDrunk - a.sipsDrunk)[0];
			return top.sipsDrunk > 0
				? [{ label: "Biggest Drinker", quip: "Cheers to that", icon: Beer, color: "text-red-500", participantId: top.participantId, value: top.sipsDrunk }]
				: [];
		})(),
		...(() => {
			const top = [...stats].sort((a, b) => b.sipsAwarded - a.sipsAwarded)[0];
			return top.sipsAwarded > 0
				? [{ label: "Top Bartender", quip: "Drinks on you", icon: Footprints, color: "text-green-600 dark:text-green-400", participantId: top.participantId, value: top.sipsAwarded }]
				: [];
		})(),
		...(() => {
			const top = [...stats].sort((a, b) => b.sipsReceived - a.sipsReceived)[0];
			return top.sipsReceived > 0
				? [{ label: "Most Targeted", quip: "What did you do to them?", icon: CircleArrowDown, color: "text-orange-500", participantId: top.participantId, value: top.sipsReceived }]
				: [];
		})(),
		...(() => {
			const top = [...stats].sort((a, b) => b.threeOfAKindCount - a.threeOfAKindCount)[0];
			return top.threeOfAKindCount > 0
				? [{ label: "Triple Threat", quip: "Three of a kind magnet", icon: Dices, color: "text-amber-600 dark:text-amber-400", participantId: top.participantId, value: top.threeOfAKindCount }]
				: [];
		})(),
		...(() => {
			const top = [...stats].sort((a, b) => b.stairsCount - a.stairsCount)[0];
			return top.stairsCount > 0
				? [{ label: "Stairway Master", quip: "One step at a time", icon: Footprints, color: "text-blue-500", participantId: top.participantId, value: top.stairsCount }]
				: [];
		})(),
		...(() => {
			const top = [...stats].sort((a, b) => b.shitStairsCount - a.shitStairsCount)[0];
			return top.shitStairsCount > 0
				? [{ label: "Shit Stairs King", quip: "Face, meet palm", icon: Toilet, color: "text-amber-800 dark:text-amber-600", participantId: top.participantId, value: top.shitStairsCount }]
				: [];
		})(),
		...(() => {
			const top = [...stats].sort((a, b) => b.lowestScoreCount - a.lowestScoreCount)[0];
			return top.lowestScoreCount > 0
				? [{ label: "Bottom Roller", quip: "Couldn't roll worse if you tried", icon: TrendingDown, color: "text-amber-600 dark:text-amber-400", participantId: top.participantId, value: top.lowestScoreCount }]
				: [];
		})(),
		...(() => {
			const top = [...stats].sort((a, b) => b.tiebreakerWins - a.tiebreakerWins)[0];
			return top.tiebreakerWins > 0
				? [{ label: "Tiebreaker Champ", quip: "Luck favours the bold", icon: Crown, color: "text-green-500", participantId: top.participantId, value: top.tiebreakerWins }]
				: [];
		})(),
	];

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
					const isLoser =
						s.participantId === loser.participantId &&
						s.participantId !== winner.participantId &&
						sortedStats.length > 1;
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
								className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors sm:gap-4 sm:rounded-xl sm:px-4 sm:py-3 ${
									isWinner
										? "border-yellow-500/30 bg-yellow-500/5"
										: isLoser
											? "border-purple-500/30 bg-purple-500/5"
											: isMostDrunk
												? "border-red-500/20 bg-red-500/5"
												: "border-border"
								}`}
							>
								{/* Rank */}
								<div
									className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:size-9 sm:text-base ${
										isWinner
											? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
											: isLoser
												? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
												: "bg-muted text-muted-foreground"
									}`}
								>
									{isWinner ? (
										<Crown className="size-3.5 sm:size-5" />
									) : isLoser ? (
										<Frown className="size-3.5 sm:size-5" />
									) : (
										idx + 1
									)}
								</div>

								{/* Name */}
								<span className="flex-1 truncate text-sm font-medium sm:text-base sm:font-semibold">
									{name}
								</span>

								{/* Stats */}
								<div className="flex items-center gap-3 text-xs tabular-nums sm:gap-4 sm:text-base">
									<span
										className="flex items-center gap-1 font-medium text-primary sm:gap-1.5 sm:font-bold"
										title="Rounds won"
									>
										<Trophy className="size-3 sm:size-5" />
										{s.roundsWon}
									</span>
									<span
										className={`flex items-center gap-1 font-medium sm:gap-1.5 sm:font-bold ${
											isMostDrunk
												? "text-red-500"
												: "text-muted-foreground"
										}`}
										title="Sips drunk"
									>
										{isMostDrunk ? (
											<Skull className="size-3 sm:size-5" />
										) : (
											<Beer className="size-3 sm:size-5" />
										)}
										{s.sipsDrunk}
									</span>
									{s.sipsAwarded > 0 && (
										<span
											className="flex items-center gap-1 font-medium text-green-600 dark:text-green-400 sm:gap-1.5 sm:font-bold"
											title="Sips awarded"
										>
											<Footprints className="size-3 sm:size-5" />
											{s.sipsAwarded}
										</span>
									)}
									{s.sipsReceived > 0 && (
										<span
											className="flex items-center gap-1 font-medium text-orange-500 sm:gap-1.5 sm:font-bold"
											title="Sips received from stairs"
										>
											<CircleArrowDown className="size-3 sm:size-5" />
											{s.sipsReceived}
										</span>
									)}
									{specialTotal > 0 && (
										<span
											className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400 sm:gap-1.5 sm:font-bold"
											title={`${s.threeOfAKindCount} three of a kind, ${s.stairsCount} stairs, ${s.superStairsCount} super stairs`}
										>
											<Dices className="size-3 sm:size-5" />
											{specialTotal}
										</span>
									)}
									{s.shitStairsCount > 0 && (
										<span
											className="flex items-center gap-1 font-medium text-amber-800 dark:text-amber-600 sm:gap-1.5 sm:font-bold"
											title="Shit stairs"
										>
											<Toilet className="size-3 sm:size-5" />
											{s.shitStairsCount}
										</span>
									)}
									{s.lowestScoreCount > 0 && (
										<span
											className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400 sm:gap-1.5 sm:font-bold"
											title="Lowest score rolls"
										>
											<TrendingDown className="size-3 sm:size-5" />
											{s.lowestScoreCount}
										</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>

			{/* Game Awards */}
			{awardDefs.length > 0 && (
				<>
					<Separator />
					<CardContent className="px-4 py-5 sm:px-6">
						<h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
							<Award className="size-3.5" />
							Game Awards
						</h3>
						<div className="grid grid-cols-2 gap-2 sm:gap-3">
							{awardDefs.map((award) => {
								const Icon = award.icon;
								const name = getNameById(
									award.participantId,
									session.participants,
								);
								return (
									<div
										key={award.label}
										className="flex flex-col gap-1 rounded-lg border px-3 py-2.5 sm:rounded-xl sm:px-4 sm:py-3"
									>
										<div className="flex items-center gap-1.5">
											<Icon className={`size-3.5 sm:size-4 ${award.color}`} />
											<span className="text-xs font-semibold sm:text-sm">
												{award.label}
											</span>
										</div>
										<span className="text-sm font-bold sm:text-base">
											{name}{" "}
											<span className="text-xs font-normal text-muted-foreground sm:text-sm">
												({award.value})
											</span>
										</span>
										<span className="text-[10px] italic text-muted-foreground sm:text-xs">
											{award.quip}
										</span>
									</div>
								);
							})}
						</div>
					</CardContent>
				</>
			)}

			<Separator />

			<CardFooter className="flex-col gap-2 px-4 py-4">
				<Button asChild variant="outline" className="w-full">
					<Link href="/games">
						<Home className="size-4" />
						All Games
					</Link>
				</Button>
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
