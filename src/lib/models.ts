import type {
	SelectGameParticipant,
	SelectGameSession,
	SelectPlayerTurn,
	SelectRoll,
	SelectRound,
	SpecialRollType,
} from "../db/schema";

/**
 * Roll domain model with calculated fields
 */
export interface RollModel extends SelectRoll {
	score: number;
	specialRollType: SpecialRollType;
}

/**
 * PlayerTurn domain model with calculated fields
 */
export interface PlayerTurnModel extends SelectPlayerTurn {
	rolls: RollModel[];
	totalRollsUsed: number;
	finalScore: number | null;
	isSafe: boolean;
	specialRollType: SpecialRollType;
	completedAt: Date;
}

/**
 * Round domain model with calculated fields
 */
export interface RoundModel extends SelectRound {
	turns: PlayerTurnModel[];
	status: "in_progress" | "completed";
	startingParticipantId: number;
	maxRollsAllowed: number;
	currentPenaltySips: number;
	finalPenaltySips: number | null;
	losingParticipantId: number | null;
	completedAt: Date | null;
}

/**
 * GameSession domain model with calculated fields
 */
export interface GameModel extends SelectGameSession {
	participants: SelectGameParticipant[];
	rounds: RoundModel[];
	status: "waiting" | "in_progress" | "completed";
	startedAt: Date | null;
}

/**
 * Participant statistics for a game session
 */
export interface ParticipantStats {
	participantId: number;
	roundsWon: number;
	roundsLost: number;
	sipsDrunk: number;
	sipsAwarded: number;
}

/**
 * Global player statistics across all games
 */
export interface PlayerGlobalStats {
	playerId: number;
	gamesPlayed: number;
	gamesWon: number;
	totalSipsDrunk: number;
	totalSipsAwarded: number;
}

