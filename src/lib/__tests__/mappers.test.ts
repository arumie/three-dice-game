import { beforeEach, describe, expect, test } from "bun:test";
import type { SelectPlayerTurn, SelectRoll } from "@/db/schema";
import { mapGame, mapPlayerTurn, mapRoll, mapRound } from "@/lib/mappers";
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

// ═══════════════════════════════════════════════════════════════════════════════
// mapRoll
// ═══════════════════════════════════════════════════════════════════════════════

describe("mapRoll", () => {
  test("calculates score from dice", () => {
    const roll = createRoll({ dice: dice([1, 2, 4]) });
    const result = mapRoll(roll);
    expect(result.score).toBe(106);
  });

  test("detects three_of_a_kind", () => {
    const roll = createRoll({ dice: dice([5, 5, 5]) });
    const result = mapRoll(roll);
    expect(result.specialRollType).toBe("three_of_a_kind");
    expect(result.score).toBe(15);
  });

  test("detects stairs", () => {
    const roll = createRoll({ dice: dice([1, 2, 3]) });
    const result = mapRoll(roll);
    expect(result.specialRollType).toBe("stairs");
    expect(result.score).toBe(105);
  });

  test("detects super_stairs", () => {
    const roll = createRoll({ dice: dice([4, 5, 6]) });
    const result = mapRoll(roll);
    expect(result.specialRollType).toBe("super_stairs");
    expect(result.score).toBe(69);
  });

  test("detects shit_stairs", () => {
    const roll = createRoll({ dice: dice([2, 3, 4]) });
    const result = mapRoll(roll);
    expect(result.specialRollType).toBe("shit_stairs");
    expect(result.score).toBe(9);
  });

  test("detects lowest [2,2,3]", () => {
    const roll = createRoll({ dice: dice([2, 2, 3]) });
    const result = mapRoll(roll);
    expect(result.specialRollType).toBe("lowest");
    expect(result.score).toBe(7);
  });

  test("none for a normal roll", () => {
    const roll = createRoll({ dice: dice([1, 4, 5]) });
    const result = mapRoll(roll);
    expect(result.specialRollType).toBe("none");
    expect(result.score).toBe(109);
  });

  test("preserves original roll fields", () => {
    const roll = createRoll({ id: 42, rollNumber: 2, dice: dice([1, 1, 6]) });
    const result = mapRoll(roll);
    expect(result.id).toBe(42);
    expect(result.rollNumber).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// mapPlayerTurn
// ═══════════════════════════════════════════════════════════════════════════════

describe("mapPlayerTurn", () => {
  test("maps rolls and counts totalRollsUsed", () => {
    const turn = createTurn({ id: 10 });
    const rolls: SelectRoll[] = [
      createRoll({ playerTurnId: 10, rollNumber: 1, dice: dice([1, 4, 5]) }),
      createRoll({ playerTurnId: 10, rollNumber: 2, dice: dice([1, 2, 6]) }),
    ];
    const result = mapPlayerTurn(turn, rolls);
    expect(result.totalRollsUsed).toBe(2);
    expect(result.rolls).toHaveLength(2);
  });

  test("specialRollType comes from last roll", () => {
    const turn = createTurn({ id: 10 });
    const rolls: SelectRoll[] = [
      createRoll({ playerTurnId: 10, rollNumber: 1, dice: dice([2, 3, 5]) }),
      createRoll({ playerTurnId: 10, rollNumber: 2, dice: dice([3, 3, 3]) }),
    ];
    const result = mapPlayerTurn(turn, rolls);
    expect(result.specialRollType).toBe("three_of_a_kind");
  });

  test("isSafe is true for three_of_a_kind", () => {
    const turn = createTurn({ id: 10 });
    const rolls: SelectRoll[] = [
      createRoll({ playerTurnId: 10, rollNumber: 1, dice: dice([4, 4, 4]) }),
    ];
    const result = mapPlayerTurn(turn, rolls);
    expect(result.isSafe).toBe(true);
  });

  test("finalScore is null when safe", () => {
    const turn = createTurn({ id: 10 });
    const rolls: SelectRoll[] = [
      createRoll({ playerTurnId: 10, rollNumber: 1, dice: dice([1, 2, 3]) }),
    ];
    const result = mapPlayerTurn(turn, rolls);
    expect(result.isSafe).toBe(true);
    expect(result.finalScore).toBeNull();
  });

  test("finalScore is the score of the last roll when not safe", () => {
    const turn = createTurn({ id: 10 });
    const rolls: SelectRoll[] = [
      createRoll({ playerTurnId: 10, rollNumber: 1, dice: dice([1, 4, 5]) }),
      createRoll({ playerTurnId: 10, rollNumber: 2, dice: dice([2, 5, 6]) }),
    ];
    const result = mapPlayerTurn(turn, rolls);
    expect(result.isSafe).toBe(false);
    // [2, 5, 6] = 2 + 5 + 60 = 67
    expect(result.finalScore).toBe(67);
  });

  test("completedAt comes from last roll's rolledAt", () => {
    const rolledAt = new Date("2025-06-15T18:00:00Z");
    const turn = createTurn({ id: 10 });
    const rolls: SelectRoll[] = [
      createRoll({ playerTurnId: 10, rollNumber: 1, rolledAt }),
    ];
    const result = mapPlayerTurn(turn, rolls);
    expect(result.completedAt).toEqual(rolledAt);
  });

  test("isComplete defaults to false (overridden by mapRound)", () => {
    const turn = createTurn({ id: 10, endedAt: new Date() });
    const rolls: SelectRoll[] = [
      createRoll({ playerTurnId: 10, rollNumber: 1, dice: dice([1, 4, 5]) }),
    ];
    const result = mapPlayerTurn(turn, rolls);
    expect(result.isComplete).toBe(false);
  });

  test("handles turn with no rolls", () => {
    const turn = createTurn({ id: 10 });
    const result = mapPlayerTurn(turn, []);
    expect(result.totalRollsUsed).toBe(0);
    expect(result.specialRollType).toBe("none");
    expect(result.isSafe).toBe(false);
    expect(result.finalScore).toBe(0);
  });

  test("shit_stairs is not safe", () => {
    const turn = createTurn({ id: 10 });
    const rolls: SelectRoll[] = [
      createRoll({ playerTurnId: 10, rollNumber: 1, dice: dice([2, 3, 4]) }),
    ];
    const result = mapPlayerTurn(turn, rolls);
    expect(result.specialRollType).toBe("shit_stairs");
    expect(result.isSafe).toBe(false);
    expect(result.finalScore).toBe(9);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// mapRound
// ═══════════════════════════════════════════════════════════════════════════════

describe("mapRound", () => {
  // ── Helper to build rollsByTurnId map ─────────────────────────────────────

  function buildRollsMap(
    entries: { turnId: number; rolls: SelectRoll[] }[],
  ): Map<number, SelectRoll[]> {
    const map = new Map<number, SelectRoll[]>();
    for (const entry of entries) {
      map.set(entry.turnId, entry.rolls);
    }
    return map;
  }

  // ── In-progress round ─────────────────────────────────────────────────────

  test("in-progress: not all turns present", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20, 30],
    });
    const turn1 = createTurn({
      id: 100,
      participantId: 10,
      turnOrder: 0,
      endedAt: new Date(),
    });
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [
          createRoll({ playerTurnId: 100, rollNumber: 1, dice: dice([1, 4, 5]) }),
          createRoll({ playerTurnId: 100, rollNumber: 2, dice: dice([1, 2, 6]) }),
        ],
      },
    ]);

    const result = mapRound(round, [turn1], rolls);
    expect(result.status).toBe("in_progress");
    expect(result.turns).toHaveLength(1);
    expect(result.losingParticipantIds).toEqual([]);
    expect(result.finalPenaltySips).toBeNull();
    expect(result.falseStart).toBe(false);
    expect(result.allSafe).toBe(false);
  });

  // ── Completed round with single loser ─────────────────────────────────────

  test("completed: single loser has lowest score", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20, 30],
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({ id: 100, participantId: 10, turnOrder: 0, endedAt: now }),
      createTurn({ id: 101, participantId: 20, turnOrder: 1, endedAt: now }),
      createTurn({ id: 102, participantId: 30, turnOrder: 2, endedAt: now }),
    ];
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [createRoll({ playerTurnId: 100, dice: dice([1, 4, 5]) })], // 109
      },
      {
        turnId: 101,
        rolls: [createRoll({ playerTurnId: 101, dice: dice([2, 3, 5]) })], // 10
      },
      {
        turnId: 102,
        rolls: [createRoll({ playerTurnId: 102, dice: dice([1, 1, 6]) })], // 260
      },
    ]);

    const result = mapRound(round, turns, rolls);
    expect(result.status).toBe("completed");
    expect(result.losingParticipantIds).toEqual([20]);
    expect(result.finalPenaltySips).toBe(1); // base penalty, no specials
    expect(result.falseStart).toBe(false);
    expect(result.allSafe).toBe(false);
    expect(result.completedAt).not.toBeNull();
  });

  // ── Completed round with tied losers ──────────────────────────────────────

  test("completed: tied losers both returned", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20, 30],
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({ id: 100, participantId: 10, turnOrder: 0, endedAt: now }),
      createTurn({ id: 101, participantId: 20, turnOrder: 1, endedAt: now }),
      createTurn({ id: 102, participantId: 30, turnOrder: 2, endedAt: now }),
    ];
    // participants 20 and 30 both score 10
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [createRoll({ playerTurnId: 100, dice: dice([1, 4, 5]) })], // 109
      },
      {
        turnId: 101,
        rolls: [createRoll({ playerTurnId: 101, dice: dice([2, 3, 5]) })], // 10
      },
      {
        turnId: 102,
        rolls: [createRoll({ playerTurnId: 102, dice: dice([2, 3, 5]) })], // 10
      },
    ]);

    const result = mapRound(round, turns, rolls);
    expect(result.status).toBe("completed");
    expect(result.losingParticipantIds).toEqual([20, 30]);
  });

  // ── All-safe round ────────────────────────────────────────────────────────

  test("completed: all players safe → allSafe true, no losers", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20],
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({ id: 100, participantId: 10, turnOrder: 0, endedAt: now }),
      createTurn({ id: 101, participantId: 20, turnOrder: 1, endedAt: now }),
    ];
    // First player needs 2+ rolls to avoid false start
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [
          createRoll({ playerTurnId: 100, rollNumber: 1, dice: dice([2, 3, 5]) }),
          createRoll({ playerTurnId: 100, rollNumber: 2, dice: dice([3, 3, 3]) }), // three_of_a_kind on roll 2
        ],
      },
      {
        turnId: 101,
        rolls: [createRoll({ playerTurnId: 101, rollNumber: 1, dice: dice([1, 2, 3]) })], // stairs
      },
    ]);

    const result = mapRound(round, turns, rolls);
    expect(result.status).toBe("completed");
    expect(result.allSafe).toBe(true);
    expect(result.losingParticipantIds).toEqual([]);
  });

  // ── False start: three_of_a_kind ──────────────────────────────────────────

  test("false start: first player rolls three_of_a_kind on first throw", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20, 30],
      carryOverSips: 0,
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({
        id: 100,
        participantId: 10,
        turnOrder: 0,
        endedAt: now,
      }),
    ];
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [
          createRoll({
            playerTurnId: 100,
            rollNumber: 1,
            dice: dice([4, 4, 4]),
            rolledAt: now,
          }),
        ],
      },
    ]);

    const result = mapRound(round, turns, rolls);
    expect(result.falseStart).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.losingParticipantIds).toEqual([10]);
    expect(result.currentPenaltySips).toBe(4); // three 4s = 4 sips
    expect(result.finalPenaltySips).toBe(4);
  });

  // ── False start: stairs ───────────────────────────────────────────────────

  test("false start: first player rolls stairs on first throw", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20, 30],
      carryOverSips: 0,
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({
        id: 100,
        participantId: 10,
        turnOrder: 0,
        endedAt: now,
      }),
    ];
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [
          createRoll({
            playerTurnId: 100,
            rollNumber: 1,
            dice: dice([1, 2, 3]),
            rolledAt: now,
          }),
        ],
      },
    ]);

    const result = mapRound(round, turns, rolls);
    expect(result.falseStart).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.losingParticipantIds).toEqual([10]);
    // stairs with turnOrder 0: penalty = 0 + 1 = 1
    expect(result.currentPenaltySips).toBe(1);
  });

  // ── False start skipped with carry-over ───────────────────────────────────

  test("false start skipped when carry-over sips > 0", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20, 30],
      carryOverSips: 3,
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({
        id: 100,
        participantId: 10,
        turnOrder: 0,
        endedAt: now,
      }),
    ];
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [
          createRoll({
            playerTurnId: 100,
            rollNumber: 1,
            dice: dice([4, 4, 4]),
            rolledAt: now,
          }),
        ],
      },
    ]);

    const result = mapRound(round, turns, rolls);
    expect(result.falseStart).toBe(false);
    // Round is in-progress because not all 3 players have played
    expect(result.status).toBe("in_progress");
  });

  // ── Not a false start: first player uses more than 1 roll ─────────────────

  test("no false start if first player used more than 1 roll", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20],
      carryOverSips: 0,
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({ id: 100, participantId: 10, turnOrder: 0, endedAt: now }),
      createTurn({ id: 101, participantId: 20, turnOrder: 1, endedAt: now }),
    ];
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [
          createRoll({ playerTurnId: 100, rollNumber: 1, dice: dice([2, 3, 5]) }),
          createRoll({ playerTurnId: 100, rollNumber: 2, dice: dice([3, 3, 3]) }), // three_of_a_kind on roll 2
        ],
      },
      {
        turnId: 101,
        rolls: [
          createRoll({ playerTurnId: 101, rollNumber: 1, dice: dice([1, 4, 6]) }),
        ],
      },
    ]);

    const result = mapRound(round, turns, rolls);
    expect(result.falseStart).toBe(false);
    expect(result.status).toBe("completed");
  });

  // ── Super stairs: valid (after stairs) ────────────────────────────────────

  test("valid super stairs: [4,5,6] after stairs turn stays super_stairs", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20],
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({ id: 100, participantId: 10, turnOrder: 0, endedAt: now }),
      createTurn({ id: 101, participantId: 20, turnOrder: 1, endedAt: now }),
    ];
    // First player needs 2+ rolls to avoid false start on stairs
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [
          createRoll({ playerTurnId: 100, rollNumber: 1, dice: dice([2, 4, 5]) }),
          createRoll({ playerTurnId: 100, rollNumber: 2, dice: dice([1, 2, 3]) }), // stairs on roll 2
        ],
      },
      {
        turnId: 101,
        rolls: [createRoll({ playerTurnId: 101, rollNumber: 1, dice: dice([4, 5, 6]) })], // super_stairs
      },
    ]);

    const result = mapRound(round, turns, rolls);
    const turn2 = result.turns[1];
    expect(turn2.specialRollType).toBe("super_stairs");
    expect(turn2.isSafe).toBe(true);
    expect(turn2.finalScore).toBeNull();
    expect(result.allSafe).toBe(true);
  });

  // ── Super stairs: downgraded (no preceding stairs) ────────────────────────

  test("downgraded super stairs: [4,5,6] without preceding stairs becomes none", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20],
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({ id: 100, participantId: 10, turnOrder: 0, endedAt: now }),
      createTurn({ id: 101, participantId: 20, turnOrder: 1, endedAt: now }),
    ];
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [createRoll({ playerTurnId: 100, dice: dice([1, 4, 5]) })], // normal (109)
      },
      {
        turnId: 101,
        rolls: [createRoll({ playerTurnId: 101, dice: dice([4, 5, 6]) })], // would be super_stairs but downgraded
      },
    ]);

    const result = mapRound(round, turns, rolls);
    const turn2 = result.turns[1];
    expect(turn2.specialRollType).toBe("none");
    expect(turn2.isSafe).toBe(false);
    expect(turn2.finalScore).toBe(69); // 4 + 5 + 60
  });

  // ── Super stairs downgraded: gap between stairs and [4,5,6] ──────────────

  test("downgraded super stairs: non-adjacent stairs and [4,5,6]", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20, 30],
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({ id: 100, participantId: 10, turnOrder: 0, endedAt: now }),
      createTurn({ id: 101, participantId: 20, turnOrder: 1, endedAt: now }),
      createTurn({ id: 102, participantId: 30, turnOrder: 2, endedAt: now }),
    ];
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [createRoll({ playerTurnId: 100, dice: dice([1, 2, 3]) })], // stairs
      },
      {
        turnId: 101,
        rolls: [createRoll({ playerTurnId: 101, dice: dice([2, 5, 6]) })], // normal (67)
      },
      {
        turnId: 102,
        rolls: [createRoll({ playerTurnId: 102, dice: dice([4, 5, 6]) })], // downgraded: prev turn is not stairs
      },
    ]);

    const result = mapRound(round, turns, rolls);
    expect(result.turns[2].specialRollType).toBe("none");
    expect(result.turns[2].isSafe).toBe(false);
    expect(result.turns[2].finalScore).toBe(69);
  });

  // ── maxRollsAllowed from carryOverMaxRolls ────────────────────────────────

  test("maxRollsAllowed uses carryOverMaxRolls when set", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20],
      carryOverMaxRolls: 2,
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({ id: 100, participantId: 10, turnOrder: 0, endedAt: now }),
    ];
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [
          createRoll({ playerTurnId: 100, rollNumber: 1, dice: dice([1, 4, 5]) }),
          createRoll({ playerTurnId: 100, rollNumber: 2, dice: dice([1, 2, 6]) }),
          createRoll({ playerTurnId: 100, rollNumber: 3, dice: dice([1, 1, 6]) }),
        ],
      },
    ]);

    const result = mapRound(round, turns, rolls);
    expect(result.maxRollsAllowed).toBe(2); // carryOverMaxRolls overrides
  });

  // ── maxRollsAllowed from first turn ───────────────────────────────────────

  test("maxRollsAllowed from first turn when no carry-over", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20],
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({ id: 100, participantId: 10, turnOrder: 0, endedAt: now }),
      createTurn({ id: 101, participantId: 20, turnOrder: 1, endedAt: now }),
    ];
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [
          createRoll({ playerTurnId: 100, rollNumber: 1, dice: dice([1, 4, 5]) }),
          createRoll({ playerTurnId: 100, rollNumber: 2, dice: dice([1, 2, 6]) }),
        ],
      },
      {
        turnId: 101,
        rolls: [
          createRoll({ playerTurnId: 101, rollNumber: 1, dice: dice([2, 5, 6]) }),
        ],
      },
    ]);

    const result = mapRound(round, turns, rolls);
    expect(result.maxRollsAllowed).toBe(2); // first turn used 2 rolls
  });

  // ── maxRollsAllowed defaults to 3 when first turn still in progress ───────

  test("maxRollsAllowed defaults to 3 when first turn not done", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20],
    });
    // First turn has no endedAt and less than 3 rolls → still in progress
    const turns: SelectPlayerTurn[] = [
      createTurn({ id: 100, participantId: 10, turnOrder: 0, endedAt: null }),
    ];
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [
          createRoll({ playerTurnId: 100, rollNumber: 1, dice: dice([1, 4, 5]) }),
        ],
      },
    ]);

    const result = mapRound(round, turns, rolls);
    expect(result.maxRollsAllowed).toBe(3);
  });

  // ── Penalty accumulation with carry-over sips ─────────────────────────────

  test("penalty includes carry-over sips", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20],
      carryOverSips: 5,
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({ id: 100, participantId: 10, turnOrder: 0, endedAt: now }),
      createTurn({ id: 101, participantId: 20, turnOrder: 1, endedAt: now }),
    ];
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [createRoll({ playerTurnId: 100, dice: dice([1, 4, 5]) })], // normal
      },
      {
        turnId: 101,
        rolls: [createRoll({ playerTurnId: 101, dice: dice([2, 5, 6]) })], // normal
      },
    ]);

    const result = mapRound(round, turns, rolls);
    // carryOver(5) + base(1) = 6
    expect(result.currentPenaltySips).toBe(6);
    expect(result.finalPenaltySips).toBe(6);
  });

  test("penalty with carry-over and three_of_a_kind", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20],
      carryOverSips: 3,
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({ id: 100, participantId: 10, turnOrder: 0, endedAt: now }),
      createTurn({ id: 101, participantId: 20, turnOrder: 1, endedAt: now }),
    ];
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [createRoll({ playerTurnId: 100, dice: dice([5, 5, 5]) })], // three_of_a_kind → +5
      },
      {
        turnId: 101,
        rolls: [createRoll({ playerTurnId: 101, dice: dice([2, 4, 6]) })], // normal (66)
      },
    ]);

    const result = mapRound(round, turns, rolls);
    // carryOver(3) + base(1) + three5s(5) = 9
    expect(result.currentPenaltySips).toBe(9);
    expect(result.finalPenaltySips).toBe(9);
    expect(result.losingParticipantIds).toEqual([20]);
  });

  // ── isComplete set on turns ───────────────────────────────────────────────

  test("turns have isComplete set based on endedAt", () => {
    const round = createRound({
      id: 1,
      playerOrder: [10, 20],
    });
    const now = new Date();
    const turns: SelectPlayerTurn[] = [
      createTurn({ id: 100, participantId: 10, turnOrder: 0, endedAt: now }),
      createTurn({ id: 101, participantId: 20, turnOrder: 1, endedAt: null }),
    ];
    const rolls = buildRollsMap([
      {
        turnId: 100,
        rolls: [createRoll({ playerTurnId: 100, dice: dice([1, 4, 5]) })],
      },
      {
        turnId: 101,
        rolls: [createRoll({ playerTurnId: 101, dice: dice([2, 3, 6]) })],
      },
    ]);

    const result = mapRound(round, turns, rolls);
    expect(result.turns[0].isComplete).toBe(true);
    expect(result.turns[1].isComplete).toBe(false);
  });

  // ── startingParticipantId ─────────────────────────────────────────────────

  test("startingParticipantId is first in playerOrder", () => {
    const round = createRound({
      id: 1,
      playerOrder: [30, 10, 20],
    });
    const result = mapRound(round, [], new Map());
    expect(result.startingParticipantId).toBe(30);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// mapGame
// ═══════════════════════════════════════════════════════════════════════════════

describe("mapGame", () => {
  test("status is 'waiting' when no rounds", () => {
    const session = createSession({ id: 1, completedAt: null });
    const participants = [
      createParticipant({ gameSessionId: 1 }),
      createParticipant({ gameSessionId: 1 }),
    ];

    const result = mapGame(
      session,
      participants,
      [],
      new Map(),
      new Map(),
    );
    expect(result.status).toBe("waiting");
    expect(result.startedAt).toBeNull();
  });

  test("status is 'in_progress' when rounds exist but not completed", () => {
    const session = createSession({ id: 1, completedAt: null });
    const participants = [
      createParticipant({ id: 10, gameSessionId: 1 }),
      createParticipant({ id: 20, gameSessionId: 1 }),
    ];
    const roundStartedAt = new Date("2025-06-15T12:00:00Z");
    const round = createRound({
      id: 100,
      gameSessionId: 1,
      playerOrder: [10, 20],
      startedAt: roundStartedAt,
    });

    const result = mapGame(
      session,
      participants,
      [round],
      new Map(),
      new Map(),
    );
    expect(result.status).toBe("in_progress");
    expect(result.startedAt).toEqual(roundStartedAt);
  });

  test("status is 'completed' when session has completedAt", () => {
    const completedAt = new Date("2025-06-15T15:00:00Z");
    const session = createSession({ id: 1, completedAt });
    const participants = [
      createParticipant({ id: 10, gameSessionId: 1 }),
    ];
    const round = createRound({
      id: 100,
      gameSessionId: 1,
      playerOrder: [10],
    });

    const result = mapGame(
      session,
      participants,
      [round],
      new Map(),
      new Map(),
    );
    expect(result.status).toBe("completed");
  });

  test("rounds are mapped through mapRound", () => {
    const session = createSession({ id: 1 });
    const participants = [
      createParticipant({ id: 10, gameSessionId: 1 }),
      createParticipant({ id: 20, gameSessionId: 1 }),
    ];
    const round = createRound({
      id: 100,
      gameSessionId: 1,
      playerOrder: [10, 20],
    });
    const now = new Date();
    const turn = createTurn({
      id: 200,
      gameSessionId: 1,
      roundId: 100,
      participantId: 10,
      turnOrder: 0,
      endedAt: now,
    });
    const roll = createRoll({
      id: 300,
      gameSessionId: 1,
      playerTurnId: 200,
      rollNumber: 1,
      dice: dice([3, 3, 3]),
    });

    const turnsByRoundId = new Map([[100, [turn]]]);
    const rollsByTurnId = new Map([[200, [roll]]]);

    const result = mapGame(
      session,
      participants,
      [round],
      turnsByRoundId,
      rollsByTurnId,
    );
    expect(result.rounds).toHaveLength(1);
    expect(result.rounds[0].turns).toHaveLength(1);
    expect(result.rounds[0].turns[0].specialRollType).toBe("three_of_a_kind");
  });

  test("participants are passed through unchanged", () => {
    const session = createSession({ id: 1 });
    const p1 = createParticipant({ id: 10, guestName: "Alice" });
    const p2 = createParticipant({ id: 20, guestName: "Bob" });

    const result = mapGame(session, [p1, p2], [], new Map(), new Map());
    expect(result.participants).toHaveLength(2);
    expect(result.participants[0].guestName).toBe("Alice");
    expect(result.participants[1].guestName).toBe("Bob");
  });

  test("startedAt from first round's startedAt", () => {
    const roundStart = new Date("2025-01-15T10:00:00Z");
    const session = createSession({ id: 1 });
    const round1 = createRound({
      id: 100,
      gameSessionId: 1,
      roundNumber: 1,
      playerOrder: [10],
      startedAt: roundStart,
    });
    const round2 = createRound({
      id: 101,
      gameSessionId: 1,
      roundNumber: 2,
      playerOrder: [10],
      startedAt: new Date("2025-01-15T11:00:00Z"),
    });

    const result = mapGame(
      session,
      [],
      [round1, round2],
      new Map(),
      new Map(),
    );
    expect(result.startedAt).toEqual(roundStart);
  });
});
