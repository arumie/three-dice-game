import type { Dice, SpecialRollType } from "../db/schema";
import type { PlayerTurnModel } from "./models";

// Point values for each dice face
const DICE_POINTS: Record<number, number> = {
	1: 100,
	2: 2,
	3: 3,
	4: 4,
	5: 5,
	6: 60,
};

/**
 * Calculate the score from an array of dice
 */
export function calculateScore(dice: Dice): number {
	return dice.reduce((sum, d) => sum + DICE_POINTS[d.value], 0);
}

/**
 * Detect if a roll is a special roll type
 */
export function detectSpecialRoll(dice: Dice): SpecialRollType {
	const values = dice.map((d) => d.value).sort((a, b) => a - b);

	// Three of a kind
	if (values[0] === values[1] && values[1] === values[2]) {
		return "three_of_a_kind";
	}

	// Stairs [1,2,3]
	if (values[0] === 1 && values[1] === 2 && values[2] === 3) {
		return "stairs";
	}

	// Super stairs [4,5,6] - caller needs to check previousRollWasStairs context
	if (values[0] === 4 && values[1] === 5 && values[2] === 6) {
		return "super_stairs";
	}

	// Shit stairs [2,3,4] or [3,4,5]
	if (
		(values[0] === 2 && values[1] === 3 && values[2] === 4) ||
		(values[0] === 3 && values[1] === 4 && values[2] === 5)
	) {
		return "shit_stairs";
	}

	// Lowest possible score: [2,2,3] = 7 points
	if (calculateScore(dice) === 7) {
		return "lowest";
	}

	return "none";
}

/**
 * Check if a special roll makes the player "safe"
 */
export function isSafeRoll(specialRollType: SpecialRollType): boolean {
	return specialRollType !== "none"
		&& specialRollType !== "shit_stairs"
		&& specialRollType !== "lowest";
}

/**
 * Calculate sips added to penalty for three of a kind
 */
export function getThreeOfAKindSips(diceValue: number): number {
	if (diceValue === 1) return 7;
	return diceValue;
}

/**
 * Calculate the penalty when the first player triggers a false start (special roll on their first throw).
 * Three of a kind: the standard three-of-a-kind sips.
 * Stairs: turnOrder + 1 (always 1 for the first player).
 */
export function getFalseStartPenalty(turn: PlayerTurnModel): number {
	if (turn.specialRollType === "three_of_a_kind") {
		return getThreeOfAKindSips(turn.rolls[0].dice[0].value);
	}
	if (turn.specialRollType === "stairs") {
		return turn.turnOrder + 1;
	}
	return 0;
}

/**
 * Roll random dice (for initial rolls or re-rolls)
 */
export function rollDice(count = 3): number[] {
	return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

/**
 * Create a new roll with some dice kept from previous roll
 */
export function createRollWithKept(
	previousDice: Dice,
	diceToReroll: number[], // indices of dice to reroll (0, 1, or 2)
): Dice {
	const newRolls = rollDice(diceToReroll.length);
	let rollIndex = 0;

	return previousDice.map((die, index) => {
		if (diceToReroll.includes(index)) {
			return { value: newRolls[rollIndex++], kept: false };
		}
		return { value: die.value, kept: true };
	});
}

/**
 * Get the starting participant for a round
 */
export function getStartingParticipant(playerOrder: number[]): number {
	return playerOrder[0];
}

/**
 * Calculate if round is complete based on data
 */
export function isRoundCompleteFromData(
	playerOrder: number[],
	turnCount: number,
): boolean {
	return turnCount === playerOrder.length;
}

/**
 * Calculate max rolls allowed from first turn's rolls
 */
export function getMaxRollsFromFirstTurn(
	firstTurnRolls: { rollNumber: number }[],
): number {
	return firstTurnRolls.length || 3;
}

/**
 * Calculate the penalty sips for a round from its turns
 * Base is 1, plus any three-of-a-kind bonuses
 */
export function calculatePenaltyFromTurns(
	turns: PlayerTurnModel[],
): number {
	let penaltySips = 1; // Base penalty

	for (const turn of turns) {
		if (turn.specialRollType === "three_of_a_kind") {
			const lastRoll = turn.rolls[turn.rolls.length - 1];
			const diceValue = lastRoll.dice[0].value; // All three dice are the same
			penaltySips += getThreeOfAKindSips(diceValue);
		}
	}

	return penaltySips;
}

/**
 * Find the losing participants from turns.
 * Returns all participant IDs tied for the lowest score.
 * Returns an empty array if all players are safe.
 */
export function findLosersFromTurns(
	turns: PlayerTurnModel[],
): number[] {
	const unsafeTurns = turns.filter((t) => !t.isSafe);

	if (unsafeTurns.length === 0) {
		return [];
	}

	const minScore = Math.min(
		...unsafeTurns.map((t) => t.finalScore ?? Number.POSITIVE_INFINITY),
	);

	return unsafeTurns
		.filter((t) => (t.finalScore ?? Number.POSITIVE_INFINITY) === minScore)
		.map((t) => t.participantId);
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
export function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/**
 * Check if ending the turn now would violate the gentleman rule.
 *
 * The rule states: the last player's final roll must be able to lose the round,
 * unless they already have a safe special roll. If their current score is higher
 * than the lowest score to beat and they still have re-rolls available, ending
 * the turn breaks the gentleman rule.
 */
export function violatesGentlemanRule(params: {
	isLastPlayer: boolean;
	isSafe: boolean;
	hasRollsRemaining: boolean;
	currentScore: number | null;
	lowestScoreToBeat: number | null;
}): boolean {
	return (
		params.isLastPlayer &&
		!params.isSafe &&
		params.hasRollsRemaining &&
		params.lowestScoreToBeat !== null &&
		params.currentScore !== null &&
		params.currentScore > params.lowestScoreToBeat
	);
}

/**
 * Compute the score to beat: the lowest finalScore among non-safe turns,
 * excluding a specific participant (typically the current player).
 * Returns `null` when there are no qualifying turns.
 */
export function computeScoreToBeat(
	turns: PlayerTurnModel[],
	excludeParticipantId: number,
): { score: number; participantId: number } | null {
	const candidates = turns.filter(
		(t) => t.participantId !== excludeParticipantId && !t.isSafe && t.finalScore !== null,
	);

	if (candidates.length === 0) return null;

	let lowest = candidates[0];
	for (const t of candidates) {
		if ((t.finalScore as number) < (lowest.finalScore as number)) {
			lowest = t;
		}
	}

	return { score: lowest.finalScore as number, participantId: lowest.participantId };
}

/**
 * Calculate how many sips a stairs roll can award.
 * Normal stairs: turnOrder + 1.
 * Super stairs: (turnOrder + 1) * 2.
 * Non-stairs rolls: 0.
 */
export function computeStairsSipsToAward(
	specialRollType: SpecialRollType,
	turnOrder: number,
): number {
	if (specialRollType === "super_stairs") {
		return (turnOrder + 1) * 2;
	}
	if (specialRollType === "stairs") {
		return turnOrder + 1;
	}
	return 0;
}

/**
 * Count how many "lowest" rolls each participant made across all turns.
 * Returns only participants who had at least one lowest roll.
 */
export function computeLowestRollCounts(
	turns: PlayerTurnModel[],
): { participantId: number; count: number }[] {
	const result: { participantId: number; count: number }[] = [];
	for (const t of turns) {
		const count = t.rolls.filter((r) => r.specialRollType === "lowest").length;
		if (count > 0) {
			result.push({ participantId: t.participantId, count });
		}
	}
	return result;
}

/**
 * Create player order for a round.
 * When not shuffled, rotates the original order so the starting participant
 * is first and the rest follow in their original circular "table" order.
 * e.g. [1,2,3,4] with starter 3 → [3,4,1,2]
 */
export function createPlayerOrder(
	startingParticipantId: number,
	allParticipantIds: number[],
	shuffleOrder: boolean,
): number[] {
	if (shuffleOrder) {
		const remaining = allParticipantIds.filter(
			(id) => id !== startingParticipantId,
		);
		return [startingParticipantId, ...shuffleArray(remaining)];
	}

	// Circular rotation: find starting index and rotate
	const startIdx = allParticipantIds.indexOf(startingParticipantId);
	if (startIdx === -1) {
		// Fallback: put starter first, keep rest in order
		const remaining = allParticipantIds.filter(
			(id) => id !== startingParticipantId,
		);
		return [startingParticipantId, ...remaining];
	}

	return [
		...allParticipantIds.slice(startIdx),
		...allParticipantIds.slice(0, startIdx),
	];
}
