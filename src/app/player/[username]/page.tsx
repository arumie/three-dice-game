import { Calendar, Dices, Home, User } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerStatsCard } from "@/components/player-profile/player-stats-card";
import { Button } from "@/components/ui/button";
import { getAllGames, getPlayer } from "@/lib/cached-queries";
import {
  accumulateStats,
  computeParticipantStats,
  emptyAggregatedStats,
} from "@/lib/game-helpers";

interface PlayerProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function PlayerProfilePage({
  params,
}: PlayerProfilePageProps) {
  const { username } = await params;
  const player = await getPlayer(decodeURIComponent(username));

  if (!player) {
    notFound();
  }

  const allGames = await getAllGames();

  const playerGames = allGames.filter((game) =>
    game.participants.some(
      (p) => p.playerType === "registered" && p.playerId === player.id,
    ),
  );

  const aggregated = emptyAggregatedStats(player.username, player.username);

  for (const game of playerGames) {
    const stats = computeParticipantStats(game);

    const sortedForWinner = [...stats].sort((a, b) => {
      if (b.roundsWon !== a.roundsWon) return b.roundsWon - a.roundsWon;
      return a.sipsDrunk - b.sipsDrunk;
    });
    const winnerId =
      game.status === "completed" ? sortedForWinner[0]?.participantId : null;

    const participant = game.participants.find((p) => p.playerId === player.id);
    if (!participant) continue;

    const participantStats = stats.find(
      (s) => s.participantId === participant.id,
    );
    if (!participantStats) continue;

    accumulateStats(aggregated, participantStats, winnerId === participant.id);
  }

  const memberSince = player.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const recentGames = [...playerGames]
    .sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    )
    .slice(0, 10);

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6 md:py-12">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/games">
              <Home className="size-4" />
              All Games
            </Link>
          </Button>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <User className="size-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {player.username}
            </h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="size-3.5" />
              Member since {memberSince}
            </p>
          </div>
        </div>

        {aggregated.gamesPlayed > 0 ? (
          <PlayerStatsCard stats={aggregated} />
        ) : (
          <p className="text-center text-muted-foreground">
            No games played yet.
          </p>
        )}

        {recentGames.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Games
            </h2>
            <div className="flex flex-col gap-2">
              {recentGames.map((game) => (
                <Link
                  key={game.id}
                  href={
                    game.status === "completed"
                      ? `/game-session/${game.id}/summary`
                      : `/game-session/${game.id}`
                  }
                  className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <Dices className="size-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">
                        {game.config.name}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {game.participants.length} players &middot;{" "}
                        {
                          game.rounds.filter((r) => r.status === "completed")
                            .length
                        }{" "}
                        rounds
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {game.status === "completed" ? "Completed" : "In progress"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
