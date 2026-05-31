import { and, eq } from "drizzle-orm";
import { db } from "..";
import {
  gameParticipantsTable,
  type InsertGameParticipant,
  type SelectGameParticipant,
} from "../schema";

/**
 * Create a new game participant (registered or guest)
 */
export async function createGameParticipant(
  data: InsertGameParticipant,
): Promise<SelectGameParticipant> {
  const [participant] = await db
    .insert(gameParticipantsTable)
    .values(data)
    .returning();
  return participant;
}

/**
 * Create a registered player participant
 */
export async function createRegisteredParticipant(
  gameSessionId: number,
  playerId: number,
  options?: { firstRoundNumber?: number },
): Promise<SelectGameParticipant> {
  return createGameParticipant({
    gameSessionId,
    playerId,
    playerType: "registered",
    guestName: null,
    firstRoundNumber: options?.firstRoundNumber ?? null,
  });
}

/**
 * Create a guest participant
 */
export async function createGuestParticipant(
  gameSessionId: number,
  guestName: string,
  guestId?: number,
  options?: { firstRoundNumber?: number },
): Promise<SelectGameParticipant> {
  return createGameParticipant({
    gameSessionId,
    playerId: null,
    guestId: guestId ?? null,
    playerType: "guest",
    guestName,
    firstRoundNumber: options?.firstRoundNumber ?? null,
  });
}

/**
 * Get a participant by ID
 */
export async function getGameParticipantById(
  id: number,
): Promise<SelectGameParticipant | null> {
  const [participant] = await db
    .select()
    .from(gameParticipantsTable)
    .where(eq(gameParticipantsTable.id, id))
    .limit(1);
  return participant || null;
}

/**
 * Get all participants for a game session
 */
export async function getGameParticipantsBySession(
  gameSessionId: number,
): Promise<SelectGameParticipant[]> {
  return await db
    .select()
    .from(gameParticipantsTable)
    .where(eq(gameParticipantsTable.gameSessionId, gameSessionId))
    .orderBy(gameParticipantsTable.joinedAt);
}

/**
 * Get a specific participant in a game session
 */
export async function getGameParticipant(
  gameSessionId: number,
  playerId: number,
): Promise<SelectGameParticipant | null> {
  const [participant] = await db
    .select()
    .from(gameParticipantsTable)
    .where(
      and(
        eq(gameParticipantsTable.gameSessionId, gameSessionId),
        eq(gameParticipantsTable.playerId, playerId),
      ),
    )
    .limit(1);
  return participant || null;
}

/**
 * Reassign a guest participant to a registered player.
 * Updates playerType, playerId, and clears guestId/guestName.
 */
export async function reassignParticipantToPlayer(
  participantId: number,
  playerId: number,
): Promise<SelectGameParticipant | null> {
  const [updated] = await db
    .update(gameParticipantsTable)
    .set({
      playerId,
      playerType: "registered",
      guestId: null,
      guestName: null,
    })
    .where(eq(gameParticipantsTable.id, participantId))
    .returning();
  return updated || null;
}

/**
 * Retire a participant from a game session.
 * Sets round boundary fields and retiredAt while keeping historical data.
 */
export async function retireParticipant(
  participantId: number,
  retiredAfterRoundNumber: number,
): Promise<SelectGameParticipant | null> {
  const [updated] = await db
    .update(gameParticipantsTable)
    .set({
      retiredAt: new Date(),
      retiredAfterRoundNumber,
    })
    .where(eq(gameParticipantsTable.id, participantId))
    .returning();
  return updated || null;
}

/**
 * Un-retire a participant for a mid-game re-add (registered players only).
 */
export async function unretireParticipant(
  participantId: number,
  firstRoundNumber: number,
): Promise<SelectGameParticipant | null> {
  const [updated] = await db
    .update(gameParticipantsTable)
    .set({
      retiredAt: null,
      retiredAfterRoundNumber: null,
      firstRoundNumber,
    })
    .where(eq(gameParticipantsTable.id, participantId))
    .returning();
  return updated || null;
}

/**
 * Get all participants for a specific registered player across all games
 */
export async function getParticipantsByPlayerId(
  playerId: number,
): Promise<SelectGameParticipant[]> {
  return await db
    .select()
    .from(gameParticipantsTable)
    .where(eq(gameParticipantsTable.playerId, playerId))
    .orderBy(gameParticipantsTable.joinedAt);
}
