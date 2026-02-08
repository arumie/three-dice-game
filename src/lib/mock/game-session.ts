import type {
	GameModel,
	ParticipantStats,
	PlayerTurnModel,
	RollModel,
	RoundModel,
} from "@/lib/models";

export const FAKE_GAME_SESSION_ID = 1;

// ── Dice value scoring (1=100, 6=60, rest face value) ───────────────────────

function diceScore(value: number): number {
	if (value === 1) return 100;
	if (value === 6) return 60;
	return value;
}

function totalScore(dice: { value: number; kept: boolean }[]): number {
	return dice.reduce((sum, d) => sum + diceScore(d.value), 0);
}

// ── Helper to build mock rolls ──────────────────────────────────────────────

function roll(
	id: number,
	playerTurnId: number,
	rollNumber: number,
	dice: { value: number; kept: boolean }[],
	specialRollType: "none" | "three_of_a_kind" | "stairs" | "super_stairs" | "shit_stairs" = "none",
): RollModel {
	return {
		id,
		gameSessionId: FAKE_GAME_SESSION_ID,
		playerTurnId,
		rollNumber,
		dice,
		rolledAt: new Date(),
		score: totalScore(dice),
		specialRollType,
	};
}

// ── Helper to build mock turns ──────────────────────────────────────────────

function turn(
	id: number,
	roundId: number,
	participantId: number,
	turnOrder: number,
	rolls: RollModel[],
	opts: {
		isSafe: boolean;
		specialRollType?: "none" | "three_of_a_kind" | "stairs" | "super_stairs" | "shit_stairs";
		completed?: boolean;
	},
): PlayerTurnModel {
	const lastRoll = rolls[rolls.length - 1];
	const isCompleted = opts.completed !== false;
	return {
		id,
		gameSessionId: FAKE_GAME_SESSION_ID,
		roundId,
		participantId,
		turnOrder,
		rolls,
		totalRollsUsed: rolls.length,
		finalScore: isCompleted ? lastRoll.score : null,
		isSafe: opts.isSafe,
		specialRollType: opts.specialRollType ?? "none",
		completedAt: new Date(),
	};
}

// ── Shared participants ─────────────────────────────────────────────────────

const PARTICIPANTS = [
	{
		id: 1,
		gameSessionId: FAKE_GAME_SESSION_ID,
		playerId: null,
		playerType: "guest" as const,
		guestName: "Alice",
		joinedAt: new Date(),
	},
	{
		id: 2,
		gameSessionId: FAKE_GAME_SESSION_ID,
		playerId: null,
		playerType: "guest" as const,
		guestName: "Bob",
		joinedAt: new Date(),
	},
	{
		id: 3,
		gameSessionId: FAKE_GAME_SESSION_ID,
		playerId: null,
		playerType: "guest" as const,
		guestName: "Charlie",
		joinedAt: new Date(),
	},
];

// ── Shared completed rounds (history) ───────────────────────────────────────

// Round 1: Alice 9, Bob 9, Charlie 7 → Charlie loses
// (no 1s or 6s here, so scores are simple sums)
const round1: RoundModel = {
	id: 1,
	gameSessionId: FAKE_GAME_SESSION_ID,
	roundNumber: 1,
	playerOrder: [1, 2, 3],
	startedAt: new Date(),
	turns: [
		// Alice: [4,3,2] = 9
		turn(1, 1, 1, 0, [
			roll(1, 1, 1, [
				{ value: 4, kept: true },
				{ value: 3, kept: true },
				{ value: 2, kept: true },
			]),
		], { isSafe: false }),
		// Bob: [2,2,5] = 9
		turn(2, 1, 2, 1, [
			roll(2, 2, 1, [
				{ value: 2, kept: true },
				{ value: 2, kept: true },
				{ value: 5, kept: true },
			]),
		], { isSafe: false }),
		// Charlie: [3,4,2]=9 → re-rolls all → [2,3,2]=7, loses
		turn(3, 1, 3, 2, [
			roll(3, 3, 1, [
				{ value: 3, kept: false },
				{ value: 4, kept: false },
				{ value: 2, kept: false },
			]),
			roll(4, 3, 2, [
				{ value: 2, kept: true },
				{ value: 3, kept: true },
				{ value: 2, kept: true },
			]),
		], { isSafe: false }),
	],
	status: "completed",
	startingParticipantId: 1,
	maxRollsAllowed: 3,
	currentPenaltySips: 2,
	finalPenaltySips: 2,
	losingParticipantId: 3,
	completedAt: new Date(),
};

// Round 2: Bob rolls stairs [1,2,3]=105 (safe), Charlie rolls three 5s=15 (safe), Alice loses with 10
const round2: RoundModel = {
	id: 2,
	gameSessionId: FAKE_GAME_SESSION_ID,
	roundNumber: 2,
	playerOrder: [2, 3, 1],
	startedAt: new Date(),
	turns: [
		// Bob: stairs [1,2,3] = 105, safe
		turn(4, 2, 2, 0, [
			roll(5, 4, 1, [
				{ value: 1, kept: true },
				{ value: 2, kept: true },
				{ value: 3, kept: true },
			], "stairs"),
		], { isSafe: true, specialRollType: "stairs" }),
		// Charlie: three of a kind [5,5,5] = 15, safe
		turn(5, 2, 3, 1, [
			roll(6, 5, 1, [
				{ value: 5, kept: true },
				{ value: 5, kept: true },
				{ value: 5, kept: true },
			], "three_of_a_kind"),
		], { isSafe: true, specialRollType: "three_of_a_kind" }),
		// Alice: [2,4,3]=9 → re-rolls → [3,5,2]=10, loses (only non-safe player)
		turn(6, 2, 1, 2, [
			roll(7, 6, 1, [
				{ value: 2, kept: false },
				{ value: 4, kept: false },
				{ value: 3, kept: false },
			]),
			roll(8, 6, 2, [
				{ value: 3, kept: true },
				{ value: 5, kept: true },
				{ value: 2, kept: true },
			]),
		], { isSafe: false }),
	],
	status: "completed",
	startingParticipantId: 2,
	maxRollsAllowed: 3,
	currentPenaltySips: 3,
	finalPenaltySips: 3,
	losingParticipantId: 1,
	completedAt: new Date(),
};

// ════════════════════════════════════════════════════════════════════════════
// Mock Preset: "player-turn"
// Round 3 in progress — Bob is mid-turn
// Charlie done: [4,6,2] = 66
// Alice rolled stairs [1,2,3] = 105 (safe, awarded 2 sips)
// Bob currently playing: rolled [3,4,2] = 9, hasn't kept anything yet
// ════════════════════════════════════════════════════════════════════════════

const playerTurnRound: RoundModel = {
	id: 3,
	gameSessionId: FAKE_GAME_SESSION_ID,
	roundNumber: 3,
	playerOrder: [3, 1, 2],
	startedAt: new Date(),
	turns: [
		// Charlie: [4,6,2] = 4+60+2 = 66
		turn(7, 3, 3, 0, [
			roll(9, 7, 1, [
				{ value: 4, kept: true },
				{ value: 6, kept: true },
				{ value: 2, kept: true },
			]),
		], { isSafe: false }),
		// Alice: stairs [1,2,3] = 105, safe
		turn(8, 3, 1, 1, [
			roll(10, 8, 1, [
				{ value: 1, kept: true },
				{ value: 2, kept: true },
				{ value: 3, kept: true },
			], "stairs"),
		], { isSafe: true, specialRollType: "stairs" }),
		// Bob: currently playing, rolled [3,4,2] = 9
		turn(9, 3, 2, 2, [
			roll(11, 9, 1, [
				{ value: 3, kept: false },
				{ value: 4, kept: false },
				{ value: 2, kept: false },
			]),
		], { isSafe: false, completed: false }),
	],
	status: "in_progress",
	startingParticipantId: 3,
	maxRollsAllowed: 3,
	currentPenaltySips: 4,
	finalPenaltySips: null,
	losingParticipantId: null,
	completedAt: null,
};

const MOCK_PLAYER_TURN: GameModel = {
	id: FAKE_GAME_SESSION_ID,
	ownerId: "fake-owner",
	config: { name: "Friday Night Dice", randomTurnOrder: false },
	createdAt: new Date(),
	completedAt: null,
	participants: PARTICIPANTS,
	rounds: [round1, round2, playerTurnRound],
	status: "in_progress",
	startedAt: new Date(),
};

// ════════════════════════════════════════════════════════════════════════════
// Mock Preset: "stairs-rolled"
// Round 3 in progress — Bob just rolled stairs [1,2,3] = 105 (safe!)
// He's the 3rd player so can award 3 sips
// ════════════════════════════════════════════════════════════════════════════

const stairsRolledRound: RoundModel = {
	id: 3,
	gameSessionId: FAKE_GAME_SESSION_ID,
	roundNumber: 3,
	playerOrder: [3, 1, 2],
	startedAt: new Date(),
	turns: [
		// Charlie: [4,6,2] = 66
		turn(7, 3, 3, 0, [
			roll(9, 7, 1, [
				{ value: 4, kept: true },
				{ value: 6, kept: true },
				{ value: 2, kept: true },
			]),
		], { isSafe: false }),
		// Alice: [3,5,4] = 12
		turn(8, 3, 1, 1, [
			roll(10, 8, 1, [
				{ value: 3, kept: true },
				{ value: 5, kept: true },
				{ value: 4, kept: true },
			]),
		], { isSafe: false }),
		// Bob: stairs [1,2,3] = 105, safe! Needs to end turn and award sips
		turn(9, 3, 2, 2, [
			roll(11, 9, 1, [
				{ value: 1, kept: false },
				{ value: 2, kept: false },
				{ value: 3, kept: false },
			], "stairs"),
		], { isSafe: true, specialRollType: "stairs", completed: false }),
	],
	status: "in_progress",
	startingParticipantId: 3,
	maxRollsAllowed: 3,
	currentPenaltySips: 4,
	finalPenaltySips: null,
	losingParticipantId: null,
	completedAt: null,
};

const MOCK_STAIRS_ROLLED: GameModel = {
	id: FAKE_GAME_SESSION_ID,
	ownerId: "fake-owner",
	config: { name: "Friday Night Dice", randomTurnOrder: false },
	createdAt: new Date(),
	completedAt: null,
	participants: PARTICIPANTS,
	rounds: [round1, round2, stairsRolledRound],
	status: "in_progress",
	startedAt: new Date(),
};

// ════════════════════════════════════════════════════════════════════════════
// Mock Preset: "end-turn"
// Round 3 in progress — Bob has used all 2 rolls (max for this round)
// He must end his turn. Normal score, no special roll.
// ════════════════════════════════════════════════════════════════════════════

const endTurnRound: RoundModel = {
	id: 3,
	gameSessionId: FAKE_GAME_SESSION_ID,
	roundNumber: 3,
	playerOrder: [3, 1, 2],
	startedAt: new Date(),
	turns: [
		// Charlie: [4,6,2] = 66
		turn(7, 3, 3, 0, [
			roll(9, 7, 1, [
				{ value: 4, kept: true },
				{ value: 6, kept: true },
				{ value: 2, kept: true },
			]),
		], { isSafe: false }),
		// Alice: [3,5,4] = 12
		turn(8, 3, 1, 1, [
			roll(10, 8, 1, [
				{ value: 3, kept: true },
				{ value: 5, kept: true },
				{ value: 4, kept: true },
			]),
		], { isSafe: false }),
		// Bob: rolled [3,4,2]=9 first, then re-rolled all → [5,2,4]=11, no more rolls
		turn(9, 3, 2, 2, [
			roll(11, 9, 1, [
				{ value: 3, kept: false },
				{ value: 4, kept: false },
				{ value: 2, kept: false },
			]),
			roll(12, 9, 2, [
				{ value: 5, kept: false },
				{ value: 2, kept: false },
				{ value: 4, kept: false },
			]),
		], { isSafe: false, completed: false }),
	],
	status: "in_progress",
	startingParticipantId: 3,
	maxRollsAllowed: 2,
	currentPenaltySips: 4,
	finalPenaltySips: null,
	losingParticipantId: null,
	completedAt: null,
};

const MOCK_END_TURN: GameModel = {
	id: FAKE_GAME_SESSION_ID,
	ownerId: "fake-owner",
	config: { name: "Friday Night Dice", randomTurnOrder: false },
	createdAt: new Date(),
	completedAt: null,
	participants: PARTICIPANTS,
	rounds: [round1, round2, endTurnRound],
	status: "in_progress",
	startedAt: new Date(),
};

// ════════════════════════════════════════════════════════════════════════════
// Mock Preset: "end-turn-stairs"
// Round 3 in progress — Bob has used all 2 rolls (max for this round)
// His last roll was stairs [1,2,3]. Must end turn and award sips.
// ════════════════════════════════════════════════════════════════════════════

const endTurnStairsRound: RoundModel = {
	id: 3,
	gameSessionId: FAKE_GAME_SESSION_ID,
	roundNumber: 3,
	playerOrder: [3, 1, 2],
	startedAt: new Date(),
	turns: [
		// Charlie: [4,6,2] = 66
		turn(7, 3, 3, 0, [
			roll(9, 7, 1, [
				{ value: 4, kept: true },
				{ value: 6, kept: true },
				{ value: 2, kept: true },
			]),
		], { isSafe: false }),
		// Alice: [3,5,4] = 12
		turn(8, 3, 1, 1, [
			roll(10, 8, 1, [
				{ value: 3, kept: true },
				{ value: 5, kept: true },
				{ value: 4, kept: true },
			]),
		], { isSafe: false }),
		// Bob: rolled [5,4,2]=11 first, then re-rolled all → stairs [1,2,3], no more rolls
		turn(9, 3, 2, 2, [
			roll(11, 9, 1, [
				{ value: 5, kept: false },
				{ value: 4, kept: false },
				{ value: 2, kept: false },
			]),
			roll(12, 9, 2, [
				{ value: 1, kept: false },
				{ value: 2, kept: false },
				{ value: 3, kept: false },
			], "stairs"),
		], { isSafe: true, specialRollType: "stairs", completed: false }),
	],
	status: "in_progress",
	startingParticipantId: 3,
	maxRollsAllowed: 2,
	currentPenaltySips: 4,
	finalPenaltySips: null,
	losingParticipantId: null,
	completedAt: null,
};

const MOCK_END_TURN_STAIRS: GameModel = {
	id: FAKE_GAME_SESSION_ID,
	ownerId: "fake-owner",
	config: { name: "Friday Night Dice", randomTurnOrder: false },
	createdAt: new Date(),
	completedAt: null,
	participants: PARTICIPANTS,
	rounds: [round1, round2, endTurnStairsRound],
	status: "in_progress",
	startedAt: new Date(),
};

// ════════════════════════════════════════════════════════════════════════════
// Mock Preset: "first-roll"
// Round 3 in progress — Bob's turn, hasn't rolled yet
// Charlie done: [4,6,2] = 66
// Alice rolled stairs [1,2,3] = 105 (safe)
// ════════════════════════════════════════════════════════════════════════════

const firstRollRound: RoundModel = {
	id: 3,
	gameSessionId: FAKE_GAME_SESSION_ID,
	roundNumber: 3,
	playerOrder: [3, 1, 2],
	startedAt: new Date(),
	turns: [
		// Charlie: [4,6,2] = 66
		turn(7, 3, 3, 0, [
			roll(9, 7, 1, [
				{ value: 4, kept: true },
				{ value: 6, kept: true },
				{ value: 2, kept: true },
			]),
		], { isSafe: false }),
		// Alice: stairs [1,2,3] = 105, safe
		turn(8, 3, 1, 1, [
			roll(10, 8, 1, [
				{ value: 1, kept: true },
				{ value: 2, kept: true },
				{ value: 3, kept: true },
			], "stairs"),
		], { isSafe: true, specialRollType: "stairs" }),
		// Bob: turn created but no rolls yet
		turn(9, 3, 2, 2, [], { isSafe: false, completed: false }),
	],
	status: "in_progress",
	startingParticipantId: 3,
	maxRollsAllowed: 3,
	currentPenaltySips: 4,
	finalPenaltySips: null,
	losingParticipantId: null,
	completedAt: null,
};

const MOCK_FIRST_ROLL: GameModel = {
	id: FAKE_GAME_SESSION_ID,
	ownerId: "fake-owner",
	config: { name: "Friday Night Dice", randomTurnOrder: false },
	createdAt: new Date(),
	completedAt: null,
	participants: PARTICIPANTS,
	rounds: [round1, round2, firstRollRound],
	status: "in_progress",
	startedAt: new Date(),
};

// ════════════════════════════════════════════════════════════════════════════
// Mock Preset: "round-finished"
// Round 3 completed — Bob lost with lowest score
// Charlie: [4,6,2]=66, Alice: [6,1,5]=165, Bob: [3,2,5]=10
// ════════════════════════════════════════════════════════════════════════════

const roundFinishedRound: RoundModel = {
	id: 3,
	gameSessionId: FAKE_GAME_SESSION_ID,
	roundNumber: 3,
	playerOrder: [3, 1, 2],
	startedAt: new Date(),
	turns: [
		// Charlie: [4,6,2] = 4+60+2 = 66
		turn(7, 3, 3, 0, [
			roll(9, 7, 1, [
				{ value: 4, kept: true },
				{ value: 6, kept: true },
				{ value: 2, kept: true },
			]),
		], { isSafe: false }),
		// Alice: [3,1,5]=108 → re-rolls 3,5 → [6,1,5] = 60+100+5 = 165
		turn(8, 3, 1, 1, [
			roll(10, 8, 1, [
				{ value: 3, kept: false },
				{ value: 1, kept: true },
				{ value: 5, kept: false },
			]),
			roll(11, 8, 2, [
				{ value: 6, kept: true },
				{ value: 1, kept: true },
				{ value: 5, kept: true },
			]),
		], { isSafe: false }),
		// Bob: [2,4,3]=9 → re-rolls → [3,2,5]=10, lowest score → loses
		turn(9, 3, 2, 2, [
			roll(12, 9, 1, [
				{ value: 2, kept: false },
				{ value: 4, kept: false },
				{ value: 3, kept: false },
			]),
			roll(13, 9, 2, [
				{ value: 3, kept: true },
				{ value: 2, kept: true },
				{ value: 5, kept: true },
			]),
		], { isSafe: false }),
	],
	status: "completed",
	startingParticipantId: 3,
	maxRollsAllowed: 3,
	currentPenaltySips: 4,
	finalPenaltySips: 4,
	losingParticipantId: 2,
	completedAt: new Date(),
};

const MOCK_ROUND_FINISHED: GameModel = {
	id: FAKE_GAME_SESSION_ID,
	ownerId: "fake-owner",
	config: { name: "Friday Night Dice", randomTurnOrder: false },
	createdAt: new Date(),
	completedAt: null,
	participants: PARTICIPANTS,
	rounds: [round1, round2, roundFinishedRound],
	status: "in_progress",
	startedAt: new Date(),
};

// ════════════════════════════════════════════════════════════════════════════
// Preset registry
// ════════════════════════════════════════════════════════════════════════════

export type MockPresetKey = "first-roll" | "player-turn" | "end-turn" | "end-turn-stairs" | "stairs-rolled" | "round-finished";

export interface MockPreset {
	key: MockPresetKey;
	label: string;
	description: string;
	session: GameModel;
}

export const MOCK_PRESETS: MockPreset[] = [
	{
		key: "first-roll",
		label: "First Roll",
		description: "Bob's turn, hasn't rolled yet. Alice is safe with stairs.",
		session: MOCK_FIRST_ROLL,
	},
	{
		key: "player-turn",
		label: "Player Turn",
		description: "Bob is mid-turn in round 3 (rolled 9). Alice is safe with stairs.",
		session: MOCK_PLAYER_TURN,
	},
	{
		key: "end-turn",
		label: "End Turn (normal)",
		description: "Bob used all 2 rolls, scored 11. Must end turn.",
		session: MOCK_END_TURN,
	},
	{
		key: "end-turn-stairs",
		label: "End Turn (stairs)",
		description: "Bob used all 2 rolls, last roll was stairs. Must end & award sips.",
		session: MOCK_END_TURN_STAIRS,
	},
	{
		key: "stairs-rolled",
		label: "Stairs Rolled",
		description: "Bob rolled stairs [1,2,3]. Must award 3 sips to another player.",
		session: MOCK_STAIRS_ROLLED,
	},
	{
		key: "round-finished",
		label: "Round Finished",
		description: "Round 3 completed — Bob lost with 10 points (4 sips)",
		session: MOCK_ROUND_FINISHED,
	},
];

export const DEFAULT_MOCK_KEY: MockPresetKey = "player-turn";

export function getMockSession(key?: string): GameModel {
	const preset = MOCK_PRESETS.find((p) => p.key === key);
	return preset?.session ?? MOCK_PLAYER_TURN;
}

// Keep for backward compatibility with createGameAction
export const FAKE_GAME_SESSION = MOCK_PLAYER_TURN;
