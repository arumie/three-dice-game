import { beforeEach, describe, expect, test } from "bun:test";
import { emptyAggregatedStats } from "@/lib/game-helpers";
import { mapGame } from "@/lib/mappers";
import type { GameModel } from "@/lib/models";
import {
  compareGamesByLastActivity,
  comparePlayersBySipsDrunk,
  type GameListEntry,
  type PlayerListEntry,
} from "@/lib/pagination";
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

function buildGameListEntry(opts: {
  id: number;
  createdAt: Date;
  rollAt?: Date;
}): GameListEntry {
  const session = createSession({
    id: opts.id,
    createdAt: opts.createdAt,
    completedAt: null,
  });
  const participants = [createParticipant({ id: 10, gameSessionId: opts.id })];
  const round = createRound({
    id: 100 + opts.id,
    gameSessionId: opts.id,
    playerOrder: [10],
    startedAt: opts.createdAt,
  });
  const turn = createTurn({
    id: 200 + opts.id,
    gameSessionId: opts.id,
    roundId: round.id,
    participantId: 10,
    endedAt: opts.rollAt ?? null,
  });
  const rolls = opts.rollAt
    ? [
        createRoll({
          id: 300 + opts.id,
          gameSessionId: opts.id,
          playerTurnId: turn.id,
          dice: dice([1, 2, 3]),
          rolledAt: opts.rollAt,
        }),
      ]
    : [];

  const game: GameModel = mapGame(
    session,
    participants,
    [round],
    new Map([[round.id, [turn]]]),
    new Map([[turn.id, rolls]]),
  );

  return { session: game, stats: [] };
}

function playerRow(
  username: string,
  stats: Partial<{
    sipsDrunk: number;
    gamesWon: number;
    roundsWon: number;
  }> = {},
): PlayerListEntry {
  const base = emptyAggregatedStats(username, username);
  return {
    player: {
      id: username.charCodeAt(0),
      username,
    },
    memberSince: "January 1, 2025",
    stats: {
      ...base,
      sipsDrunk: stats.sipsDrunk ?? 0,
      gamesWon: stats.gamesWon ?? 0,
      roundsWon: stats.roundsWon ?? 0,
    },
  };
}

describe("compareGamesByLastActivity", () => {
  test("sorts by most recent activity first", () => {
    const older = buildGameListEntry({
      id: 1,
      createdAt: new Date("2025-01-01T10:00:00Z"),
      rollAt: new Date("2025-01-01T10:05:00Z"),
    });
    const newer = buildGameListEntry({
      id: 2,
      createdAt: new Date("2025-01-01T09:00:00Z"),
      rollAt: new Date("2025-01-01T12:00:00Z"),
    });

    const sorted = [older, newer].sort(compareGamesByLastActivity);
    expect(sorted[0].session.id).toBe(2);
    expect(sorted[1].session.id).toBe(1);
  });
});

describe("comparePlayersBySipsDrunk", () => {
  test("sorts by sips drunk descending", () => {
    const rows = [
      playerRow("alice", { sipsDrunk: 5 }),
      playerRow("bob", { sipsDrunk: 20 }),
      playerRow("carol", { sipsDrunk: 10 }),
    ].sort(comparePlayersBySipsDrunk);

    expect(rows.map((r) => r.player.username)).toEqual([
      "bob",
      "carol",
      "alice",
    ]);
  });

  test("tie-breaks on games won, then rounds won, then username", () => {
    const rows = [
      playerRow("zara", { sipsDrunk: 10, gamesWon: 1, roundsWon: 3 }),
      playerRow("amy", { sipsDrunk: 10, gamesWon: 2, roundsWon: 1 }),
      playerRow("ben", { sipsDrunk: 10, gamesWon: 2, roundsWon: 5 }),
      playerRow("cal", { sipsDrunk: 10, gamesWon: 2, roundsWon: 5 }),
    ].sort(comparePlayersBySipsDrunk);

    expect(rows.map((r) => r.player.username)).toEqual([
      "ben",
      "cal",
      "amy",
      "zara",
    ]);
  });
});
