import { and, desc, eq } from "drizzle-orm";
import { db } from "..";
import { roundsTable, type InsertRound, type SelectRound } from "../schema";

/**
 * Create a new round
 */
export async function createRound(data: InsertRound): Promise<SelectRound> {
	const [round] = await db.insert(roundsTable).values(data).returning();
	return round;
}

/**
 * Get a round by ID
 * Uses composite filter with gameSessionId for better index utilization
 */
export async function getRoundById(
	id: number,
	gameSessionId: number,
): Promise<SelectRound | null> {
	const [round] = await db
		.select()
		.from(roundsTable)
		.where(
			and(
				eq(roundsTable.gameSessionId, gameSessionId),
				eq(roundsTable.id, id),
			),
		)
		.limit(1);
	return round || null;
}

/**
 * Get all rounds for a game session
 */
export async function getRoundsBySession(
	gameSessionId: number,
): Promise<SelectRound[]> {
	return await db
		.select()
		.from(roundsTable)
		.where(eq(roundsTable.gameSessionId, gameSessionId))
		.orderBy(roundsTable.roundNumber);
}

/**
 * Get the latest round for a game session
 */
export async function getLatestRound(
	gameSessionId: number,
): Promise<SelectRound | null> {
	const [round] = await db
		.select()
		.from(roundsTable)
		.where(eq(roundsTable.gameSessionId, gameSessionId))
		.orderBy(desc(roundsTable.roundNumber))
		.limit(1);
	return round || null;
}

/**
 * Get a specific round by session and round number
 */
export async function getRoundByNumber(
	gameSessionId: number,
	roundNumber: number,
): Promise<SelectRound | null> {
	const [round] = await db
		.select()
		.from(roundsTable)
		.where(
			and(
				eq(roundsTable.gameSessionId, gameSessionId),
				eq(roundsTable.roundNumber, roundNumber),
			),
		)
		.limit(1);
	return round || null;
}

/**
 * Get the highest round number for a game session
 */
export async function getMaxRoundNumber(gameSessionId: number): Promise<number> {
	const latestRound = await getLatestRound(gameSessionId);
	return latestRound?.roundNumber || 0;
}

