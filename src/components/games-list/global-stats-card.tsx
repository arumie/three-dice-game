"use client";

import {
	Dices,
	Beer,
	Trophy,
	Hash,
	Toilet,
	Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface GlobalStats {
	totalGames: number;
	inProgressGames: number;
	completedGames: number;
	totalRounds: number;
	totalSipsDrunk: number;
	totalThreeOfAKind: number;
	totalStairs: number;
	totalSuperStairs: number;
	totalShitStairs: number;
}

interface GlobalStatsCardProps {
	stats: GlobalStats;
}

export type { GlobalStats };

export function GlobalStatsCard({ stats }: GlobalStatsCardProps) {
	const totalSpecials =
		stats.totalThreeOfAKind + stats.totalStairs + stats.totalSuperStairs;

	return (
		<Card className="w-full">
			<CardContent className="px-4 py-4 sm:px-6 sm:py-5">
				<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground sm:text-base">
					<Trophy className="size-4 sm:size-5" />
					All-Time Stats
				</div>
				<div className="grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4">
					{/* Total Games */}
					<div className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 sm:px-3">
						<Hash className="size-4 text-primary sm:size-5" />
						<span className="text-lg font-bold tabular-nums sm:text-2xl">
							{stats.totalGames}
						</span>
						<span className="text-[10px] text-muted-foreground sm:text-xs">
							Games
						</span>
						{stats.totalGames > 0 && (
							<span className="text-[10px] text-muted-foreground/70">
								{stats.inProgressGames > 0 && (
									<span className="text-primary">{stats.inProgressGames} live</span>
								)}
								{stats.inProgressGames > 0 && stats.completedGames > 0 && " · "}
								{stats.completedGames > 0 && (
									<span>{stats.completedGames} done</span>
								)}
							</span>
						)}
					</div>

					{/* Total Rounds */}
					<div className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 sm:px-3">
						<Dices className="size-4 text-primary sm:size-5" />
						<span className="text-lg font-bold tabular-nums sm:text-2xl">
							{stats.totalRounds}
						</span>
						<span className="text-[10px] text-muted-foreground sm:text-xs">
							Rounds
						</span>
					</div>

					{/* Total Sips */}
					<div className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 sm:px-3">
						<Beer className="size-4 text-red-500 sm:size-5" />
						<span className="text-lg font-bold tabular-nums text-red-500 sm:text-2xl">
							{stats.totalSipsDrunk}
						</span>
						<span className="text-[10px] text-muted-foreground sm:text-xs">
							Sips Drunk
						</span>
					</div>

					{/* Special Rolls */}
					<div className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 sm:px-3">
						<Sparkles className="size-4 text-amber-600 dark:text-amber-400 sm:size-5" />
						<span className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400 sm:text-2xl">
							{totalSpecials}
						</span>
						<span className="text-[10px] text-muted-foreground sm:text-xs">
							Special Rolls
						</span>
						{totalSpecials > 0 && (
							<span className="text-[10px] text-muted-foreground/70">
								{stats.totalThreeOfAKind > 0 && `${stats.totalThreeOfAKind} 3oK`}
								{stats.totalThreeOfAKind > 0 && stats.totalStairs > 0 && " · "}
								{stats.totalStairs > 0 && `${stats.totalStairs} St`}
								{(stats.totalThreeOfAKind > 0 || stats.totalStairs > 0) && stats.totalSuperStairs > 0 && " · "}
								{stats.totalSuperStairs > 0 && `${stats.totalSuperStairs} SS`}
							</span>
						)}
					</div>

					{/* Shit Stairs */}
					<div className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 sm:px-3">
						<Toilet className="size-4 text-amber-800 dark:text-amber-600 sm:size-5" />
						<span className="text-lg font-bold tabular-nums text-amber-800 dark:text-amber-600 sm:text-2xl">
							{stats.totalShitStairs}
						</span>
						<span className="text-[10px] text-muted-foreground sm:text-xs">
							Shit Stairs
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
