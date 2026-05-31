import { HomeButton } from "@/components/home-button";
import { PlayerSummaryCard } from "@/components/players-list/player-summary-card";
import { getAllGames, getAllPlayers } from "@/lib/cached-queries";
import {
  accumulateStats,
  computeParticipantStats,
  emptyAggregatedStats,
} from "@/lib/game-helpers";
import type { AggregatedPlayerStats } from "@/lib/models";

export default async function PlayersPage() {
  const [players, games] = await Promise.all([getAllPlayers(), getAllGames()]);

  const statsByPlayerId = new Map<number, AggregatedPlayerStats>();

  for (const game of games) {
    const stats = computeParticipantStats(game);

    const sortedForWinner = [...stats].sort((a, b) => {
      if (b.roundsWon !== a.roundsWon) return b.roundsWon - a.roundsWon;
      return a.sipsDrunk - b.sipsDrunk;
    });
    const winnerId =
      game.status === "completed" ? sortedForWinner[0]?.participantId : null;

    for (const s of stats) {
      const participant = game.participants.find(
        (p) => p.id === s.participantId,
      );
      if (participant?.playerType !== "registered") {
        continue;
      }
      const { playerId } = participant;
      if (playerId == null) {
        continue;
      }

      const existing =
        statsByPlayerId.get(playerId) ??
        emptyAggregatedStats(
          participant.playerUsername ?? "",
          participant.playerUsername ?? null,
        );
      accumulateStats(existing, s, winnerId === s.participantId);
      statsByPlayerId.set(playerId, existing);
    }
  }

  const playerRows = players
    .map((player) => ({
      player,
      stats:
        statsByPlayerId.get(player.id) ??
        emptyAggregatedStats(player.username, player.username),
    }))
    .sort((a, b) => {
      if (b.stats.gamesWon !== a.stats.gamesWon)
        return b.stats.gamesWon - a.stats.gamesWon;
      if (b.stats.roundsWon !== a.stats.roundsWon)
        return b.stats.roundsWon - a.stats.roundsWon;
      if (b.stats.sipsDrunk !== a.stats.sipsDrunk)
        return b.stats.sipsDrunk - a.stats.sipsDrunk;
      return a.player.username.localeCompare(b.player.username);
    });

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6 md:py-12">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Players
          </h1>
          <HomeButton />
        </div>

        {playerRows.length === 0 ? (
          <p className="text-muted-foreground">No registered players yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {playerRows.map(({ player, stats }) => (
              <PlayerSummaryCard
                key={player.id}
                username={player.username}
                memberSince={player.createdAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                stats={stats}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
