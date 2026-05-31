import { notFound, redirect } from "next/navigation";
import { DebugPanel } from "@/components/game-session/debug-panel";
import { GameSessionSync } from "@/components/game-session/game-session-sync";
import { GameStateCard } from "@/components/game-session/game-state-card";
import { MobileGameDrawer } from "@/components/game-session/mobile-game-drawer";
import { PasswordGate } from "@/components/game-session/password-gate";
import { PlayerTurnCard } from "@/components/game-session/player-turn-card";
import { RoundInfoCard } from "@/components/game-session/round-info-card";
import { getGameSession } from "@/lib/cached-queries";
import { computeParticipantStats, getCurrentRound } from "@/lib/game-helpers";

interface GameSessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function GameSessionPage({
  params,
}: GameSessionPageProps) {
  const { id } = await params;
  const gameSessionId = Number(id);

  const session = await getGameSession(gameSessionId);

  if (!session) {
    notFound();
  }

  // Redirect completed games to the summary page
  if (session.status === "completed") {
    redirect(`/game-session/${gameSessionId}/summary`);
  }

  const currentRound = getCurrentRound(session);
  const stats = computeParticipantStats(session);

  // Determine the current turn and active participant using isComplete
  const isRoundComplete = currentRound?.status === "completed";
  const currentTurn = currentRound?.turns.find((t) => !t.isComplete) ?? null;
  const currentParticipantId = isRoundComplete
    ? currentRound.playerOrder[0] // doesn't matter for display, round is done
    : (currentTurn?.participantId ??
      (currentRound
        ? (currentRound.playerOrder.find(
            (pid) =>
              !currentRound.turns.some(
                (t) => t.participantId === pid && t.isComplete,
              ),
          ) ?? currentRound.playerOrder[0])
        : session.participants[0]?.id));

  // If there's no round yet, show a "waiting" state
  if (!currentRound) {
    return (
      <PasswordGate gameSessionId={gameSessionId}>
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
          <p className="text-muted-foreground">
            Waiting for the game to start...
          </p>
        </div>
      </PasswordGate>
    );
  }

  return (
    <PasswordGate gameSessionId={gameSessionId}>
      <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        {/* Desktop: Game state card at top */}
        <div className="hidden lg:block">
          <GameStateCard
            session={session}
            stats={stats}
            gameSessionId={gameSessionId}
          />
        </div>

        {/* Desktop: Two-column layout / Mobile: single column */}
        <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
          {/* Desktop: Round info sidebar */}
          <div className="hidden lg:flex lg:w-[340px] lg:shrink-0 xl:w-[380px]">
            <RoundInfoCard
              round={currentRound}
              participants={session.participants}
              currentParticipantId={currentParticipantId}
            />
          </div>

          {/* Main play area — always visible */}
          <div className="flex flex-1 flex-col">
            <PlayerTurnCard
              gameSessionId={gameSessionId}
              round={currentRound}
              currentTurn={currentTurn}
              participants={session.participants}
              currentParticipantId={currentParticipantId}
            />
          </div>
        </div>

        {/* Mobile: floating sheet triggers */}
        <MobileGameDrawer
          session={session}
          stats={stats}
          currentRound={currentRound}
          currentParticipantId={currentParticipantId}
          gameSessionId={gameSessionId}
        />

        {/* Debug tools & live viewers */}
        <DebugPanel session={session} gameSessionId={gameSessionId} />
        <GameSessionSync gameSessionId={gameSessionId} />
      </div>
    </PasswordGate>
  );
}
