import { eq } from "drizzle-orm";
import { db } from "..";
import {
	playersTable,
	type InsertPlayer,
	type SelectPlayer,
} from "../schema";

/**
 * Create a new registered player
 */
export async function createPlayer(
	data: Omit<InsertPlayer, "id" | "createdAt">,
): Promise<SelectPlayer> {
	const [player] = await db.insert(playersTable).values(data).returning();
	return player;
}

/**
 * Get a player by ID
 */
export async function getPlayerById(id: number): Promise<SelectPlayer | null> {
	const [player] = await db
		.select()
		.from(playersTable)
		.where(eq(playersTable.id, id))
		.limit(1);
	return player || null;
}

/**
 * Get a player by user ID (auth ID)
 */
export async function getPlayerByUserId(
	userId: string,
): Promise<SelectPlayer | null> {
	const [player] = await db
		.select()
		.from(playersTable)
		.where(eq(playersTable.userId, userId))
		.limit(1);
	return player || null;
}

/**
 * Get a player by username
 */
export async function getPlayerByUsername(
	username: string,
): Promise<SelectPlayer | null> {
	const [player] = await db
		.select()
		.from(playersTable)
		.where(eq(playersTable.username, username))
		.limit(1);
	return player || null;
}

/**
 * Update a player
 */
export async function updatePlayer(
	id: number,
	data: Partial<Omit<InsertPlayer, "id" | "userId" | "createdAt">>,
): Promise<SelectPlayer | null> {
	const [player] = await db
		.update(playersTable)
		.set(data)
		.where(eq(playersTable.id, id))
		.returning();
	return player || null;
}

/**
 * Delete a player
 */
export async function deletePlayer(id: number): Promise<boolean> {
	const result = await db.delete(playersTable).where(eq(playersTable.id, id));
	return result.rowCount > 0;
}

/**
 * Get all players
 */
export async function getAllPlayers(limit?: number): Promise<SelectPlayer[]> {
	const query = db.select().from(playersTable);
	if (limit) {
		return await query.limit(limit);
	}
	return await query;
}

