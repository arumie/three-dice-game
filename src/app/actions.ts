"use server";

import { updateTag } from "next/cache";
import {
  completeGameSession,
  createGameSession,
  createGuestParticipant,
  deleteGameSession,
  getGameSessionById,
  reopenGameSession,
} from "@/db/queries";
import {
  createRound,
  endCurrentTurn,
  getLatestRound,
  recordRoll,
} from "@/lib/game-service";
import { gameSessionTag, ALL_GAMES_TAG } from "@/lib/cache-tags";
import { requireGameAuth, setGameAuthCookie } from "@/lib/game-auth";

export async function createGameAction(data: {
  name: string;
  password: string;
  players: { name: string }[];
  randomTurnOrder: boolean;
  creationPassword?: string;
}) {
  // 0. Validate creation password if required
  const requiredCreationPassword = process.env.GAME_CREATION_PASSWORD;
  if (requiredCreationPassword) {
    if (data.creationPassword !== requiredCreationPassword) {
      throw new Error("Invalid creation password");
    }
  }

  // 1. Create the game session
  const session = await createGameSession({
    ownerId: "local",
    password: data.password,
    config: {
      name: data.name,
      randomTurnOrder: data.randomTurnOrder,
    },
  });

  // 2. Create guest participants for each player
  await Promise.all(
    data.players.map((player) =>
      createGuestParticipant(session.id, player.name),
    ),
  );

  // 3. Create the first round (first participant starts)
  await createRound(session.id);

  // 4. Set the auth cookie so the creator is immediately authenticated
  await setGameAuthCookie(session.id, data.password);

  // Invalidate the all-games list cache
  updateTag(ALL_GAMES_TAG);

  return { id: session.id };
}

/**
 * Verify a game password and set an HttpOnly auth cookie on success.
 */
export async function verifyGamePasswordAction(
  gameSessionId: number,
  password: string,
): Promise<boolean> {
  const session = await getGameSessionById(gameSessionId);
  if (!session) return false;
  if (session.password !== password) return false;
  await setGameAuthCookie(gameSessionId, password);
  return true;
}

/**
 * Check if the caller is already authenticated for a game session.
 */
export async function checkGameAuthAction(
  gameSessionId: number,
): Promise<boolean> {
  try {
    await requireGameAuth(gameSessionId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Record a dice roll. The server determines the current turn/player.
 * For first roll: pass 3 diceValues, omit reRollIndices.
 * For re-roll: pass new values + indices of dice being re-rolled.
 */
export async function rollDiceAction(data: {
  gameSessionId: number;
  diceValues: number[];
  reRollIndices?: number[];
}) {
  // Fetch session (for auth) and latest round (for recordRoll) in parallel
  const [session, round] = await Promise.all([
    getGameSessionById(data.gameSessionId),
    getLatestRound(data.gameSessionId),
  ]);
  await requireGameAuth(data.gameSessionId, session!);
  await recordRoll(
    data.gameSessionId,
    data.diceValues,
    data.reRollIndices,
    round!,
  );
  updateTag(gameSessionTag(data.gameSessionId));
  updateTag(ALL_GAMES_TAG);
}

/**
 * End the current player's turn (sets ended_at).
 * Used for "End Turn" button and after "Award Sips" on stairs.
 * Optionally records who received stairs/super-stairs sips.
 */
export async function endTurnAction(data: {
  gameSessionId: number;
  awardedToParticipantId?: number;
}) {
  // Fetch session (for auth) and latest round (for endCurrentTurn) in parallel
  const [session, round] = await Promise.all([
    getGameSessionById(data.gameSessionId),
    getLatestRound(data.gameSessionId),
  ]);
  await requireGameAuth(data.gameSessionId, session!);
  await endCurrentTurn(data.gameSessionId, data.awardedToParticipantId, round!);
  updateTag(gameSessionTag(data.gameSessionId));
  updateTag(ALL_GAMES_TAG);
}

/**
 * Start a new round. The server determines who starts (previous round's loser).
 */
export async function startRoundAction(data: {
  gameSessionId: number;
  startingParticipantId?: number;
}) {
  // Fetch session for auth — createRound does its own parallel fetch internally
  const session = await getGameSessionById(data.gameSessionId);
  await requireGameAuth(data.gameSessionId, session!);
  await createRound(data.gameSessionId, data.startingParticipantId);
  updateTag(gameSessionTag(data.gameSessionId));
  updateTag(ALL_GAMES_TAG);
}

/**
 * End the game session. Marks it as completed.
 */
export async function endGameAction(data: { gameSessionId: number }) {
  await requireGameAuth(data.gameSessionId);
  await completeGameSession(data.gameSessionId);
  updateTag(gameSessionTag(data.gameSessionId));
  updateTag(ALL_GAMES_TAG);
}

/**
 * Delete a game session after verifying the admin password.
 */
export async function deleteGameSessionAction(
  gameSessionId: number,
  adminPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || adminPassword !== expected) {
    return { success: false, error: "Invalid admin password" };
  }
  await deleteGameSession(gameSessionId);
  updateTag(gameSessionTag(gameSessionId));
  updateTag(ALL_GAMES_TAG);
  return { success: true };
}

/**
 * Reopen a completed game session after verifying the admin password.
 */
export async function reopenGameSessionAction(
  gameSessionId: number,
  adminPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || adminPassword !== expected) {
    return { success: false, error: "Invalid admin password" };
  }
  await reopenGameSession(gameSessionId);
  updateTag(gameSessionTag(gameSessionId));
  updateTag(ALL_GAMES_TAG);
  return { success: true };
}

/**
 * Invalidate the cached game session data, forcing a fresh DB fetch.
 */
export async function invalidateCacheAction(gameSessionId: number) {
  updateTag(gameSessionTag(gameSessionId));
}

/**
 * Fetch all raw DB rows related to a game session for debugging.
 */
export async function getRawGameDataAction(gameSessionId: number) {
  const { db } = await import("@/db");
  const {
    gameSessionsTable,
    gameParticipantsTable,
    roundsTable,
    playerTurnsTable,
    rollsTable,
  } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const [session, participants, rounds, turns, rolls] = await Promise.all([
    db
      .select()
      .from(gameSessionsTable)
      .where(eq(gameSessionsTable.id, gameSessionId)),
    db
      .select()
      .from(gameParticipantsTable)
      .where(eq(gameParticipantsTable.gameSessionId, gameSessionId)),
    db
      .select()
      .from(roundsTable)
      .where(eq(roundsTable.gameSessionId, gameSessionId)),
    db
      .select()
      .from(playerTurnsTable)
      .where(eq(playerTurnsTable.gameSessionId, gameSessionId)),
    db
      .select()
      .from(rollsTable)
      .where(eq(rollsTable.gameSessionId, gameSessionId)),
  ]);

  return {
    game_sessions: session,
    game_participants: participants,
    rounds,
    player_turns: turns,
    rolls,
  };
}
