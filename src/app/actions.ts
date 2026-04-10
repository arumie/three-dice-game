"use server";

import { updateTag } from "next/cache";
import {
  completeGameSession,
  createGameSession,
  createGuest,
  createGuestParticipant,
  createRegisteredParticipant,
  deleteGameSession,
  findDuplicateInProgressGame,
  getGameParticipantById,
  getGameSessionById,
  getPlayerByUsername,
  createPlayer,
  reassignParticipantToPlayer,
  reopenGameSession,
} from "@/db/queries";
import {
  createRound,
  endCurrentTurn,
  getLatestRound,
  recordRoll,
} from "@/lib/game-service";
import { gameSessionTag, ALL_GAMES_TAG, playerTag } from "@/lib/cache-tags";
import { requireGameAuth, setGameAuthCookie } from "@/lib/game-auth";
import { hashPlayerPassword, verifyPlayerPassword } from "@/lib/player-auth";
import { publishGameUpdate, getSyncSenderId } from "@/lib/ably-server";

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+( [a-zA-Z0-9_-]+)*$/;
const USERNAME_MAX_LENGTH = 30;

export type VerifyResult =
  | { status: "verified"; playerId: number }
  | { status: "available" }
  | { status: "admin_verified"; playerId: number }
  | { status: "wrong_password" }
  | { status: "no_password" }
  | { status: "invalid_username" };

/**
 * Check whether a username+password pair matches an existing player,
 * or whether the username is available for registration.
 * Does NOT create new players — registration happens in createGameAction.
 */
export async function verifyOrRegisterPlayerAction(
  username: string,
  password: string,
): Promise<VerifyResult> {
  if (!password) {
    return { status: "no_password" };
  }

  const trimmed = username.trim();
  if (
    !trimmed ||
    trimmed.length > USERNAME_MAX_LENGTH ||
    !USERNAME_REGEX.test(trimmed)
  ) {
    return { status: "invalid_username" };
  }

  const existingPlayer = await getPlayerByUsername(trimmed);

  if (existingPlayer) {
    const passwordMatch = await verifyPlayerPassword(
      password,
      existingPlayer.passwordHash,
    );
    if (passwordMatch) {
      return { status: "verified", playerId: existingPlayer.id };
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword && password === adminPassword) {
      return { status: "admin_verified", playerId: existingPlayer.id };
    }

    return { status: "wrong_password" };
  }

  return { status: "available" };
}

export type CreateGameResult =
  | { id: number }
  | { duplicateGameId: number };

export async function createGameAction(data: {
  name: string;
  password: string;
  players: { name: string; playerId?: number; playerPassword?: string }[];
  randomTurnOrder: boolean;
  creationPassword?: string;
}): Promise<CreateGameResult> {
  const requiredCreationPassword = process.env.GAME_CREATION_PASSWORD;
  if (requiredCreationPassword) {
    if (data.creationPassword !== requiredCreationPassword) {
      throw new Error("Invalid creation password");
    }
  }

  const duplicateId = await findDuplicateInProgressGame(
    data.name,
    data.password,
    data.players.map((p) => p.name),
  );
  if (duplicateId != null) {
    console.warn(
      `[createGameAction] Duplicate game detected — redirecting to existing session ${duplicateId} (name="${data.name}", players=${data.players.map((p) => p.name).join(", ")})`,
    );
    await setGameAuthCookie(duplicateId, data.password);
    return { duplicateGameId: duplicateId };
  }

  const session = await createGameSession({
    ownerId: "local",
    password: data.password,
    config: {
      name: data.name,
      randomTurnOrder: data.randomTurnOrder,
    },
  });

  await Promise.all(
    data.players.map(async (player) => {
      if (player.playerId != null) {
        return createRegisteredParticipant(session.id, player.playerId);
      }
      if (player.playerPassword) {
        const trimmed = player.name.trim();
        if (trimmed && USERNAME_REGEX.test(trimmed)) {
          const existing = await getPlayerByUsername(trimmed);
          if (!existing) {
            const passwordHash = await hashPlayerPassword(
              player.playerPassword,
            );
            const newPlayer = await createPlayer({
              username: trimmed,
              passwordHash,
            });
            updateTag(playerTag(trimmed));
            return createRegisteredParticipant(session.id, newPlayer.id);
          }
        }
      }
      const guest = await createGuest(player.name);
      return createGuestParticipant(session.id, player.name, guest.id);
    }),
  );

  await createRound(session.id);
  await setGameAuthCookie(session.id, data.password);
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
  const senderId = await getSyncSenderId();
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
  publishGameUpdate(data.gameSessionId, senderId);
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
  const senderId = await getSyncSenderId();
  // Fetch session (for auth) and latest round (for endCurrentTurn) in parallel
  const [session, round] = await Promise.all([
    getGameSessionById(data.gameSessionId),
    getLatestRound(data.gameSessionId),
  ]);
  await requireGameAuth(data.gameSessionId, session!);
  await endCurrentTurn(data.gameSessionId, data.awardedToParticipantId, round!);
  updateTag(gameSessionTag(data.gameSessionId));
  updateTag(ALL_GAMES_TAG);
  publishGameUpdate(data.gameSessionId, senderId);
}

/**
 * Start a new round. The server determines who starts (previous round's loser).
 */
export async function startRoundAction(data: {
  gameSessionId: number;
  startingParticipantId?: number;
}) {
  const senderId = await getSyncSenderId();
  // Fetch session for auth — createRound does its own parallel fetch internally
  const session = await getGameSessionById(data.gameSessionId);
  await requireGameAuth(data.gameSessionId, session!);
  await createRound(data.gameSessionId, data.startingParticipantId);
  updateTag(gameSessionTag(data.gameSessionId));
  updateTag(ALL_GAMES_TAG);
  publishGameUpdate(data.gameSessionId, senderId);
}

/**
 * End the game session. Marks it as completed.
 */
export async function endGameAction(data: { gameSessionId: number }) {
  const senderId = await getSyncSenderId();
  await requireGameAuth(data.gameSessionId);
  await completeGameSession(data.gameSessionId);
  updateTag(gameSessionTag(data.gameSessionId));
  updateTag(ALL_GAMES_TAG);
  publishGameUpdate(data.gameSessionId, senderId);
}

/**
 * End (complete) a game session after verifying the admin password.
 * Used from the /games list page where game-specific auth cookies are unavailable.
 */
export async function endGameSessionAction(
  gameSessionId: number,
  adminPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || adminPassword !== expected) {
    return { success: false, error: "Invalid admin password" };
  }
  const senderId = await getSyncSenderId();
  await completeGameSession(gameSessionId);
  updateTag(gameSessionTag(gameSessionId));
  updateTag(ALL_GAMES_TAG);
  publishGameUpdate(gameSessionId, senderId);
  return { success: true };
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
  const senderId = await getSyncSenderId();
  await reopenGameSession(gameSessionId);
  updateTag(gameSessionTag(gameSessionId));
  updateTag(ALL_GAMES_TAG);
  publishGameUpdate(gameSessionId, senderId);
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

/**
 * Reassign a guest participant to a registered player (admin only).
 * The participant's type changes from guest to registered, linking
 * the game stats to the player's cross-game profile.
 */
export async function reassignGuestToPlayerAction(
  participantId: number,
  username: string,
  adminPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || adminPassword !== expected) {
    return { success: false, error: "Invalid admin password" };
  }

  const participant = await getGameParticipantById(participantId);
  if (!participant) {
    return { success: false, error: "Participant not found" };
  }
  if (participant.playerType !== "guest") {
    return {
      success: false,
      error: "Participant is already a registered player",
    };
  }

  const player = await getPlayerByUsername(username.trim());
  if (!player) {
    return {
      success: false,
      error: `No registered player found with username "${username.trim()}"`,
    };
  }

  const senderId = await getSyncSenderId();
  await reassignParticipantToPlayer(participantId, player.id);
  updateTag(gameSessionTag(participant.gameSessionId));
  updateTag(ALL_GAMES_TAG);
  publishGameUpdate(participant.gameSessionId, senderId);

  return { success: true };
}
