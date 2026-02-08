"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	Beer,
	Trophy,
	Users,
	Dices,
	MoreVertical,
	LogOut,
	Crown,
	Skull,
	Toilet,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { GameModel, ParticipantStats } from "@/lib/models";
import {
	formatStatus,
	getNameById,
	getStatusVariant,
} from "@/lib/game-helpers";
import { endGameAction } from "@/app/actions";

interface GameStateCardProps {
	session: GameModel;
	stats: ParticipantStats[];
	gameSessionId: number;
}

export function GameStateCard({ session, stats, gameSessionId }: GameStateCardProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [endGameOpen, setEndGameOpen] = useState(false);

	const completedRounds = session.rounds.filter(
		(r) => r.status === "completed",
	).length;
	const totalRounds = session.rounds.length;

	// Sort stats for the leaderboard: fewest sips drunk = winning
	const sortedStats = [...stats].sort((a, b) => {
		// Most rounds won first, then fewest sips
		if (b.roundsWon !== a.roundsWon) return b.roundsWon - a.roundsWon;
		return a.sipsDrunk - b.sipsDrunk;
	});

	// Find the leader and the biggest drinker
	const leader = sortedStats[0];
	const biggestDrinker = [...stats].sort((a, b) => b.sipsDrunk - a.sipsDrunk)[0];

	function handleEndGame() {
		setEndGameOpen(false);
		startTransition(async () => {
			await endGameAction({ gameSessionId });
			router.push(`/game-session/${gameSessionId}/summary`);
		});
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
										{session.participants.length}
									</span>
									<span className="text-muted-foreground/30">·</span>
									<span>Round {totalRounds}</span>
									{completedRounds < totalRounds && (
										<Badge variant="default" className="ml-1 px-1.5 py-0 text-[10px]">
											Live
										</Badge>
									)}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Badge variant={getStatusVariant(session.status)} className="hidden sm:inline-flex">
								{formatStatus(session.status)}
							</Badge>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="size-8">
										<MoreVertical className="size-4" />
										<span className="sr-only">Game menu</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
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
					<div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
						{sortedStats.map((s, idx) => {
							const name = getNameById(
								s.participantId,
								session.participants,
							);
							const isLeader = s.participantId === leader?.participantId && s.roundsWon > 0;
							const isMostDrunk = s.participantId === biggestDrinker?.participantId && s.sipsDrunk > 0;

							return (
								<div
									key={s.participantId}
									className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors ${
										isLeader
											? "border-yellow-500/30 bg-yellow-500/5"
											: isMostDrunk
												? "border-red-500/20 bg-red-500/5"
												: "border-border"
									}`}
								>
									{/* Rank indicator */}
									<div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-base font-bold ${
										idx === 0
											? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
											: "bg-muted text-muted-foreground"
									}`}>
										{isLeader ? (
											<Crown className="size-5" />
										) : (
											idx + 1
										)}
									</div>

									{/* Name */}
									<span className="flex-1 truncate text-base font-semibold">
										{name}
									</span>

									{/* Stats */}
									<div className="flex items-center gap-4 text-base tabular-nums">
										<span
											className="flex items-center gap-1.5 font-bold text-primary"
											title="Rounds won"
										>
											<Trophy className="size-5" />
											{s.roundsWon}
										</span>
										<span
											className={`flex items-center gap-1.5 font-bold ${
												isMostDrunk
													? "text-red-500"
													: "text-muted-foreground"
											}`}
											title="Sips drunk"
										>
											{isMostDrunk ? (
												<Skull className="size-5" />
											) : (
												<Beer className="size-5" />
											)}
											{s.sipsDrunk}
										</span>
										{(s.threeOfAKindCount + s.stairsCount + s.superStairsCount) > 0 && (
											<span
												className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400"
												title={`${s.threeOfAKindCount} three of a kind, ${s.stairsCount} stairs, ${s.superStairsCount} super stairs`}
											>
												<Dices className="size-5" />
												{s.threeOfAKindCount + s.stairsCount + s.superStairsCount}
											</span>
										)}
										{s.shitStairsCount > 0 && (
											<span
												className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-600"
												title="Shit stairs"
											>
												<Toilet className="size-5" />
												{s.shitStairsCount}
											</span>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>

			{/* End game confirmation */}
			<AlertDialog open={endGameOpen} onOpenChange={setEndGameOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>End Game Session?</AlertDialogTitle>
						<AlertDialogDescription>
							This will end the current game session for all players.
							The current round will be abandoned. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleEndGame}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							End Game
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
