import { beforeEach, describe, expect, test } from "bun:test";
import { getGameLastActivity } from "@/lib/game-helpers";
import { mapGame } from "@/lib/mappers";
import type { GameModel } from "@/lib/models";
import { isGameStale, STALE_GAME_THRESHOLD_MS } from "@/lib/stale-games";
import {
  createParticipant,
  createRoll,
  createRound,
  createSession,
  createTurn,
  dice,
  resetIds,
} from "./test-helpers";

beforeEach(() => {
  resetIds();
});

/** Build an in-progress GameModel with a single round/turn/rolls. */
function buildGame(opts: {
  createdAt: Date;
  roundStartedAt?: Date;
  turnEndedAt?: Date | null;
  rollAt?: Date;
}): GameModel {
  const session = createSession({
    id: 1,
    completedAt: null,
    createdAt: opts.createdAt,
  });
  const participants = [
    createParticipant({ id: 10, gameSessionId: 1 }),
    createParticipant({ id: 20, gameSessionId: 1 }),
  ];

  if (!opts.roundStartedAt) {
    // Waiting game: no rounds
    return mapGame(session, participants, [], new Map(), new Map());
  }

  const round = createRound({
    id: 100,
    gameSessionId: 1,
    playerOrder: [10, 20],
    startedAt: opts.roundStartedAt,
  });
  const turn = createTurn({
    id: 200,
    gameSessionId: 1,
    roundId: 100,
    participantId: 10,
    turnOrder: 0,
    endedAt: opts.turnEndedAt ?? null,
  });
  const turnsByRoundId = new Map([[100, [turn]]]);
  const rollsByTurnId = new Map();
  if (opts.rollAt) {
    rollsByTurnId.set(200, [
      createRoll({
        id: 300,
        gameSessionId: 1,
        playerTurnId: 200,
        dice: dice([1, 4, 6]),
        rolledAt: opts.rollAt,
      }),
    ]);
  }

  return mapGame(session, participants, [round], turnsByRoundId, rollsByTurnId);
}

// ═══════════════════════════════════════════════════════════════════════════
// getGameLastActivity
// ═══════════════════════════════════════════════════════════════════════════

describe("getGameLastActivity", () => {
  test("falls back to createdAt when there is no other activity", () => {
    const createdAt = new Date("2025-06-15T10:00:00Z");
    const game = buildGame({ createdAt });
    expect(getGameLastActivity(game)).toEqual(createdAt);
  });

  test("uses the most recent roll time", () => {
    const game = buildGame({
      createdAt: new Date("2025-06-15T10:00:00Z"),
      roundStartedAt: new Date("2025-06-15T10:05:00Z"),
      rollAt: new Date("2025-06-15T10:30:00Z"),
    });
    expect(getGameLastActivity(game)).toEqual(new Date("2025-06-15T10:30:00Z"));
  });

  test("uses turn end time when it is the latest event", () => {
    const game = buildGame({
      createdAt: new Date("2025-06-15T10:00:00Z"),
      roundStartedAt: new Date("2025-06-15T10:05:00Z"),
      rollAt: new Date("2025-06-15T10:10:00Z"),
      turnEndedAt: new Date("2025-06-15T10:40:00Z"),
    });
    expect(getGameLastActivity(game)).toEqual(new Date("2025-06-15T10:40:00Z"));
  });

  test("ignores activity older than createdAt", () => {
    const createdAt = new Date("2025-06-15T12:00:00Z");
    const game = buildGame({
      createdAt,
      roundStartedAt: new Date("2025-06-15T09:00:00Z"),
    });
    expect(getGameLastActivity(game)).toEqual(createdAt);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// isGameStale
// ═══════════════════════════════════════════════════════════════════════════

describe("isGameStale", () => {
  const now = new Date("2025-06-16T00:00:00Z");

  test("is stale when last activity is older than the threshold", () => {
    const game = buildGame({
      createdAt: new Date("2025-06-15T00:00:00Z"),
      roundStartedAt: new Date("2025-06-15T00:00:00Z"),
      rollAt: new Date("2025-06-15T11:00:00Z"), // 13h before now
    });
    expect(isGameStale(game, now)).toBe(true);
  });

  test("is not stale when there has been recent activity", () => {
    const game = buildGame({
      createdAt: new Date("2025-06-15T00:00:00Z"),
      roundStartedAt: new Date("2025-06-15T00:00:00Z"),
      rollAt: new Date("2025-06-15T20:00:00Z"), // 4h before now
    });
    expect(isGameStale(game, now)).toBe(false);
  });

  test("is stale exactly at the threshold boundary", () => {
    const lastActivity = new Date(now.getTime() - STALE_GAME_THRESHOLD_MS);
    const game = buildGame({
      createdAt: lastActivity,
      roundStartedAt: lastActivity,
      rollAt: lastActivity,
    });
    expect(isGameStale(game, now)).toBe(true);
  });

  test("never flags a completed game", () => {
    const session = createSession({
      id: 1,
      createdAt: new Date("2025-06-01T00:00:00Z"),
      completedAt: new Date("2025-06-01T01:00:00Z"),
    });
    const game = mapGame(session, [], [], new Map(), new Map());
    expect(isGameStale(game, now)).toBe(false);
  });
});
