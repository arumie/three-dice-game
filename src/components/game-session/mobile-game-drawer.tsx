"use client";

import { BarChart3, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { GameStateCard } from "./game-state-card";
import { RoundInfoCard } from "./round-info-card";
import type { GameModel, ParticipantStats, RoundModel } from "@/lib/models";

interface MobileGameDrawerProps {
	session: GameModel;
	stats: ParticipantStats[];
	currentRound: RoundModel;
	currentParticipantId?: number;
	gameSessionId: number;
}

export function MobileGameDrawer({
	session,
	stats,
	currentRound,
	currentParticipantId,
	gameSessionId,
}: MobileGameDrawerProps) {
	return (
		<div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 lg:hidden">
			{/* Game State Sheet */}
			<Sheet>
				<SheetTrigger asChild>
					<Button
						variant="secondary"
						size="sm"
						className="shadow-lg"
					>
						<BarChart3 className="size-4" />
						Game Info
					</Button>
				</SheetTrigger>
				<SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Game Overview</SheetTitle>
						<SheetDescription>
							Scoreboard and game status
						</SheetDescription>
					</SheetHeader>
					<div className="px-4 pb-4">
						<GameStateCard session={session} stats={stats} gameSessionId={gameSessionId} />
					</div>
				</SheetContent>
			</Sheet>

			{/* Round Info Sheet */}
			<Sheet>
				<SheetTrigger asChild>
					<Button
						variant="secondary"
						size="sm"
						className="shadow-lg"
					>
						<ListOrdered className="size-4" />
						Round Info
					</Button>
				</SheetTrigger>
				<SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Round {currentRound.roundNumber}</SheetTitle>
						<SheetDescription>
							Player order and results
						</SheetDescription>
					</SheetHeader>
					<div className="px-4 pb-4">
						<RoundInfoCard
							round={currentRound}
							participants={session.participants}
							currentParticipantId={currentParticipantId}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
