import { and, eq } from "drizzle-orm";
import { db } from "..";
import {
	playerTurnsTable,
	type InsertPlayerTurn,
	type SelectPlayerTurn,
} from "../schema";

/**
 * Create a new player turn
 */
export async function createPlayerTurn(
	data: InsertPlayerTurn,
): Promise<SelectPlayerTurn> {
	const [turn] = await db.insert(playerTurnsTable).values(data).returning();
	return turn;
}

/**
 * Get a player turn by ID
 */
export async function getPlayerTurnById(
	id: number,
): Promise<SelectPlayerTurn | null> {
	const [turn] = await db
		.select()
		.from(playerTurnsTable)
		.where(eq(playerTurnsTable.id, id))
		.limit(1);
	return turn || null;
}

/**
 * Get all turns for a round
 * Uses composite filter with gameSessionId for better index utilization
 */
export async function getPlayerTurnsByRound(
	roundId: number,
	gameSessionId: number,
): Promise<SelectPlayerTurn[]> {
	return await db
		.select()
		.from(playerTurnsTable)
		.where(
			and(
				eq(playerTurnsTable.gameSessionId, gameSessionId),
				eq(playerTurnsTable.roundId, roundId),
			),
		)
		.orderBy(playerTurnsTable.turnOrder);
}

/**
 * Get all turns for a game session
 */
export async function getPlayerTurnsBySession(
	gameSessionId: number,
): Promise<SelectPlayerTurn[]> {
	return await db
		.select()
		.from(playerTurnsTable)
		.where(eq(playerTurnsTable.gameSessionId, gameSessionId))
		.orderBy(playerTurnsTable.turnOrder);
}

/**
 * Get all turns for a specific participant
 */
export async function getPlayerTurnsByParticipant(
	participantId: number,
): Promise<SelectPlayerTurn[]> {
	return await db
		.select()
		.from(playerTurnsTable)
		.where(eq(playerTurnsTable.participantId, participantId))
		.orderBy(playerTurnsTable.turnOrder);
}

/**
 * Get a specific turn for a participant in a round
 * Uses composite filter with gameSessionId for better index utilization
 */
export async function getPlayerTurn(
	roundId: number,
	participantId: number,
	gameSessionId: number,
): Promise<SelectPlayerTurn | null> {
	const [turn] = await db
		.select()
		.from(playerTurnsTable)
		.where(
			and(
				eq(playerTurnsTable.gameSessionId, gameSessionId),
				eq(playerTurnsTable.roundId, roundId),
				eq(playerTurnsTable.participantId, participantId),
			),
		)
		.limit(1);
	return turn || null;
}

/**
 * Check if a participant has already taken their turn in a round
 */
export async function hasParticipantTakenTurn(
	roundId: number,
	participantId: number,
	gameSessionId: number,
): Promise<boolean> {
	const turn = await getPlayerTurn(roundId, participantId, gameSessionId);
	return turn !== null;
}

