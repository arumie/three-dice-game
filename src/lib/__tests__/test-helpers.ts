import type {
  Dice,
  SelectGameSession,
  SelectPlayerTurn,
  SelectRoll,
  SelectRound,
} from "@/db/schema";
import type { ParticipantWithPlayer } from "@/lib/models";

// ── Dice shorthand ──────────────────────────────────────────────────────────

/** Create a Dice array from plain values, all marked as not-kept. */
export function dice(values: number[]): Dice {
  return values.map((value) => ({ value, kept: false }));
}

/** Create a Dice array with kept flags specified per die. */
export function diceWithKept(
  entries: { value: number; kept: boolean }[],
): Dice {
  return entries;
}

// ── Auto-incrementing IDs ───────────────────────────────────────────────────

let nextId = 1;
export function resetIds() {
  nextId = 1;
}
function autoId() {
  return nextId++;
}

// ── Factory: SelectRoll ─────────────────────────────────────────────────────

const DEFAULT_DATE = new Date("2025-01-01T12:00:00Z");

export function createRoll(overrides: Partial<SelectRoll> = {}): SelectRoll {
  return {
    id: autoId(),
    gameSessionId: 1,
    playerTurnId: 1,
    rollNumber: 1,
    dice: dice([1, 2, 3]),
    rolledAt: DEFAULT_DATE,
    ...overrides,
  };
}

// ── Factory: SelectPlayerTurn ───────────────────────────────────────────────

export function createTurn(
  overrides: Partial<SelectPlayerTurn> = {},
): SelectPlayerTurn {
  return {
    id: autoId(),
    gameSessionId: 1,
    roundId: 1,
    participantId: 1,
    turnOrder: 0,
    endedAt: null,
    sipsAwardedTo: null,
    ...overrides,
  };
}

// ── Factory: SelectRound ────────────────────────────────────────────────────

export function createRound(overrides: Partial<SelectRound> = {}): SelectRound {
  return {
    id: autoId(),
    gameSessionId: 1,
    roundNumber: 1,
    playerOrder: [1, 2, 3],
    startedAt: DEFAULT_DATE,
    carryOverSips: 0,
    carryOverMaxRolls: null,
    ...overrides,
  };
}

// ── Factory: SelectGameSession ──────────────────────────────────────────────

export function createSession(
  overrides: Partial<SelectGameSession> = {},
): SelectGameSession {
  return {
    id: autoId(),
    ownerId: "owner-1",
    password: "",
    config: { name: "Test Game", randomTurnOrder: false },
    createdAt: DEFAULT_DATE,
    completedAt: null,
    ...overrides,
  };
}

// ── Factory: ParticipantWithPlayer ──────────────────────────────────────────

export function createParticipant(
  overrides: Partial<ParticipantWithPlayer> = {},
): ParticipantWithPlayer {
  return {
    id: autoId(),
    gameSessionId: 1,
    playerId: null,
    guestId: null,
    playerType: "guest",
    guestName: `Player ${nextId}`,
    joinedAt: DEFAULT_DATE,
    playerUsername: null,
    ...overrides,
  };
}
