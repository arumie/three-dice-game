import { getAllGames } from "@/lib/cached-queries";
import { computeParticipantStats, getNameById } from "@/lib/game-helpers";
import { GlobalStatsCard, type GlobalStats } from "@/components/games-list/global-stats-card";
import { GameListCard } from "@/components/games-list/game-list-card";
import { HomeButton } from "@/components/home-button";
import type { AggregatedPlayerStats, GameModel } from "@/lib/models";

export default async function GamesPage() {
	const games = await getAllGames();

	const gameData = games.map((session) => ({
		session,
		stats: computeParticipantStats(session),
	}));

	// Aggregate global stats
	const globalStats: GlobalStats = {
		totalGames: games.length,
		inProgressGames: games.filter((g) => g.status === "in_progress").length,
		completedGames: games.filter((g) => g.status === "completed").length,
		totalRounds: games.reduce(
			(sum, g) => sum + g.rounds.filter((r) => r.status === "completed").length,
			0,
		),
		totalSipsDrunk: 0,
		totalThreeOfAKind: 0,
		totalStairs: 0,
		totalSuperStairs: 0,
		totalShitStairs: 0,
		totalLowestScores: 0,
	};

	// Aggregate per-player stats across all games (keyed by guest name)
	const playerStatsMap = new Map<string, AggregatedPlayerStats>();

	for (const { session, stats } of gameData) {
		// Determine winner of this completed game
		const sortedForWinner = [...stats].sort((a, b) => {
			if (b.roundsWon !== a.roundsWon) return b.roundsWon - a.roundsWon;
			return a.sipsDrunk - b.sipsDrunk;
		});
		const winnerId =
			session.status === "completed"
				? sortedForWinner[0]?.participantId
				: null;

		for (const s of stats) {
			globalStats.totalSipsDrunk += s.sipsDrunk;
			globalStats.totalThreeOfAKind += s.threeOfAKindCount;
			globalStats.totalStairs += s.stairsCount;
			globalStats.totalSuperStairs += s.superStairsCount;
			globalStats.totalShitStairs += s.shitStairsCount;
			globalStats.totalLowestScores += s.lowestScoreCount;

			const name = getNameById(s.participantId, session.participants);
			const existing = playerStatsMap.get(name) ?? {
				name,
				gamesPlayed: 0,
				gamesWon: 0,
				roundsWon: 0,
				roundsLost: 0,
				sipsDrunk: 0,
				sipsAwarded: 0,
				sipsReceived: 0,
				threeOfAKindCount: 0,
				stairsCount: 0,
				superStairsCount: 0,
				shitStairsCount: 0,
				lowestScoreCount: 0,
				lowestScoreSipsDrunk: 0,
			};
			existing.gamesPlayed += 1;
			if (winnerId != null && s.participantId === winnerId) {
				existing.gamesWon += 1;
			}
			existing.roundsWon += s.roundsWon;
			existing.roundsLost += s.roundsLost;
			existing.sipsDrunk += s.sipsDrunk;
			existing.sipsAwarded += s.sipsAwarded;
			existing.sipsReceived += s.sipsReceived;
			existing.threeOfAKindCount += s.threeOfAKindCount;
			existing.stairsCount += s.stairsCount;
			existing.superStairsCount += s.superStairsCount;
			existing.shitStairsCount += s.shitStairsCount;
			existing.lowestScoreCount += s.lowestScoreCount;
			existing.lowestScoreSipsDrunk += s.lowestScoreSipsDrunk;
			playerStatsMap.set(name, existing);
		}
	}

	const playerStats = Array.from(playerStatsMap.values());

	// Split into in-progress and completed, each sorted most recent first
	const byRecent = (
		a: { session: GameModel },
		b: { session: GameModel },
	) => {
		const aTime = a.session.createdAt?.getTime() ?? 0;
		const bTime = b.session.createdAt?.getTime() ?? 0;
		return bTime - aTime;
	};

	const inProgressData = gameData
		.filter((g) => g.session.status !== "completed")
		.sort(byRecent);
	const completedData = gameData
		.filter((g) => g.session.status === "completed")
		.sort(byRecent);

	return (
		<div className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6 md:py-12">
			<div className="flex w-full max-w-3xl flex-col gap-6">
				<div className="flex items-center justify-between">
					<h1 className="text-xl font-bold tracking-tight sm:text-2xl">
						All Games
					</h1>
					<HomeButton />
				</div>

				{games.length > 0 && (
					<GlobalStatsCard stats={globalStats} playerStats={playerStats} />
				)}

				{games.length === 0 && (
					<p className="text-muted-foreground">No games yet.</p>
				)}

				{inProgressData.length > 0 && (
					<div className="flex flex-col gap-3">
						<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground sm:text-base">
							In Progress ({inProgressData.length})
						</h2>
						{inProgressData.map(({ session, stats }) => (
							<GameListCard
								key={session.id}
								session={session}
								stats={stats}
							/>
						))}
					</div>
				)}

				{inProgressData.length > 0 && completedData.length > 0 && (
					<hr className="border-border" />
				)}

				{completedData.length > 0 && (
					<div className="flex flex-col gap-3">
						<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground sm:text-base">
							Completed ({completedData.length})
						</h2>
						{completedData.map(({ session, stats }) => (
							<GameListCard
								key={session.id}
								session={session}
								stats={stats}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
