import { Users } from "lucide-react";
import Link from "next/link";
import { GamesDebugPanel } from "@/components/games-list/games-debug-panel";
import { GamesListSections } from "@/components/games-list/games-list-sections";
import {
  type GlobalStats,
  GlobalStatsCard,
} from "@/components/games-list/global-stats-card";
import { HomeButton } from "@/components/home-button";
import { Button } from "@/components/ui/button";
import { getAllGames } from "@/lib/cached-queries";
import {
  accumulateStats,
  computeParticipantStats,
  emptyAggregatedStats,
  getAggregationKey,
  getParticipantName,
  getUsernameById,
} from "@/lib/game-helpers";
import type { AggregatedPlayerStats } from "@/lib/models";
import { compareGamesByLastActivity } from "@/lib/pagination";

export default async function GamesPage() {
  const games = await getAllGames();

  const gameData = games.map((session) => ({
    session,
    stats: computeParticipantStats(session),
  }));

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

  const playerStatsMap = new Map<string, AggregatedPlayerStats>();

  for (const { session, stats } of gameData) {
    const sortedForWinner = [...stats].sort((a, b) => {
      if (b.roundsWon !== a.roundsWon) return b.roundsWon - a.roundsWon;
      return a.sipsDrunk - b.sipsDrunk;
    });
    const winnerId =
      session.status === "completed" ? sortedForWinner[0]?.participantId : null;

    for (const s of stats) {
      globalStats.totalSipsDrunk += s.sipsDrunk;
      globalStats.totalThreeOfAKind += s.threeOfAKindCount;
      globalStats.totalStairs += s.stairsCount;
      globalStats.totalSuperStairs += s.superStairsCount;
      globalStats.totalShitStairs += s.shitStairsCount;
      globalStats.totalLowestScores += s.lowestScoreCount;

      const participant = session.participants.find(
        (p) => p.id === s.participantId,
      );
      if (!participant) continue;

      const key = getAggregationKey(participant);
      const name = getParticipantName(participant);
      const username = getUsernameById(s.participantId, session.participants);
      const existing =
        playerStatsMap.get(key) ?? emptyAggregatedStats(name, username);
      accumulateStats(existing, s, winnerId === s.participantId);
      playerStatsMap.set(key, existing);
    }
  }

  const playerStats = Array.from(playerStatsMap.values());

  const inProgressData = gameData
    .filter((g) => g.session.status !== "completed")
    .sort(compareGamesByLastActivity);
  const completedData = gameData
    .filter((g) => g.session.status === "completed")
    .sort(compareGamesByLastActivity);

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6 md:py-12">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            All Games
          </h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <Link href="/players">
                <Users className="size-4" />
                Players
              </Link>
            </Button>
            <HomeButton />
          </div>
        </div>

        {games.length > 0 && (
          <GlobalStatsCard stats={globalStats} playerStats={playerStats} />
        )}

        {games.length === 0 && (
          <p className="text-muted-foreground">No games yet.</p>
        )}

        {(inProgressData.length > 0 || completedData.length > 0) && (
          <GamesListSections
            inProgressData={inProgressData}
            completedData={completedData}
          />
        )}
      </div>

      <GamesDebugPanel
        inProgressGames={inProgressData.map(({ session }) => ({
          id: session.id,
          name: session.config.name,
        }))}
      />
    </div>
  );
}
