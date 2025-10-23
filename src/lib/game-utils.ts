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

	return "none";
}

/**
 * Check if a special roll makes the player "safe"
 */
export function isSafeRoll(specialRollType: SpecialRollType): boolean {
	return specialRollType !== "none" && specialRollType !== "shit_stairs";
}

/**
 * Calculate sips added to penalty for three of a kind
 */
export function getThreeOfAKindSips(diceValue: number): number {
	if (diceValue === 1) return 7;
	return diceValue;
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
 * Check if the current turn's roll qualifies as "super stairs"
 * Must be [4,5,6] AND previous turn must have been normal stairs [1,2,3]
 */
export function isSuperStairsValid(
	currentDice: Dice,
	previousTurnWasStairs: boolean,
): boolean {
	const values = currentDice.map((d) => d.value).sort((a, b) => a - b);
	const isStairs456 = values[0] === 4 && values[1] === 5 && values[2] === 6;

	return isStairs456 && previousTurnWasStairs;
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
 * Find the losing participant from turns
 * Returns null if all players are safe
 */
export function findLoserFromTurns(
	turns: PlayerTurnModel[],
): number | null {
	// Filter out safe players (those with special rolls)
	const unsafeTurns = turns.filter((t) => !t.isSafe);

	if (unsafeTurns.length === 0) {
		return null; // All players are safe
	}

	// Find the turn with the lowest score
	const losingTurn = unsafeTurns.reduce((lowest, current) => {
		const lowestScore = lowest.finalScore ?? Number.POSITIVE_INFINITY;
		const currentScore = current.finalScore ?? Number.POSITIVE_INFINITY;
		return currentScore < lowestScore ? current : lowest;
	});

	return losingTurn.participantId;
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
 * Create player order for a round
 * Puts starting participant first, optionally shuffles the rest
 */
export function createPlayerOrder(
	startingParticipantId: number,
	allParticipantIds: number[],
	shuffleOrder: boolean,
): number[] {
	// Move starting participant to the front
	const remaining = allParticipantIds.filter(
		(id) => id !== startingParticipantId,
	);

	// Optionally shuffle remaining players
	const orderedRemaining = shuffleOrder ? shuffleArray(remaining) : remaining;

	return [startingParticipantId, ...orderedRemaining];
}
