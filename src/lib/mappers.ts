import type {
	SelectGameParticipant,
	SelectGameSession,
	SelectPlayerTurn,
	SelectRoll,
	SelectRound,
} from "../db/schema";
import {
	calculatePenaltyFromTurns,
	calculateScore,
	detectSpecialRoll,
	findLoserFromTurns,
	getFalseStartPenalty,
	getStartingParticipant,
	isSafeRoll,
} from "./game-utils";
import type {
	GameModel,
	PlayerTurnModel,
	RollModel,
	RoundModel,
} from "./models";

/**
 * Map a database roll to a domain model roll with calculated fields
 * Pure transformation - no DB access
 */
export function mapRoll(roll: SelectRoll): RollModel {
	const specialRollType = detectSpecialRoll(roll.dice);
	return {
		...roll,
		score: calculateScore(roll.dice),
		specialRollType,
	};
}

/**
 * Map a database player turn to a domain model with calculated fields
 * Requires rolls to be provided as parameter
 */
export function mapPlayerTurn(
	turn: SelectPlayerTurn,
	rolls: SelectRoll[],
): PlayerTurnModel {
	const rollModels = rolls.map(mapRoll);

	const lastRoll = rollModels[rollModels.length - 1];
	const specialRollType = lastRoll?.specialRollType || "none";
	const isSafe = isSafeRoll(specialRollType);

	return {
		...turn,
		rolls: rollModels,
		totalRollsUsed: rollModels.length,
		finalScore: isSafe ? null : (lastRoll?.score || 0),
		isSafe,
		specialRollType,
		completedAt: lastRoll?.rolledAt || new Date(),
		isComplete: false, // Default; overridden by mapRound with full context
	};
}

/**
 * Map a database round to a domain model with calculated fields
 * Requires turns and rolls to be provided as parameters
 */
export function mapRound(
	round: SelectRound,
	turns: SelectPlayerTurn[],
	rollsByTurnId: Map<number, SelectRoll[]>,
): RoundModel {
	const turnModels = turns.map((turn) => {
		const rolls = rollsByTurnId.get(turn.id) || [];
		return mapPlayerTurn(turn, rolls);
	});

	// Determine maxRollsAllowed.
	// If carry-over max rolls is set (from a previous all-safe round), use that.
	// Otherwise compute from the first turn: while the first player is still
	// rolling the max is 3; once they explicitly end or use all 3 rolls,
	// their roll count becomes the max for everyone.
	const hasCarryOver = (round.carryOverSips ?? 0) > 0;
	const firstTurn = turnModels[0];
	let maxRollsAllowed: number;

	if (round.carryOverMaxRolls != null) {
		maxRollsAllowed = round.carryOverMaxRolls;
	} else {
		const firstTurnDone =
			firstTurn != null &&
			(firstTurn.endedAt !== null ||
				firstTurn.totalRollsUsed >= 3);
		maxRollsAllowed =
			firstTurn && firstTurnDone ? firstTurn.totalRollsUsed : 3;
	}

	// Set isComplete on each turn now that we know maxRollsAllowed.
	// A turn is complete when explicitly ended (endedAt set).
	for (const turn of turnModels) {
		turn.isComplete = turn.endedAt !== null;
	}

	// False start: if the first player rolled a special roll (three_of_a_kind
	// or stairs) on their very first throw, the round ends immediately and
	// that player is the loser.
	// Skipped when carry-over sips exist (the penalty pool is already loaded).
	const isFalseStart =
		!hasCarryOver &&
		firstTurn != null &&
		firstTurn.isComplete &&
		firstTurn.turnOrder === 0 &&
		firstTurn.totalRollsUsed === 1 &&
		(firstTurn.specialRollType === "three_of_a_kind" ||
			firstTurn.specialRollType === "stairs");

	if (isFalseStart) {
		const startingParticipantId = getStartingParticipant(round.playerOrder);
		const falseStartPenalty = getFalseStartPenalty(firstTurn);
		return {
			...round,
			turns: turnModels,
			status: "completed",
			startingParticipantId,
			maxRollsAllowed,
			currentPenaltySips: falseStartPenalty,
			finalPenaltySips: falseStartPenalty,
			losingParticipantId: firstTurn.participantId,
			completedAt: firstTurn.completedAt,
			falseStart: true,
			allSafe: false,
		};
	}

	// A round is complete when every player has a finished turn
	const allTurnsExist = turnModels.length === round.playerOrder.length;
	const allTurnsComplete = turnModels.every((t) => t.isComplete);
	const isComplete = allTurnsExist && allTurnsComplete;
	const status = isComplete ? "completed" : "in_progress";

	// Penalty includes carry-over from previous all-safe round(s)
	const carryOver = round.carryOverSips ?? 0;
	const currentPenaltySips = carryOver + calculatePenaltyFromTurns(turnModels);
	const losingParticipantId = isComplete
		? findLoserFromTurns(turnModels)
		: null;
	const allSafe = isComplete && losingParticipantId === null;
	const startingParticipantId = getStartingParticipant(round.playerOrder);

	// Get completedAt from last turn's last roll
	let completedAt: Date | null = null;
	if (isComplete && turnModels.length > 0) {
		const lastTurn = turnModels[turnModels.length - 1];
		completedAt = lastTurn.completedAt;
	}

	return {
		...round,
		turns: turnModels,
		status,
		startingParticipantId,
		maxRollsAllowed,
		currentPenaltySips,
		finalPenaltySips: isComplete ? currentPenaltySips : null,
		losingParticipantId,
		completedAt,
		falseStart: false,
		allSafe,
	};
}

/**
 * Map a database game session to a domain model with calculated fields
 * Requires all related data to be provided as parameters
 */
export function mapGame(
	session: SelectGameSession,
	participants: SelectGameParticipant[],
	rounds: SelectRound[],
	turnsByRoundId: Map<number, SelectPlayerTurn[]>,
	rollsByTurnId: Map<number, SelectRoll[]>,
): GameModel {
	const roundModels = rounds.map((round) => {
		const turns = turnsByRoundId.get(round.id) || [];
		return mapRound(round, turns, rollsByTurnId);
	});

	// Calculate game status
	let status: "waiting" | "in_progress" | "completed";
	if (session.completedAt) {
		status = "completed";
	} else if (roundModels.length > 0) {
		status = "in_progress";
	} else {
		status = "waiting";
	}

	// Get startedAt from first round
	const startedAt = roundModels[0]?.startedAt || null;

	return {
		...session,
		participants,
		rounds: roundModels,
		status,
		startedAt,
	};
}
