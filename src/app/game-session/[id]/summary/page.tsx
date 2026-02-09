import { DebugPanel } from "@/components/game-session/debug-panel";
import { GameSummaryCard } from "@/components/game-session/game-summary-card";
import { RoundBrowser } from "@/components/game-session/round-browser";
import { getGameSession } from "@/lib/cached-queries";
import { computeParticipantStats } from "@/lib/game-helpers";
import { notFound, redirect } from "next/navigation";

interface SummaryPageProps {
  params: Promise<{ id: string }>;
}

export default async function GameSummaryPage({ params }: SummaryPageProps) {
  const { id } = await params;
  const gameSessionId = Number(id);

  const session = await getGameSession(gameSessionId);

  if (!session) {
    notFound();
  }

  // If the game isn't completed, redirect back to the active game
  if (session.status !== "completed") {
    redirect(`/game-session/${gameSessionId}`);
  }

  const stats = computeParticipantStats(session);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <GameSummaryCard session={session} stats={stats} />
      <RoundBrowser
        rounds={session.rounds}
        participants={session.participants}
      />
      <DebugPanel session={session} gameSessionId={gameSessionId} />
    </div>
  );
}
