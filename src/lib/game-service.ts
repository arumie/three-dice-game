import { eq } from "drizzle-orm";
import { db } from "../db";
import {
	gameSessionsTable,
	playerTurnsTable,
	roundsTable,
	type Dice,
	type SelectPlayerTurn,
	type SelectRoll,
} from "../db/schema";
import {
	createRoll as createRollQuery,
	getGameParticipantsBySession,
	getGameSessionById,
	getLatestRoll as getLatestRollQuery,
	getLatestRound as getLatestRoundQuery,
	getMaxRoundNumber,
	getParticipantsByPlayerId,
	getPlayerTurnsByRound,
	getRollsByPlayerTurn,
	getRoundsBySession,
} from "../db/queries";
import { createPlayerOrder, detectSpecialRoll, isSuperStairsValid } from "./game-utils";
import { mapGame, mapPlayerTurn, mapRound } from "./mappers";
import type {
	GameModel,
	ParticipantStats,
	PlayerGlobalStats,
	RoundModel,
} from "./models";

/**
 * Get complete game state with all rounds, turns, and rolls
 */
export async function getCompleteGame(
	gameSessionId: number,
): Promise<GameModel | null> {
	const session = await getGameSessionById(gameSessionId);
	if (!session) return null;

	// Fetch all related data
	const [participants, rounds] = await Promise.all([
		getGameParticipantsBySession(session.id),
		getRoundsBySession(session.id),
	]);

	// Fetch all turns for all rounds
	const turnsArrays = await Promise.all(
		rounds.map((round) => getPlayerTurnsByRound(round.id, gameSessionId)),
	);

	// Build turnsByRoundId map
	const turnsByRoundId = new Map<number, SelectPlayerTurn[]>();
	rounds.forEach((round, index) => {
		turnsByRoundId.set(round.id, turnsArrays[index]);
	});

	// Fetch all rolls for all turns
	const allTurns = turnsArrays.flat();
	const rollsArrays = await Promise.all(
		allTurns.map((turn) => getRollsByPlayerTurn(turn.id, gameSessionId)),
	);

	// Build rollsByTurnId map
	const rollsByTurnId = new Map<number, SelectRoll[]>();
	allTurns.forEach((turn, index) => {
		rollsByTurnId.set(turn.id, rollsArrays[index]);
	});

	return mapGame(session, participants, rounds, turnsByRoundId, rollsByTurnId);
}

/**
 * Get the latest round for a game session (may be completed or in progress)
 */
export async function getLatestRound(
	gameSessionId: number,
): Promise<RoundModel | null> {
	const round = await getLatestRoundQuery(gameSessionId);
	if (!round) return null;

	// Fetch turns for this round
	const turns = await getPlayerTurnsByRound(round.id, gameSessionId);

	// Fetch rolls for all turns
	const rollsArrays = await Promise.all(
		turns.map((turn) => getRollsByPlayerTurn(turn.id, gameSessionId)),
	);

	// Build rollsByTurnId map
	const rollsByTurnId = new Map<number, SelectRoll[]>();
	turns.forEach((turn, index) => {
		rollsByTurnId.set(turn.id, rollsArrays[index]);
	});

	return mapRound(round, turns, rollsByTurnId);
}

/**
 * Get the current (active/in-progress) round for a game session
 * Returns null if no round exists or if the latest round is completed
 */
export async function getCurrentRound(
	gameSessionId: number,
): Promise<RoundModel | null> {
	const rounds = await getRoundsBySession(gameSessionId);
	if (rounds.length === 0) return null;

	const latestRound = rounds[rounds.length - 1];

	// Fetch turns for this round
	const turns = await getPlayerTurnsByRound(latestRound.id, gameSessionId);

	// Fetch rolls for all turns
	const rollsArrays = await Promise.all(
		turns.map((turn) => getRollsByPlayerTurn(turn.id, gameSessionId)),
	);

	// Build rollsByTurnId map
	const rollsByTurnId = new Map<number, SelectRoll[]>();
	turns.forEach((turn, index) => {
		rollsByTurnId.set(turn.id, rollsArrays[index]);
	});

	const roundModel = mapRound(latestRound, turns, rollsByTurnId);

	// If the latest round is not complete, it's the current round
	return roundModel.status === "in_progress" ? roundModel : null;
}

/**
 * Get the next participant who should take their turn in a round
 * Returns null if round is complete
 */
export async function getNextParticipantToPlay(
	roundId: number,
): Promise<number | null> {
	const rounds = await db
		.select()
		.from(roundsTable)
		.where(eq(roundsTable.id, roundId))
		.limit(1);

	if (rounds.length === 0) return null;

	const round = rounds[0];
	const gameSessionId = round.gameSessionId;

	// Fetch turns for this round
	const turns = await getPlayerTurnsByRound(roundId, gameSessionId);

	// Fetch rolls for all turns
	const rollsArrays = await Promise.all(
		turns.map((turn) => getRollsByPlayerTurn(turn.id, gameSessionId)),
	);

	// Build rollsByTurnId map
	const rollsByTurnId = new Map<number, SelectRoll[]>();
	turns.forEach((turn, index) => {
		rollsByTurnId.set(turn.id, rollsArrays[index]);
	});

	const roundModel = mapRound(round, turns, rollsByTurnId);

	const { playerOrder, turns: turnModels } = roundModel;

	// If no turns yet, first player in order
	if (turnModels.length === 0) {
		return playerOrder[0];
	}

	// If all players have played, round is complete
	if (turnModels.length >= playerOrder.length) {
		return null;
	}

	// Next player in order
	return playerOrder[turnModels.length];
}

/**
 * Create a new round with player order based on game config.
 * Determines the starting player from the previous round's loser.
 * For the first round, the first participant starts.
 */
export async function createRound(
	gameSessionId: number,
	overrideStartingParticipantId?: number,
): Promise<number> {
	// Fetch session config, participants, and latest round from DB
	const [session, participants, latestRoundModel] = await Promise.all([
		getGameSessionById(gameSessionId),
		getGameParticipantsBySession(gameSessionId),
		getLatestRound(gameSessionId),
	]);

	if (!session) {
		throw new Error(`Game session ${gameSessionId} not found`);
	}

	const allParticipantIds = participants.map((p) => p.id);

	// Detect if previous round was all-safe (completed, no loser)
	const prevAllSafe =
		latestRoundModel?.status === "completed" &&
		latestRoundModel.allSafe;

	// Determine who starts:
	// - If an override is provided (e.g. tiebreaker winner): use that
	// - If previous round was all-safe: keep the same starting player
	// - If previous round had a loser: the loser starts (first in array)
	// - Otherwise (first round): first participant
	let startingParticipantId: number;
	if (overrideStartingParticipantId != null) {
		startingParticipantId = overrideStartingParticipantId;
	} else if (prevAllSafe) {
		startingParticipantId = latestRoundModel.startingParticipantId;
	} else if (
		latestRoundModel?.status === "completed" &&
		latestRoundModel.losingParticipantIds.length > 0
	) {
		startingParticipantId = latestRoundModel.losingParticipantIds[0];
	} else {
		startingParticipantId = allParticipantIds[0];
	}

	// Use game config setting for shuffle
	const shuffleOrder = session.config.randomTurnOrder;

	// Get the next round number
	const latestRoundNumber = await getMaxRoundNumber(gameSessionId);

	// Create player order starting with the starting participant
	const playerOrder = createPlayerOrder(
		startingParticipantId,
		allParticipantIds,
		shuffleOrder,
	);

	// Carry over penalty and max rolls from an all-safe round
	const carryOverSips = prevAllSafe
		? latestRoundModel.currentPenaltySips
		: 0;
	const carryOverMaxRolls = prevAllSafe
		? latestRoundModel.maxRollsAllowed
		: undefined;

	const result = await db
		.insert(roundsTable)
		.values({
			gameSessionId,
			roundNumber: latestRoundNumber + 1,
			playerOrder,
			carryOverSips,
			carryOverMaxRolls,
		})
		.returning();

	return result[0].id;
}

/**
 * Record a dice roll for the current player in the latest round.
 * If the player hasn't started their turn yet, creates the turn first.
 *
 * @param diceValues - The new dice values (3 for first roll, N for re-roll)
 * @param reRollIndices - Indices (0-2) of dice being re-rolled (omit for first roll)
 */
export async function recordRoll(
	gameSessionId: number,
	diceValues: number[],
	reRollIndices?: number[],
): Promise<void> {
	// Validate dice values
	for (const v of diceValues) {
		if (v < 1 || v > 6 || !Number.isInteger(v)) {
			throw new Error(`Invalid dice value: ${v}`);
		}
	}

	const round = await getLatestRound(gameSessionId);
	if (!round || round.status === "completed") {
		throw new Error("No active round found");
	}

	// Find or create the current turn
	const activeTurn = round.turns.find(
		(t) => !t.isComplete && t.totalRollsUsed > 0,
	);

	let turnId: number;
	let dice: Dice;
	let rollNumber: number;
	let turnOrder = -1;

	if (activeTurn) {
		// --- Re-roll on existing turn ---
		if (!reRollIndices || reRollIndices.length === 0) {
			throw new Error("Re-roll requires at least one die selected");
		}
		if (diceValues.length !== reRollIndices.length) {
			throw new Error("Dice values must match selected re-roll count");
		}

		const previousRoll = await getLatestRollQuery(activeTurn.id, gameSessionId);
		if (!previousRoll) {
			throw new Error("No previous roll found for this turn");
		}

		// Build new dice: keep old values, replace re-rolled positions
		let newValueIdx = 0;
		dice = previousRoll.dice.map((die, idx) => {
			if (reRollIndices.includes(idx)) {
				return { value: diceValues[newValueIdx++], kept: false };
			}
			return { value: die.value, kept: true };
		});
		rollNumber = previousRoll.rollNumber + 1;
		turnId = activeTurn.id;
	} else {
		// --- First roll: determine next player and create turn ---
		if (diceValues.length !== 3) {
			throw new Error("First roll must have exactly 3 dice");
		}

		// Find the next participant who doesn't have a turn yet
		const nextParticipantId = round.playerOrder.find(
			(pid) => !round.turns.some((t) => t.participantId === pid),
		);
		if (nextParticipantId == null) {
			throw new Error("All players have already taken their turn");
		}

		turnOrder = round.turns.length;
		turnId = await createPlayerTurn(
			gameSessionId,
			round.id,
			nextParticipantId,
			turnOrder,
		);
		dice = diceValues.map((v) => ({ value: v, kept: false }));
		rollNumber = 1;
	}

	await createRollQuery({
		gameSessionId,
		playerTurnId: turnId,
		rollNumber,
		dice,
	});

	// False start: if the first player's first roll is a special roll
	// (three_of_a_kind or stairs), auto-end their turn so the round
	// completes immediately. Skipped when carry-over sips exist (penalty
	// pool is already loaded from a previous all-safe round).
	const hasCarryOver = (round.carryOverSips ?? 0) > 0;
	if (!hasCarryOver && !activeTurn && turnOrder === 0 && rollNumber === 1) {
		const specialType = detectSpecialRoll(dice);
		if (specialType === "three_of_a_kind" || specialType === "stairs") {
			await db
				.update(playerTurnsTable)
				.set({ endedAt: new Date() })
				.where(eq(playerTurnsTable.id, turnId));
		}
	}
}

/**
 * End the current active turn in a game session.
 * Finds the in-progress turn from the latest round and sets ended_at.
 * Optionally records who received stairs/super-stairs sips.
 */
export async function endCurrentTurn(
	gameSessionId: number,
	awardedToParticipantId?: number,
): Promise<void> {
	const round = await getLatestRound(gameSessionId);
	if (!round) {
		throw new Error("No active round found");
	}

	// Find the turn that has rolls but hasn't been ended yet
	const activeTurn = round.turns.find(
		(t) => !t.isComplete && t.totalRollsUsed > 0,
	);
	if (!activeTurn) {
		throw new Error("No active turn found to end");
	}

	await db
		.update(playerTurnsTable)
		.set({
			endedAt: new Date(),
			...(awardedToParticipantId != null && {
				sipsAwardedTo: awardedToParticipantId,
			}),
		})
		.where(eq(playerTurnsTable.id, activeTurn.id));
}

/**
 * Check if the previous turn was a stairs roll
 * Used to validate super stairs
 */
export async function wasPreviousTurnStairs(
	roundId: number,
	currentTurnOrder: number,
	gameSessionId: number,
): Promise<boolean> {
	if (currentTurnOrder <= 1) return false; // No previous turn

	const turns = await getPlayerTurnsByRound(roundId, gameSessionId);
	const previousTurn = turns.find((t) => t.turnOrder === currentTurnOrder - 1);

	if (!previousTurn) return false;

	// Fetch rolls for previous turn
	const rolls = await getRollsByPlayerTurn(previousTurn.id, gameSessionId);

	// Map to domain model
	const previousTurnModel = mapPlayerTurn(previousTurn, rolls);
	return previousTurnModel.specialRollType === "stairs";
}

/**
 * Validate if a super stairs roll is legitimate
 */
export async function validateSuperStairs(
	roundId: number,
	currentTurnOrder: number,
	dice: Dice,
	gameSessionId: number,
): Promise<boolean> {
	const previousWasStairs = await wasPreviousTurnStairs(
		roundId,
		currentTurnOrder,
		gameSessionId,
	);
	return isSuperStairsValid(dice, previousWasStairs);
}

/**
 * Calculate participant stats for a game session
 */
export async function getParticipantStats(
	participantId: number,
	gameSessionId: number,
): Promise<ParticipantStats> {
	const rounds = await getRoundsBySession(gameSessionId);

	let roundsWon = 0;
	let roundsLost = 0;
	let sipsDrunk = 0;
	let sipsAwarded = 0;
	let sipsReceived = 0;
	let threeOfAKindCount = 0;
	let stairsCount = 0;
	let superStairsCount = 0;
	let shitStairsCount = 0;
	let lowestScoreCount = 0;
	let lowestScoreSipsDrunk = 0;
	let tiebreakerWins = 0;

	// We need all participants for lowest-score sip tracking
	const allParticipants = await getGameParticipantsBySession(gameSessionId);

	// Collect mapped round models for tiebreaker detection
	const roundModels: RoundModel[] = [];

	for (const round of rounds) {
		// Fetch turns for this round
		const turns = await getPlayerTurnsByRound(round.id, gameSessionId);

		// Fetch rolls for all turns
		const rollsArrays = await Promise.all(
			turns.map((turn) => getRollsByPlayerTurn(turn.id, gameSessionId)),
		);

		// Build rollsByTurnId map
		const rollsByTurnId = new Map<number, SelectRoll[]>();
		turns.forEach((turn, index) => {
			rollsByTurnId.set(turn.id, rollsArrays[index]);
		});

		const roundModel = mapRound(round, turns, rollsByTurnId);
		roundModels.push(roundModel);

		// Count lowest rolls from ALL rounds (including in-progress)
		// since "everyone drinks 1 sip" triggers immediately on each roll
		for (const turn of roundModel.turns) {
			for (const roll of turn.rolls) {
				if (roll.specialRollType === "lowest") {
					if (turn.participantId === participantId) {
						lowestScoreCount++;
					}
					lowestScoreSipsDrunk++;
					sipsDrunk++;
				}
			}
		}

		if (roundModel.status !== "completed") continue;

		// Check if this participant lost
		if (roundModel.losingParticipantIds.includes(participantId)) {
			roundsLost++;
			sipsDrunk += roundModel.finalPenaltySips || 0;
		} else if (roundModel.losingParticipantIds.length > 0) {
			roundsWon++;
		}

		// Count special rolls and sips awarded for this participant
		const participantTurn = roundModel.turns.find(
			(t) => t.participantId === participantId,
		);
		if (participantTurn) {
			if (participantTurn.specialRollType === "three_of_a_kind") {
				threeOfAKindCount++;
			} else if (participantTurn.specialRollType === "stairs") {
				stairsCount++;
				sipsAwarded += participantTurn.turnOrder + 1;
			} else if (participantTurn.specialRollType === "super_stairs") {
				superStairsCount++;
				sipsAwarded += (participantTurn.turnOrder + 1) * 2;
			} else if (participantTurn.specialRollType === "shit_stairs") {
				shitStairsCount++;
			}
		}

		// Count sips received (turns where this participant was the target)
		// These also count toward total sipsDrunk
		for (const turn of roundModel.turns) {
			if (turn.sipsAwardedTo === participantId) {
				let amount = 0;
				if (turn.specialRollType === "stairs") {
					amount = turn.turnOrder + 1;
				} else if (turn.specialRollType === "super_stairs") {
					amount = (turn.turnOrder + 1) * 2;
				}
				sipsReceived += amount;
				sipsDrunk += amount;
			}
		}
	}

	// Count tiebreaker wins from consecutive round pairs
	for (let i = 0; i < roundModels.length - 1; i++) {
		const rm = roundModels[i];
		const nextRm = roundModels[i + 1];
		if (rm.status === "completed" && rm.losingParticipantIds.length > 1) {
			if (nextRm.startingParticipantId === participantId) {
				tiebreakerWins++;
			}
		}
	}

	return { participantId, roundsWon, roundsLost, sipsDrunk, sipsAwarded, sipsReceived, threeOfAKindCount, stairsCount, superStairsCount, shitStairsCount, lowestScoreCount, lowestScoreSipsDrunk, tiebreakerWins };
}

/**
 * Calculate global player stats across all games
 */
export async function getPlayerGlobalStats(
	playerId: number,
): Promise<PlayerGlobalStats> {
	const participations = await getParticipantsByPlayerId(playerId);

	let gamesPlayed = 0;
	let gamesWon = 0;
	let totalSipsDrunk = 0;
	let totalSipsAwarded = 0;

	for (const participation of participations) {
		const game = await getCompleteGame(participation.gameSessionId);
		if (!game || game.status !== "completed") continue;

		gamesPlayed++;

		const stats = await getParticipantStats(
			participation.id,
			participation.gameSessionId,
		);
		totalSipsDrunk += stats.sipsDrunk;
		totalSipsAwarded += stats.sipsAwarded;

		// Check if player won the game (had the fewest sips drunk)
		const allParticipants = await getGameParticipantsBySession(
			participation.gameSessionId,
		);
		const allStats = await Promise.all(
			allParticipants.map((p) =>
				getParticipantStats(p.id, participation.gameSessionId),
			),
		);

		const minSips = Math.min(...allStats.map((s) => s.sipsDrunk));
		if (stats.sipsDrunk === minSips) {
			gamesWon++;
		}
	}

	return { playerId, gamesPlayed, gamesWon, totalSipsDrunk, totalSipsAwarded };
}

/**
 * Create a player turn in a round
 */
export async function createPlayerTurn(
	gameSessionId: number,
	roundId: number,
	participantId: number,
	turnOrder: number,
): Promise<number> {
	const result = await db
		.insert(playerTurnsTable)
		.values({
			gameSessionId,
			roundId,
			participantId,
			turnOrder,
		})
		.returning();

	return result[0].id;
}
