import { eq } from "drizzle-orm";
import { db } from "..";
import {
	gameParticipantsTable,
	gameSessionsTable,
	playerTurnsTable,
	playersTable,
	rollsTable,
	roundsTable,
	type SelectGameParticipant,
	type SelectGameSession,
	type SelectPlayer,
	type SelectPlayerTurn,
	type SelectRoll,
	type SelectRound,
} from "../schema";

/**
 * Full game state with all related data
 */
export interface FullGameState {
	session: SelectGameSession;
	participants: SelectGameParticipant[];
	rounds: SelectRound[];
	turns: SelectPlayerTurn[];
	rolls: SelectRoll[];
}

/**
 * Get complete game state with all related data
 * Optimized with parallel queries using gameSessionId indexes
 */
export async function getFullGameState(
	gameSessionId: number,
): Promise<FullGameState | null> {
	// Fetch all data in parallel
	const [sessions, participants, rounds, turns, rolls] = await Promise.all([
		db
			.select()
			.from(gameSessionsTable)
			.where(eq(gameSessionsTable.id, gameSessionId))
			.limit(1),
		db
			.select()
			.from(gameParticipantsTable)
			.where(eq(gameParticipantsTable.gameSessionId, gameSessionId))
			.orderBy(gameParticipantsTable.joinedAt),
		db
			.select()
			.from(roundsTable)
			.where(eq(roundsTable.gameSessionId, gameSessionId))
			.orderBy(roundsTable.roundNumber),
		db
			.select()
			.from(playerTurnsTable)
			.where(eq(playerTurnsTable.gameSessionId, gameSessionId)),
		db
			.select()
			.from(rollsTable)
			.where(eq(rollsTable.gameSessionId, gameSessionId)),
	]);

	if (!sessions[0]) {
		return null;
	}

	return {
		session: sessions[0],
		participants,
		rounds,
		turns,
		rolls,
	};
}

/**
 * Round with all turns and rolls
 */
export interface FullRound {
	round: SelectRound;
	turns: Array<{
		turn: SelectPlayerTurn;
		participant: SelectGameParticipant;
		rolls: SelectRoll[];
	}>;
}

/**
 * Get a complete round with all turns and rolls
 */
export async function getFullRound(roundId: number): Promise<FullRound | null> {
	// Get the round first
	const [round] = await db
		.select()
		.from(roundsTable)
		.where(eq(roundsTable.id, roundId))
		.limit(1);

	if (!round) {
		return null;
	}

	// Get all turns for this round
	const turns = await db
		.select()
		.from(playerTurnsTable)
		.where(eq(playerTurnsTable.roundId, roundId))
		.orderBy(playerTurnsTable.turnOrder);

	// Get all rolls for this round's game session (filtered by turnId later)
	const allRolls = await db
		.select()
		.from(rollsTable)
		.where(eq(rollsTable.gameSessionId, round.gameSessionId));

	// Get all participants for this game
	const participants = await db
		.select()
		.from(gameParticipantsTable)
		.where(eq(gameParticipantsTable.gameSessionId, round.gameSessionId));

	// Create a map for quick lookups
	const participantMap = new Map(participants.map((p) => [p.id, p]));
	const rollsByTurnId = new Map<number, SelectRoll[]>();
	for (const roll of allRolls) {
		if (!rollsByTurnId.has(roll.playerTurnId)) {
			rollsByTurnId.set(roll.playerTurnId, []);
		}
		rollsByTurnId.get(roll.playerTurnId)?.push(roll);
	}

	// Sort rolls for each turn
	for (const rolls of rollsByTurnId.values()) {
		rolls.sort((a, b) => a.rollNumber - b.rollNumber);
	}

	// Combine turns with participants and rolls
	const turnsWithData = turns.map((turn) => ({
		turn,
		participant: participantMap.get(turn.participantId)!,
		rolls: rollsByTurnId.get(turn.id) || [],
	}));

	return {
		round,
		turns: turnsWithData,
	};
}

/**
 * Get the latest (most recent) round for a game
 */
export async function getLatestFullRound(
	gameSessionId: number,
): Promise<FullRound | null> {
	const [latestRound] = await db
		.select()
		.from(roundsTable)
		.where(eq(roundsTable.gameSessionId, gameSessionId))
		.orderBy(roundsTable.roundNumber)
		.limit(1);

	if (!latestRound) {
		return null;
	}

	return getFullRound(latestRound.id);
}

/**
 * Participant with player details (for registered players)
 */
export interface ParticipantWithPlayer {
	participant: SelectGameParticipant;
	player: SelectPlayer | null;
}

/**
 * Get all participants for a game with their player details
 */
export async function getParticipantsWithPlayers(
	gameSessionId: number,
): Promise<ParticipantWithPlayer[]> {
	const participants = await db
		.select()
		.from(gameParticipantsTable)
		.where(eq(gameParticipantsTable.gameSessionId, gameSessionId))
		.orderBy(gameParticipantsTable.joinedAt);

	// Get all unique player IDs
	const playerIds = participants
		.map((p) => p.playerId)
		.filter((id): id is number => id !== null);

	if (playerIds.length === 0) {
		return participants.map((participant) => ({
			participant,
			player: null,
		}));
	}

	// Fetch all players at once
	const players = await db
		.select()
		.from(playersTable)
		.where(
			// Use IN clause for batch fetch
			playerIds.length > 0 ? eq(playersTable.id, playerIds[0]) : undefined,
		);

	const playerMap = new Map(players.map((p) => [p.id, p]));

	return participants.map((participant) => ({
		participant,
		player: participant.playerId ? playerMap.get(participant.playerId) || null : null,
	}));
}

/**
 * Game session with participant details
 */
export interface GameWithParticipants {
	session: SelectGameSession;
	participants: ParticipantWithPlayer[];
}

/**
 * Get a game session with all participants and their details
 */
export async function getGameWithParticipants(
	gameSessionId: number,
): Promise<GameWithParticipants | null> {
	const [session] = await db
		.select()
		.from(gameSessionsTable)
		.where(eq(gameSessionsTable.id, gameSessionId))
		.limit(1);

	if (!session) {
		return null;
	}

	const participants = await getParticipantsWithPlayers(gameSessionId);

	return {
		session,
		participants,
	};
}

/**
 * Participant statistics for a game
 */
export interface ParticipantGameStats {
	participant: SelectGameParticipant;
	roundsPlayed: number;
	totalRolls: number;
}

/**
 * Get statistics for all participants in a game
 */
export async function getParticipantStats(
	gameSessionId: number,
): Promise<ParticipantGameStats[]> {
	const participants = await db
		.select()
		.from(gameParticipantsTable)
		.where(eq(gameParticipantsTable.gameSessionId, gameSessionId));

	const turns = await db
		.select()
		.from(playerTurnsTable)
		.where(eq(playerTurnsTable.gameSessionId, gameSessionId));

	const rolls = await db
		.select()
		.from(rollsTable)
		.where(eq(rollsTable.gameSessionId, gameSessionId));

	// Group turns by participant
	const turnsByParticipant = new Map<number, SelectPlayerTurn[]>();
	for (const turn of turns) {
		if (!turnsByParticipant.has(turn.participantId)) {
			turnsByParticipant.set(turn.participantId, []);
		}
		turnsByParticipant.get(turn.participantId)?.push(turn);
	}

	// Group rolls by turn
	const rollsByTurn = new Map<number, SelectRoll[]>();
	for (const roll of rolls) {
		if (!rollsByTurn.has(roll.playerTurnId)) {
			rollsByTurn.set(roll.playerTurnId, []);
		}
		rollsByTurn.get(roll.playerTurnId)?.push(roll);
	}

	// Calculate stats for each participant
	return participants.map((participant) => {
		const participantTurns = turnsByParticipant.get(participant.id) || [];
		const totalRolls = participantTurns.reduce((sum, turn) => {
			return sum + (rollsByTurn.get(turn.id)?.length || 0);
		}, 0);

		return {
			participant,
			roundsPlayed: participantTurns.length,
			totalRolls,
		};
	});
}

