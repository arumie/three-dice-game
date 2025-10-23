import { eq } from "drizzle-orm";
import { db } from "..";
import {
	gameSessionsTable,
	type GameSessionConfig,
	type InsertGameSession,
	type SelectGameSession,
} from "../schema";

/**
 * Default game session configuration
 */
export const DEFAULT_GAME_CONFIG: GameSessionConfig = {
	name: "New Game",
	randomTurnOrder: false,
};

/**
 * Create a new game session
 */
export async function createGameSession(
	data: Omit<InsertGameSession, "config"> & { config?: Partial<GameSessionConfig> },
): Promise<SelectGameSession> {
	const config: GameSessionConfig = {
		...DEFAULT_GAME_CONFIG,
		...data.config,
	};

	const [session] = await db
		.insert(gameSessionsTable)
		.values({
			...data,
			config,
		})
		.returning();
	return session;
}

/**
 * Get a game session by ID
 */
export async function getGameSessionById(
	id: number,
): Promise<SelectGameSession | null> {
	const [session] = await db
		.select()
		.from(gameSessionsTable)
		.where(eq(gameSessionsTable.id, id))
		.limit(1);
	return session || null;
}

/**
 * Get all game sessions for an owner
 */
export async function getGameSessionsByOwner(
	ownerId: string,
): Promise<SelectGameSession[]> {
	return await db
		.select()
		.from(gameSessionsTable)
		.where(eq(gameSessionsTable.ownerId, ownerId));
}

/**
 * Update a game session
 */
export async function updateGameSession(
	id: number,
	data: Partial<Omit<InsertGameSession, "config">> & {
		config?: Partial<GameSessionConfig>;
	},
): Promise<SelectGameSession | null> {
	// If config is being updated, merge with existing config
	const updateData: Partial<InsertGameSession> = {};

	// Copy non-config fields
	if (data.ownerId !== undefined) updateData.ownerId = data.ownerId;
	if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;

	// Handle config merge
	if (data.config) {
		const existing = await getGameSessionById(id);
		if (existing) {
			updateData.config = {
				...existing.config,
				...data.config,
			} as GameSessionConfig;
		}
	}

	const [session] = await db
		.update(gameSessionsTable)
		.set(updateData)
		.where(eq(gameSessionsTable.id, id))
		.returning();
	return session || null;
}

/**
 * Update game session config
 */
export async function updateGameSessionConfig(
	id: number,
	config: Partial<GameSessionConfig>,
): Promise<SelectGameSession | null> {
	return updateGameSession(id, { config });
}

/**
 * Complete a game session
 */
export async function completeGameSession(
	id: number,
): Promise<SelectGameSession | null> {
	const [session] = await db
		.update(gameSessionsTable)
		.set({ completedAt: new Date() })
		.where(eq(gameSessionsTable.id, id))
		.returning();
	return session || null;
}

/**
 * Delete a game session (cascades to all related data)
 */
export async function deleteGameSession(id: number): Promise<boolean> {
	const result = await db
		.delete(gameSessionsTable)
		.where(eq(gameSessionsTable.id, id));
	return result.rowCount > 0;
}

/**
 * Get all game sessions (with optional limit)
 */
export async function getAllGameSessions(
	limit?: number,
): Promise<SelectGameSession[]> {
	const query = db.select().from(gameSessionsTable);
	if (limit) {
		return await query.limit(limit);
	}
	return await query;
}

