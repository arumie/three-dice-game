import { describe, expect, test } from "bun:test";
import {
  calculatePenaltyFromTurns,
  calculateScore,
  createPlayerOrder,
  createRollWithKept,
  detectSpecialRoll,
  findLosersFromTurns,
  getFalseStartPenalty,
  getMaxRollsFromFirstTurn,
  getStartingParticipant,
  getThreeOfAKindSips,
  isRoundCompleteFromData,
  isSafeRoll,
  rollDice,
  shuffleArray,
  violatesGentlemanRule,
} from "@/lib/game-utils";
import type { PlayerTurnModel, RollModel } from "@/lib/models";
import { dice } from "./test-helpers";

// ─── helpers for building minimal PlayerTurnModel stubs ─────────────────────

function stubTurnModel(
  overrides: Partial<PlayerTurnModel> & { participantId: number },
): PlayerTurnModel {
  return {
    id: 1,
    gameSessionId: 1,
    roundId: 1,
    turnOrder: 0,
    endedAt: new Date(),
    sipsAwardedTo: null,
    rolls: [],
    totalRollsUsed: 0,
    finalScore: null,
    isSafe: false,
    specialRollType: "none",
    completedAt: new Date(),
    isComplete: true,
    ...overrides,
  };
}

function stubRollModel(
  diceValues: number[],
  overrides: Partial<RollModel> = {},
): RollModel {
  return {
    id: 1,
    gameSessionId: 1,
    playerTurnId: 1,
    rollNumber: 1,
    dice: dice(diceValues),
    rolledAt: new Date(),
    score: calculateScore(dice(diceValues)),
    specialRollType: detectSpecialRoll(dice(diceValues)),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// calculateScore
// ═══════════════════════════════════════════════════════════════════════════════

describe("calculateScore", () => {
  test("individual dice values", () => {
    expect(calculateScore(dice([1]))).toBe(100);
    expect(calculateScore(dice([2]))).toBe(2);
    expect(calculateScore(dice([3]))).toBe(3);
    expect(calculateScore(dice([4]))).toBe(4);
    expect(calculateScore(dice([5]))).toBe(5);
    expect(calculateScore(dice([6]))).toBe(60);
  });

  test("[1, 2, 4] = 106 (from game rules example)", () => {
    expect(calculateScore(dice([1, 2, 4]))).toBe(106);
  });

  test("[2, 3, 5] = 10", () => {
    expect(calculateScore(dice([2, 3, 5]))).toBe(10);
  });

  test("[2, 4, 6] = 66", () => {
    expect(calculateScore(dice([2, 4, 6]))).toBe(66);
  });

  test("[1, 1, 5] = 205", () => {
    expect(calculateScore(dice([1, 1, 5]))).toBe(205);
  });

  test("[2, 2, 3] = 7 (lowest possible)", () => {
    expect(calculateScore(dice([2, 2, 3]))).toBe(7);
  });

  test("[6, 6, 6] = 180 (three sixes)", () => {
    expect(calculateScore(dice([6, 6, 6]))).toBe(180);
  });

  test("[1, 1, 1] = 300 (three ones)", () => {
    expect(calculateScore(dice([1, 1, 1]))).toBe(300);
  });

  test("[4, 5, 6] = 69", () => {
    expect(calculateScore(dice([4, 5, 6]))).toBe(69);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// detectSpecialRoll
// ═══════════════════════════════════════════════════════════════════════════════

describe("detectSpecialRoll", () => {
  describe("three_of_a_kind", () => {
    test.each([1, 2, 3, 4, 5, 6])("three %ds", (v) => {
      expect(detectSpecialRoll(dice([v, v, v]))).toBe("three_of_a_kind");
    });

    test("order does not matter", () => {
      expect(detectSpecialRoll(dice([3, 3, 3]))).toBe("three_of_a_kind");
    });
  });

  describe("stairs", () => {
    test("[1, 2, 3]", () => {
      expect(detectSpecialRoll(dice([1, 2, 3]))).toBe("stairs");
    });

    test("[3, 1, 2] - order does not matter", () => {
      expect(detectSpecialRoll(dice([3, 1, 2]))).toBe("stairs");
    });
  });

  describe("super_stairs", () => {
    test("[4, 5, 6]", () => {
      expect(detectSpecialRoll(dice([4, 5, 6]))).toBe("super_stairs");
    });

    test("[6, 4, 5] - order does not matter", () => {
      expect(detectSpecialRoll(dice([6, 4, 5]))).toBe("super_stairs");
    });
  });

  describe("shit_stairs", () => {
    test("[2, 3, 4]", () => {
      expect(detectSpecialRoll(dice([2, 3, 4]))).toBe("shit_stairs");
    });

    test("[3, 4, 5]", () => {
      expect(detectSpecialRoll(dice([3, 4, 5]))).toBe("shit_stairs");
    });

    test("[4, 2, 3] - order does not matter", () => {
      expect(detectSpecialRoll(dice([4, 2, 3]))).toBe("shit_stairs");
    });
  });

  describe("lowest", () => {
    test("[2, 2, 3] = 7 points", () => {
      expect(detectSpecialRoll(dice([2, 2, 3]))).toBe("lowest");
    });

    test("[3, 2, 2] - order does not matter", () => {
      expect(detectSpecialRoll(dice([3, 2, 2]))).toBe("lowest");
    });
  });

  describe("none", () => {
    test("[1, 4, 5] - normal roll", () => {
      expect(detectSpecialRoll(dice([1, 4, 5]))).toBe("none");
    });

    test("[2, 5, 6] - normal roll", () => {
      expect(detectSpecialRoll(dice([2, 5, 6]))).toBe("none");
    });

    test("[1, 1, 6] - high but not special", () => {
      expect(detectSpecialRoll(dice([1, 1, 6]))).toBe("none");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// isSafeRoll
// ═══════════════════════════════════════════════════════════════════════════════

describe("isSafeRoll", () => {
  test("three_of_a_kind is safe", () => {
    expect(isSafeRoll("three_of_a_kind")).toBe(true);
  });

  test("stairs is safe", () => {
    expect(isSafeRoll("stairs")).toBe(true);
  });

  test("super_stairs is safe", () => {
    expect(isSafeRoll("super_stairs")).toBe(true);
  });

  test("shit_stairs is NOT safe", () => {
    expect(isSafeRoll("shit_stairs")).toBe(false);
  });

  test("lowest is NOT safe", () => {
    expect(isSafeRoll("lowest")).toBe(false);
  });

  test("none is NOT safe", () => {
    expect(isSafeRoll("none")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getThreeOfAKindSips
// ═══════════════════════════════════════════════════════════════════════════════

describe("getThreeOfAKindSips", () => {
  test("three 1s gives 7 sips", () => {
    expect(getThreeOfAKindSips(1)).toBe(7);
  });

  test.each([2, 3, 4, 5, 6])("three %ds gives %d sips", (v) => {
    expect(getThreeOfAKindSips(v)).toBe(v);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getFalseStartPenalty
// ═══════════════════════════════════════════════════════════════════════════════

describe("getFalseStartPenalty", () => {
  test("three_of_a_kind of 1s returns 7", () => {
    const turn = stubTurnModel({
      participantId: 1,
      turnOrder: 0,
      specialRollType: "three_of_a_kind",
      rolls: [stubRollModel([1, 1, 1])],
    });
    expect(getFalseStartPenalty(turn)).toBe(7);
  });

  test("three_of_a_kind of 4s returns 4", () => {
    const turn = stubTurnModel({
      participantId: 1,
      turnOrder: 0,
      specialRollType: "three_of_a_kind",
      rolls: [stubRollModel([4, 4, 4])],
    });
    expect(getFalseStartPenalty(turn)).toBe(4);
  });

  test("stairs with turnOrder 0 returns 1", () => {
    const turn = stubTurnModel({
      participantId: 1,
      turnOrder: 0,
      specialRollType: "stairs",
      rolls: [stubRollModel([1, 2, 3])],
    });
    expect(getFalseStartPenalty(turn)).toBe(1);
  });

  test("non-special roll returns 0", () => {
    const turn = stubTurnModel({
      participantId: 1,
      turnOrder: 0,
      specialRollType: "none",
      rolls: [stubRollModel([1, 4, 5])],
    });
    expect(getFalseStartPenalty(turn)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// rollDice
// ═══════════════════════════════════════════════════════════════════════════════

describe("rollDice", () => {
  test("defaults to 3 dice", () => {
    expect(rollDice()).toHaveLength(3);
  });

  test("respects custom count", () => {
    expect(rollDice(1)).toHaveLength(1);
    expect(rollDice(5)).toHaveLength(5);
  });

  test("all values between 1 and 6", () => {
    // Roll many times to check bounds
    for (let i = 0; i < 50; i++) {
      for (const value of rollDice(3)) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// createRollWithKept
// ═══════════════════════════════════════════════════════════════════════════════

describe("createRollWithKept", () => {
  test("kept dice retain their value and are marked kept", () => {
    const prev = dice([1, 5, 3]);
    const result = createRollWithKept(prev, [1]); // reroll index 1 only
    expect(result[0]).toEqual({ value: 1, kept: true });
    expect(result[2]).toEqual({ value: 3, kept: true });
    expect(result[1].kept).toBe(false);
    expect(result[1].value).toBeGreaterThanOrEqual(1);
    expect(result[1].value).toBeLessThanOrEqual(6);
  });

  test("rerolling all dice marks none as kept", () => {
    const prev = dice([1, 2, 3]);
    const result = createRollWithKept(prev, [0, 1, 2]);
    for (const d of result) {
      expect(d.kept).toBe(false);
    }
  });

  test("rerolling no dice marks all as kept", () => {
    const prev = dice([4, 5, 6]);
    const result = createRollWithKept(prev, []);
    expect(result).toEqual([
      { value: 4, kept: true },
      { value: 5, kept: true },
      { value: 6, kept: true },
    ]);
  });

  test("returns same length as input", () => {
    const prev = dice([1, 2, 3]);
    expect(createRollWithKept(prev, [0, 2])).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getStartingParticipant
// ═══════════════════════════════════════════════════════════════════════════════

describe("getStartingParticipant", () => {
  test("returns first element of player order", () => {
    expect(getStartingParticipant([5, 2, 3])).toBe(5);
  });

  test("works with single player", () => {
    expect(getStartingParticipant([42])).toBe(42);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// isRoundCompleteFromData
// ═══════════════════════════════════════════════════════════════════════════════

describe("isRoundCompleteFromData", () => {
  test("complete when turnCount equals player count", () => {
    expect(isRoundCompleteFromData([1, 2, 3], 3)).toBe(true);
  });

  test("not complete when fewer turns than players", () => {
    expect(isRoundCompleteFromData([1, 2, 3], 2)).toBe(false);
  });

  test("not complete when zero turns", () => {
    expect(isRoundCompleteFromData([1, 2, 3, 4], 0)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getMaxRollsFromFirstTurn
// ═══════════════════════════════════════════════════════════════════════════════

describe("getMaxRollsFromFirstTurn", () => {
  test("returns roll count when rolls exist", () => {
    expect(
      getMaxRollsFromFirstTurn([{ rollNumber: 1 }, { rollNumber: 2 }]),
    ).toBe(2);
  });

  test("returns 3 for a single roll", () => {
    expect(getMaxRollsFromFirstTurn([{ rollNumber: 1 }])).toBe(1);
  });

  test("returns 3 when no rolls (empty array)", () => {
    expect(getMaxRollsFromFirstTurn([])).toBe(3);
  });

  test("returns 3 for three rolls", () => {
    expect(
      getMaxRollsFromFirstTurn([
        { rollNumber: 1 },
        { rollNumber: 2 },
        { rollNumber: 3 },
      ]),
    ).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// calculatePenaltyFromTurns
// ═══════════════════════════════════════════════════════════════════════════════

describe("calculatePenaltyFromTurns", () => {
  test("base penalty is 1 sip with no specials", () => {
    const turns = [
      stubTurnModel({
        participantId: 1,
        specialRollType: "none",
        rolls: [stubRollModel([1, 4, 5])],
      }),
    ];
    expect(calculatePenaltyFromTurns(turns)).toBe(1);
  });

  test("three_of_a_kind of 3s adds 3 sips to base", () => {
    const turns = [
      stubTurnModel({
        participantId: 1,
        specialRollType: "three_of_a_kind",
        rolls: [stubRollModel([3, 3, 3])],
      }),
    ];
    expect(calculatePenaltyFromTurns(turns)).toBe(4); // 1 + 3
  });

  test("multiple three_of_a_kinds accumulate", () => {
    const turns = [
      stubTurnModel({
        participantId: 1,
        specialRollType: "three_of_a_kind",
        rolls: [stubRollModel([3, 3, 3])],
      }),
      stubTurnModel({
        participantId: 2,
        specialRollType: "three_of_a_kind",
        rolls: [stubRollModel([6, 6, 6])],
      }),
    ];
    expect(calculatePenaltyFromTurns(turns)).toBe(10); // 1 + 3 + 6
  });

  test("three_of_a_kind of 1s adds 7 sips", () => {
    const turns = [
      stubTurnModel({
        participantId: 1,
        specialRollType: "three_of_a_kind",
        rolls: [stubRollModel([1, 1, 1])],
      }),
    ];
    expect(calculatePenaltyFromTurns(turns)).toBe(8); // 1 + 7
  });

  test("non-three_of_a_kind specials do not add sips", () => {
    const turns = [
      stubTurnModel({
        participantId: 1,
        specialRollType: "stairs",
        rolls: [stubRollModel([1, 2, 3])],
      }),
      stubTurnModel({
        participantId: 2,
        specialRollType: "shit_stairs",
        rolls: [stubRollModel([2, 3, 4])],
      }),
    ];
    expect(calculatePenaltyFromTurns(turns)).toBe(1);
  });

  test("uses last roll dice value for three_of_a_kind with multiple rolls", () => {
    const turns = [
      stubTurnModel({
        participantId: 1,
        specialRollType: "three_of_a_kind",
        rolls: [
          stubRollModel([2, 3, 5]),
          stubRollModel([5, 5, 5]), // last roll is three 5s
        ],
      }),
    ];
    expect(calculatePenaltyFromTurns(turns)).toBe(6); // 1 + 5
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// findLosersFromTurns
// ═══════════════════════════════════════════════════════════════════════════════

describe("findLosersFromTurns", () => {
  test("returns participant with lowest score", () => {
    const turns = [
      stubTurnModel({ participantId: 1, finalScore: 50, isSafe: false }),
      stubTurnModel({ participantId: 2, finalScore: 10, isSafe: false }),
      stubTurnModel({ participantId: 3, finalScore: 100, isSafe: false }),
    ];
    expect(findLosersFromTurns(turns)).toEqual([2]);
  });

  test("returns empty array when all players are safe", () => {
    const turns = [
      stubTurnModel({ participantId: 1, isSafe: true }),
      stubTurnModel({ participantId: 2, isSafe: true }),
    ];
    expect(findLosersFromTurns(turns)).toEqual([]);
  });

  test("returns multiple participants on tied lowest score", () => {
    const turns = [
      stubTurnModel({ participantId: 1, finalScore: 10, isSafe: false }),
      stubTurnModel({ participantId: 2, finalScore: 10, isSafe: false }),
      stubTurnModel({ participantId: 3, finalScore: 50, isSafe: false }),
    ];
    expect(findLosersFromTurns(turns)).toEqual([1, 2]);
  });

  test("ignores safe players when finding loser", () => {
    const turns = [
      stubTurnModel({ participantId: 1, finalScore: null, isSafe: true }),
      stubTurnModel({ participantId: 2, finalScore: 100, isSafe: false }),
      stubTurnModel({ participantId: 3, finalScore: 10, isSafe: false }),
    ];
    expect(findLosersFromTurns(turns)).toEqual([3]);
  });

  test("single unsafe player is the loser", () => {
    const turns = [
      stubTurnModel({ participantId: 1, isSafe: true }),
      stubTurnModel({ participantId: 2, finalScore: 50, isSafe: false }),
      stubTurnModel({ participantId: 3, isSafe: true }),
    ];
    expect(findLosersFromTurns(turns)).toEqual([2]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// shuffleArray
// ═══════════════════════════════════════════════════════════════════════════════

describe("shuffleArray", () => {
  test("returns array of same length", () => {
    expect(shuffleArray([1, 2, 3, 4])).toHaveLength(4);
  });

  test("contains the same elements", () => {
    const input = [10, 20, 30, 40, 50];
    const result = shuffleArray(input);
    expect(result.sort((a, b) => a - b)).toEqual(
      input.sort((a, b) => a - b),
    );
  });

  test("does not mutate the original array", () => {
    const input = [1, 2, 3, 4];
    const copy = [...input];
    shuffleArray(input);
    expect(input).toEqual(copy);
  });

  test("empty array returns empty array", () => {
    expect(shuffleArray([])).toEqual([]);
  });

  test("single element returns same element", () => {
    expect(shuffleArray([42])).toEqual([42]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// createPlayerOrder
// ═══════════════════════════════════════════════════════════════════════════════

describe("createPlayerOrder", () => {
  test("circular rotation: starter 3 from [1,2,3,4] gives [3,4,1,2]", () => {
    expect(createPlayerOrder(3, [1, 2, 3, 4], false)).toEqual([3, 4, 1, 2]);
  });

  test("starter is already first — no rotation needed", () => {
    expect(createPlayerOrder(1, [1, 2, 3, 4], false)).toEqual([1, 2, 3, 4]);
  });

  test("starter is last — full rotation", () => {
    expect(createPlayerOrder(4, [1, 2, 3, 4], false)).toEqual([4, 1, 2, 3]);
  });

  test("fallback when starter ID not found", () => {
    const result = createPlayerOrder(99, [1, 2, 3], false);
    expect(result[0]).toBe(99);
    expect(result).toContain(1);
    expect(result).toContain(2);
    expect(result).toContain(3);
    expect(result).toHaveLength(4);
  });

  test("shuffled order: starter is always first", () => {
    const result = createPlayerOrder(3, [1, 2, 3, 4], true);
    expect(result[0]).toBe(3);
    expect(result).toHaveLength(4);
    expect(result.sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  test("two players — rotation works", () => {
    expect(createPlayerOrder(2, [1, 2], false)).toEqual([2, 1]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// violatesGentlemanRule
// ═══════════════════════════════════════════════════════════════════════════════

describe("violatesGentlemanRule", () => {
  // Base case: last player, not safe, has rolls, score above lowest
  const violating = {
    isLastPlayer: true,
    isSafe: false,
    hasRollsRemaining: true,
    currentScore: 260, // e.g. [1, 1, 6]
    lowestScoreToBeat: 11, // e.g. [2, 4, 5]
  };

  test("returns true when last player has high score and rolls remaining", () => {
    expect(violatesGentlemanRule(violating)).toBe(true);
  });

  test("returns false when not the last player", () => {
    expect(violatesGentlemanRule({ ...violating, isLastPlayer: false })).toBe(false);
  });

  test("returns false when player is safe (special roll)", () => {
    expect(violatesGentlemanRule({ ...violating, isSafe: true })).toBe(false);
  });

  test("returns false when no rolls remaining", () => {
    expect(violatesGentlemanRule({ ...violating, hasRollsRemaining: false })).toBe(false);
  });

  test("returns false when current score is below score to beat", () => {
    expect(violatesGentlemanRule({ ...violating, currentScore: 8 })).toBe(false);
  });

  test("returns false when current score equals score to beat (can still lose)", () => {
    expect(violatesGentlemanRule({ ...violating, currentScore: 11 })).toBe(false);
  });

  test("returns false when current score is null (no roll yet)", () => {
    expect(violatesGentlemanRule({ ...violating, currentScore: null })).toBe(false);
  });

  test("returns false when lowestScoreToBeat is null (no other non-safe players)", () => {
    expect(violatesGentlemanRule({ ...violating, lowestScoreToBeat: null })).toBe(false);
  });

  test("returns true when score is just 1 above the lowest", () => {
    expect(violatesGentlemanRule({ ...violating, currentScore: 12, lowestScoreToBeat: 11 })).toBe(true);
  });

  test("game rules example: [1,1,6]=260 vs lowest 11 — violates", () => {
    expect(violatesGentlemanRule({
      isLastPlayer: true,
      isSafe: false,
      hasRollsRemaining: true,
      currentScore: calculateScore(dice([1, 1, 6])), // 260
      lowestScoreToBeat: calculateScore(dice([2, 4, 5])), // 11
    })).toBe(true);
  });

  test("game rules example: score can lose — does not violate", () => {
    expect(violatesGentlemanRule({
      isLastPlayer: true,
      isSafe: false,
      hasRollsRemaining: true,
      currentScore: calculateScore(dice([2, 3, 5])), // 10
      lowestScoreToBeat: calculateScore(dice([2, 4, 5])), // 11
    })).toBe(false);
  });
});
