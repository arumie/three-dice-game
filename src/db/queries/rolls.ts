import { and, desc, eq } from "drizzle-orm";
import { db } from "..";
import { rollsTable, type InsertRoll, type SelectRoll } from "../schema";

/**
 * Create a new roll
 */
export async function createRoll(data: InsertRoll): Promise<SelectRoll> {
	const [roll] = await db.insert(rollsTable).values(data).returning();
	return roll;
}

/**
 * Get a roll by ID
 */
export async function getRollById(id: number): Promise<SelectRoll | null> {
	const [roll] = await db
		.select()
		.from(rollsTable)
		.where(eq(rollsTable.id, id))
		.limit(1);
	return roll || null;
}

/**
 * Get all rolls for a player turn
 * Uses composite filter with gameSessionId for better index utilization
 */
export async function getRollsByPlayerTurn(
	playerTurnId: number,
	gameSessionId: number,
): Promise<SelectRoll[]> {
	return await db
		.select()
		.from(rollsTable)
		.where(
			and(
				eq(rollsTable.gameSessionId, gameSessionId),
				eq(rollsTable.playerTurnId, playerTurnId),
			),
		)
		.orderBy(rollsTable.rollNumber);
}

/**
 * Get all rolls for a game session
 */
export async function getRollsBySession(
	gameSessionId: number,
): Promise<SelectRoll[]> {
	return await db
		.select()
		.from(rollsTable)
		.where(eq(rollsTable.gameSessionId, gameSessionId))
		.orderBy(rollsTable.rolledAt);
}

/**
 * Get the latest roll for a player turn
 * Uses composite filter with gameSessionId for better index utilization
 */
export async function getLatestRoll(
	playerTurnId: number,
	gameSessionId: number,
): Promise<SelectRoll | null> {
	const [roll] = await db
		.select()
		.from(rollsTable)
		.where(
			and(
				eq(rollsTable.gameSessionId, gameSessionId),
				eq(rollsTable.playerTurnId, playerTurnId),
			),
		)
		.orderBy(desc(rollsTable.rollNumber))
		.limit(1);
	return roll || null;
}

/**
 * Get a specific roll by turn and roll number
 * Uses composite filter with gameSessionId for better index utilization
 */
export async function getRollByNumber(
	playerTurnId: number,
	rollNumber: number,
	gameSessionId: number,
): Promise<SelectRoll | null> {
	const [roll] = await db
		.select()
		.from(rollsTable)
		.where(
			and(
				eq(rollsTable.gameSessionId, gameSessionId),
				eq(rollsTable.playerTurnId, playerTurnId),
				eq(rollsTable.rollNumber, rollNumber),
			),
		)
		.limit(1);
	return roll || null;
}

/**
 * Count rolls for a player turn
 */
export async function countRollsByPlayerTurn(
	playerTurnId: number,
	gameSessionId: number,
): Promise<number> {
	const rolls = await getRollsByPlayerTurn(playerTurnId, gameSessionId);
	return rolls.length;
}

