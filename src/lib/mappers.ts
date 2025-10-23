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
	getMaxRollsFromFirstTurn,
	getStartingParticipant,
	isRoundCompleteFromData,
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

	const isComplete = isRoundCompleteFromData(round.playerOrder, turns.length);
	const status = isComplete ? "completed" : "in_progress";
	const maxRollsAllowed =
		turnModels.length > 0 ? getMaxRollsFromFirstTurn(turnModels[0].rolls) : 3;
	const currentPenaltySips = calculatePenaltyFromTurns(turnModels);
	const losingParticipantId = isComplete
		? findLoserFromTurns(turnModels)
		: null;
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
