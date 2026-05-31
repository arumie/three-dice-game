"use server";

import { updateTag } from "next/cache";
import {
  completeGameSession,
  createGameSession,
  createGuest,
  createGuestParticipant,
  createPlayer,
  createRegisteredParticipant,
  deleteGameSession,
  findDuplicateInProgressGame,
  getFullGameState,
  getGameParticipant,
  getGameParticipantById,
  getGameSessionById,
  getPlayerByUsername,
  reassignParticipantToPlayer,
  reopenGameSession,
  retireParticipant,
  unretireParticipant,
} from "@/db/queries";
import { getSyncSenderId, publishGameUpdate } from "@/lib/ably-server";
import {
  ALL_GAMES_TAG,
  ALL_PLAYERS_TAG,
  gameSessionTag,
  playerTag,
} from "@/lib/cache-tags";
import { requireGameAuth, setGameAuthCookie } from "@/lib/game-auth";
import { getParticipantName } from "@/lib/game-helpers";
import {
  createRound,
  endCurrentTurn,
  getLatestRound,
  recordRoll,
} from "@/lib/game-service";
import type { ParticipantWithPlayer } from "@/lib/models";
import { hashPlayerPassword, verifyPlayerPassword } from "@/lib/player-auth";
import {
  assertBetweenRounds,
  countActiveForNextRound,
  isParticipantActiveForNextRound,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "@/lib/roster";

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

export type CreateGameResult = { id: number } | { duplicateGameId: number };

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
            updateTag(ALL_PLAYERS_TAG);
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
 * Create a throwaway "Test" game with 4 guest players (admin only).
 * Used from the new-game-form debug panel for quick testing.
 */
export async function createTestGameAction(
  adminPassword: string,
): Promise<{ success: true; id: number } | { success: false; error: string }> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || adminPassword !== expected) {
    return { success: false, error: "Invalid admin password" };
  }

  const session = await createGameSession({
    ownerId: "local",
    password: "test",
    config: {
      name: "Test Game",
      randomTurnOrder: false,
      isTest: true,
    },
  });

  const testPlayerNames = ["Test 1", "Test 2", "Test 3", "Test 4"];
  await Promise.all(
    testPlayerNames.map(async (name) => {
      const guest = await createGuest(name);
      return createGuestParticipant(session.id, name, guest.id);
    }),
  );

  await createRound(session.id);
  await setGameAuthCookie(session.id, "test");
  updateTag(ALL_GAMES_TAG);

  return { success: true, id: session.id };
}

/**
 * Delete a test game session. Restricted to games flagged as test games,
 * so no admin password is required (it can never delete a real game).
 */
export async function deleteTestGameAction(
  gameSessionId: number,
): Promise<{ success: boolean; error?: string }> {
  const session = await getGameSessionById(gameSessionId);
  if (!session) {
    return { success: false, error: "Game session not found" };
  }
  if (!session.config.isTest) {
    return { success: false, error: "Not a test game" };
  }
  await deleteGameSession(gameSessionId);
  updateTag(gameSessionTag(gameSessionId));
  updateTag(ALL_GAMES_TAG);
  return { success: true };
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
  await requireGameAuth(data.gameSessionId, session ?? undefined);
  await recordRoll(
    data.gameSessionId,
    data.diceValues,
    data.reRollIndices,
    round ?? undefined,
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
  await requireGameAuth(data.gameSessionId, session ?? undefined);
  await endCurrentTurn(
    data.gameSessionId,
    data.awardedToParticipantId,
    round ?? undefined,
  );
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
  const [session, round, state] = await Promise.all([
    getGameSessionById(data.gameSessionId),
    getLatestRound(data.gameSessionId),
    getFullGameState(data.gameSessionId),
  ]);
  await requireGameAuth(data.gameSessionId, session ?? undefined);

  if (session?.completedAt) {
    throw new Error("Game is already completed");
  }
  const between = assertBetweenRounds(round);
  if (!between.ok) {
    throw new Error(between.error);
  }
  if (state) {
    const activeCount = countActiveForNextRound(
      state.participants,
      between.completedRoundNumber,
    );
    if (activeCount < MIN_PLAYERS) {
      throw new Error("Not enough active players to start a round");
    }
  }

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

function participantNamesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function findActiveNameDuplicate(
  participants: ParticipantWithPlayer[],
  name: string,
  completedRoundNumber: number,
  excludeParticipantId?: number,
): boolean {
  const trimmed = name.trim();
  return participants.some(
    (p) =>
      p.id !== excludeParticipantId &&
      isParticipantActiveForNextRound(p, completedRoundNumber) &&
      participantNamesMatch(getParticipantName(p), trimmed),
  );
}

type RosterContext =
  | {
      ok: true;
      participants: ParticipantWithPlayer[];
      completedRoundNumber: number;
    }
  | { ok: false; error: string };

async function getRosterChangeContext(
  gameSessionId: number,
): Promise<RosterContext> {
  const [session, round, state] = await Promise.all([
    getGameSessionById(gameSessionId),
    getLatestRound(gameSessionId),
    getFullGameState(gameSessionId),
  ]);

  if (!session || !state) {
    return { ok: false, error: "Game session not found" };
  }
  if (session.completedAt) {
    return { ok: false, error: "Game is already completed" };
  }

  const between = assertBetweenRounds(round);
  if (!between.ok) {
    return { ok: false, error: between.error };
  }

  return {
    ok: true,
    participants: state.participants,
    completedRoundNumber: between.completedRoundNumber,
  };
}

function publishRosterUpdate(
  gameSessionId: number,
  senderId: string | null | undefined,
) {
  updateTag(gameSessionTag(gameSessionId));
  updateTag(ALL_GAMES_TAG);
  publishGameUpdate(gameSessionId, senderId ?? undefined);
}

/**
 * Add a player to an in-progress game between rounds.
 */
export async function addPlayerToGameAction(data: {
  gameSessionId: number;
  name: string;
  playerId?: number;
  playerPassword?: string;
}): Promise<
  { success: true; participantId: number } | { success: false; error: string }
> {
  const senderId = await getSyncSenderId();
  await requireGameAuth(data.gameSessionId);

  const ctx = await getRosterChangeContext(data.gameSessionId);
  if (!ctx.ok) {
    return { success: false, error: ctx.error };
  }

  const { participants, completedRoundNumber } = ctx;
  const nextRoundNumber = completedRoundNumber + 1;
  const activeCount = countActiveForNextRound(
    participants,
    completedRoundNumber,
  );

  if (activeCount >= MAX_PLAYERS) {
    return { success: false, error: `Maximum ${MAX_PLAYERS} players allowed` };
  }

  const trimmedName = data.name.trim();
  if (!trimmedName) {
    return { success: false, error: "Player name is required" };
  }

  if (
    findActiveNameDuplicate(participants, trimmedName, completedRoundNumber)
  ) {
    return {
      success: false,
      error: "A player with that name is already active",
    };
  }

  if (data.playerId != null) {
    const retiredMatch = participants.find(
      (p) => p.playerId === data.playerId && p.retiredAfterRoundNumber != null,
    );
    if (retiredMatch) {
      const updated = await unretireParticipant(
        retiredMatch.id,
        nextRoundNumber,
      );
      if (!updated) {
        return { success: false, error: "Failed to re-add player" };
      }
      publishRosterUpdate(data.gameSessionId, senderId);
      return { success: true, participantId: updated.id };
    }

    const existing = await getGameParticipant(
      data.gameSessionId,
      data.playerId,
    );
    if (existing && existing.retiredAfterRoundNumber == null) {
      return {
        success: false,
        error: "That registered player is already in this game",
      };
    }

    const participant = await createRegisteredParticipant(
      data.gameSessionId,
      data.playerId,
      { firstRoundNumber: nextRoundNumber },
    );
    publishRosterUpdate(data.gameSessionId, senderId);
    return { success: true, participantId: participant.id };
  }

  if (data.playerPassword) {
    if (
      trimmedName.length > USERNAME_MAX_LENGTH ||
      !USERNAME_REGEX.test(trimmedName)
    ) {
      return { success: false, error: "Invalid username" };
    }
    const existing = await getPlayerByUsername(trimmedName);
    if (!existing) {
      const passwordHash = await hashPlayerPassword(data.playerPassword);
      const newPlayer = await createPlayer({
        username: trimmedName,
        passwordHash,
      });
      updateTag(playerTag(trimmedName));
      updateTag(ALL_PLAYERS_TAG);
      const participant = await createRegisteredParticipant(
        data.gameSessionId,
        newPlayer.id,
        { firstRoundNumber: nextRoundNumber },
      );
      publishRosterUpdate(data.gameSessionId, senderId);
      return { success: true, participantId: participant.id };
    }
  }

  const guest = await createGuest(trimmedName);
  const participant = await createGuestParticipant(
    data.gameSessionId,
    trimmedName,
    guest.id,
    { firstRoundNumber: nextRoundNumber },
  );
  publishRosterUpdate(data.gameSessionId, senderId);
  return { success: true, participantId: participant.id };
}

/**
 * Retire a player from an in-progress game between rounds.
 */
export async function retirePlayerAction(data: {
  gameSessionId: number;
  participantId: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  const senderId = await getSyncSenderId();
  await requireGameAuth(data.gameSessionId);

  const ctx = await getRosterChangeContext(data.gameSessionId);
  if (!ctx.ok) {
    return { success: false, error: ctx.error };
  }

  const participant = ctx.participants.find((p) => p.id === data.participantId);
  if (!participant || participant.gameSessionId !== data.gameSessionId) {
    return { success: false, error: "Participant not found" };
  }
  if (participant.retiredAfterRoundNumber != null) {
    return { success: true };
  }

  const activeCount = countActiveForNextRound(
    ctx.participants,
    ctx.completedRoundNumber,
  );
  if (activeCount <= MIN_PLAYERS) {
    return {
      success: false,
      error: `At least ${MIN_PLAYERS} active players are required`,
    };
  }

  const updated = await retireParticipant(
    data.participantId,
    ctx.completedRoundNumber,
  );
  if (!updated) {
    return { success: false, error: "Failed to retire player" };
  }

  publishRosterUpdate(data.gameSessionId, senderId);
  return { success: true };
}
