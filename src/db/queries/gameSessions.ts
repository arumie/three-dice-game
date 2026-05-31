import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "..";
import {
  type GameSessionConfig,
  gameParticipantsTable,
  gameSessionsTable,
  type InsertGameSession,
  playersTable,
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
  data: Omit<InsertGameSession, "config"> & {
    config?: Partial<GameSessionConfig>;
  },
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
 * Complete a game session.
 *
 * Defaults to marking it complete as of now. Pass `completedAt` to end the
 * game at a specific time (e.g. its last-activity time when auto-ending a
 * stale, abandoned game).
 */
export async function completeGameSession(
  id: number,
  completedAt: Date = new Date(),
): Promise<SelectGameSession | null> {
  const [session] = await db
    .update(gameSessionsTable)
    .set({ completedAt })
    .where(eq(gameSessionsTable.id, id))
    .returning();
  return session || null;
}

/**
 * Get all in-progress (not completed) game sessions.
 */
export async function getInProgressGameSessions(): Promise<
  SelectGameSession[]
> {
  return await db
    .select()
    .from(gameSessionsTable)
    .where(isNull(gameSessionsTable.completedAt));
}

/**
 * Reopen a completed game session by clearing completedAt
 */
export async function reopenGameSession(
  id: number,
): Promise<SelectGameSession | null> {
  const [session] = await db
    .update(gameSessionsTable)
    .set({ completedAt: null })
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
    .where(eq(gameSessionsTable.id, id))
    .returning();
  return result.length > 0;
}

/**
 * Find an in-progress game session that matches the given name, password,
 * and exact set of player names. Used to prevent duplicate game creation
 * (e.g. when a mobile tab suspends and the user re-submits the form).
 *
 * Returns the first matching session ID, or null if no duplicate exists.
 */
export async function findDuplicateInProgressGame(
  name: string,
  password: string,
  playerNames: string[],
): Promise<number | null> {
  const candidates = await db
    .select({ id: gameSessionsTable.id })
    .from(gameSessionsTable)
    .where(
      and(
        isNull(gameSessionsTable.completedAt),
        eq(gameSessionsTable.password, password),
        eq(sql`${gameSessionsTable.config}->>'name'`, name),
      ),
    );

  if (candidates.length === 0) return null;

  const sortedInput = playerNames
    .map((n) => n.trim().toLowerCase())
    .sort()
    .join("\0");

  for (const candidate of candidates) {
    const participants = await db
      .select({
        guestName: gameParticipantsTable.guestName,
        playerUsername: playersTable.username,
      })
      .from(gameParticipantsTable)
      .leftJoin(
        playersTable,
        eq(gameParticipantsTable.playerId, playersTable.id),
      )
      .where(eq(gameParticipantsTable.gameSessionId, candidate.id));

    const sortedExisting = participants
      .map((p) => (p.playerUsername ?? p.guestName ?? "").toLowerCase())
      .sort()
      .join("\0");

    if (sortedInput === sortedExisting) {
      return candidate.id;
    }
  }

  return null;
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
