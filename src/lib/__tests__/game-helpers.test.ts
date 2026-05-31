import { describe, expect, test } from "bun:test";
import {
  computeParticipantStats,
  formatNamesList,
  isLeaderParticipantStats,
  isTrailerParticipantStats,
  sortParticipantStats,
} from "@/lib/game-helpers";
import type { GameModel, ParticipantStats } from "@/lib/models";
import {
  countActiveForNextRound,
  isParticipantActiveForNextRound,
  isParticipantInRound,
} from "@/lib/roster";
import { createParticipant, createRound, resetIds } from "./test-helpers";

describe("formatNamesList", () => {
  test("empty array returns null", () => {
    expect(formatNamesList([])).toBeNull();
  });
});

describe("isParticipantInRound", () => {
  test("original roster plays from round 1", () => {
    const p = createParticipant({ firstRoundNumber: null });
    expect(isParticipantInRound(p, 1)).toBe(true);
    expect(isParticipantInRound(p, 3)).toBe(true);
  });

  test("late joiner starts at firstRoundNumber", () => {
    const p = createParticipant({ firstRoundNumber: 3 });
    expect(isParticipantInRound(p, 2)).toBe(false);
    expect(isParticipantInRound(p, 3)).toBe(true);
  });

  test("retired player excluded after retiredAfterRoundNumber", () => {
    const p = createParticipant({ retiredAfterRoundNumber: 2 });
    expect(isParticipantInRound(p, 2)).toBe(true);
    expect(isParticipantInRound(p, 3)).toBe(false);
  });
});

describe("isParticipantActiveForNextRound", () => {
  test("counts only players eligible for next round", () => {
    const participants = [
      createParticipant({ id: 1 }),
      createParticipant({ id: 2, firstRoundNumber: 3 }),
      createParticipant({ id: 3, retiredAfterRoundNumber: 2 }),
    ];
    expect(countActiveForNextRound(participants, 2)).toBe(2);
    expect(isParticipantActiveForNextRound(participants[0], 2)).toBe(true);
    expect(isParticipantActiveForNextRound(participants[1], 2)).toBe(true);
    expect(isParticipantActiveForNextRound(participants[2], 2)).toBe(false);
  });
});

function stat(
  id: number,
  roundsWon: number,
  sipsDrunk: number,
): ParticipantStats {
  return {
    participantId: id,
    roundsWon,
    roundsLost: 0,
    sipsDrunk,
    sipsAwarded: 0,
    sipsReceived: 0,
    threeOfAKindCount: 0,
    stairsCount: 0,
    superStairsCount: 0,
    shitStairsCount: 0,
    lowestScoreCount: 0,
    lowestScoreSipsDrunk: 0,
    tiebreakerWins: 0,
  };
}

describe("leaderboard designation helpers", () => {
  test("no leader or trailer at 0/0", () => {
    const sorted = sortParticipantStats([
      stat(1, 0, 0),
      stat(2, 0, 0),
      stat(3, 0, 0),
    ]);
    for (const s of sorted) {
      expect(isLeaderParticipantStats(s, sorted)).toBe(false);
      expect(isTrailerParticipantStats(s, sorted)).toBe(false);
    }
  });

  test("trailer only when someone is strictly ahead", () => {
    const sorted = sortParticipantStats([
      stat(1, 2, 1),
      stat(2, 0, 5),
      stat(3, 0, 5),
    ]);
    expect(isTrailerParticipantStats(sorted[2], sorted)).toBe(true);
    expect(isTrailerParticipantStats(sorted[1], sorted)).toBe(true);
    expect(isTrailerParticipantStats(sorted[0], sorted)).toBe(false);
  });
});

describe("computeParticipantStats", () => {
  test("late joiner does not get lowest-roll sips from earlier rounds", () => {
    resetIds();
    const p1 = createParticipant({ id: 1, guestName: "A" });
    const p2 = createParticipant({
      id: 2,
      guestName: "B",
      firstRoundNumber: 2,
    });

    const session = {
      id: 1,
      ownerId: "local",
      password: "",
      config: { name: "Test", randomTurnOrder: false },
      createdAt: new Date(),
      completedAt: null,
      status: "in_progress" as const,
      startedAt: new Date(),
      participants: [p1, p2],
      rounds: [
        {
          ...createRound({ roundNumber: 1, playerOrder: [1] }),
          turns: [
            {
              id: 1,
              gameSessionId: 1,
              roundId: 1,
              participantId: 1,
              turnOrder: 0,
              endedAt: new Date(),
              sipsAwardedTo: null,
              rolls: [
                {
                  id: 1,
                  gameSessionId: 1,
                  playerTurnId: 1,
                  rollNumber: 1,
                  dice: [
                    { value: 2, kept: false },
                    { value: 2, kept: false },
                    { value: 3, kept: false },
                  ],
                  rolledAt: new Date(),
                  score: 7,
                  specialRollType: "lowest" as const,
                },
              ],
              totalRollsUsed: 1,
              finalScore: 7,
              isSafe: false,
              specialRollType: "lowest" as const,
              completedAt: new Date(),
              isComplete: true,
            },
          ],
          status: "completed" as const,
          startingParticipantId: 1,
          maxRollsAllowed: 3,
          currentPenaltySips: 1,
          finalPenaltySips: null,
          losingParticipantIds: [],
          completedAt: new Date(),
          falseStart: false,
          allSafe: true,
        },
      ],
    } satisfies GameModel;

    const stats = computeParticipantStats(session);
    const s1 = stats.find((s) => s.participantId === 1);
    const s2 = stats.find((s) => s.participantId === 2);

    expect(s1?.lowestScoreCount).toBe(1);
    expect(s1?.sipsDrunk).toBe(1);
    expect(s2?.lowestScoreCount).toBe(0);
    expect(s2?.sipsDrunk).toBe(0);
  });
});
