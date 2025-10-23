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
	getGameParticipantsBySession,
	getGameSessionById,
	getLatestRound as getLatestRoundQuery,
	getMaxRoundNumber,
	getParticipantsByPlayerId,
	getPlayerTurnsByRound,
	getRollsByPlayerTurn,
	getRoundsBySession,
} from "../db/queries";
import { createPlayerOrder, isSuperStairsValid } from "./game-utils";
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
 * Create a new round with player order based on game config
 */
export async function createRound(
	gameSessionId: number,
	startingParticipantId: number,
	allParticipantIds: number[],
	options: {
		shuffleOrder?: boolean; // Override config setting
	} = {},
): Promise<number> {
	// Get game session config
	const session = await getGameSessionById(gameSessionId);

	if (!session) {
		throw new Error(`Game session ${gameSessionId} not found`);
	}

	// Use override or game config setting
	const shuffleOrder =
		options.shuffleOrder ?? session.config.randomTurnOrder;

	// Get the next round number
	const latestRoundNumber = await getMaxRoundNumber(gameSessionId);

	// Create player order starting with the starting participant
	const playerOrder = createPlayerOrder(
		startingParticipantId,
		allParticipantIds,
		shuffleOrder,
	);

	const result = await db
		.insert(roundsTable)
		.values({
			gameSessionId,
			roundNumber: latestRoundNumber + 1,
			playerOrder,
		})
		.returning({ id: roundsTable.id });

	return result[0].id;
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
		if (roundModel.status !== "completed") continue;

		// Check if this participant lost
		if (roundModel.losingParticipantId === participantId) {
			roundsLost++;
			sipsDrunk += roundModel.finalPenaltySips || 0;
		} else if (roundModel.losingParticipantId) {
			roundsWon++;
		}

		// Check if this participant awarded sips (stairs/super stairs)
		const participantTurn = roundModel.turns.find(
			(t) => t.participantId === participantId,
		);
		if (
			participantTurn?.specialRollType === "stairs" ||
			participantTurn?.specialRollType === "super_stairs"
		) {
			const awardedSips =
				participantTurn.turnOrder *
				(participantTurn.specialRollType === "super_stairs" ? 2 : 1);
			sipsAwarded += awardedSips;
		}
	}

	return { participantId, roundsWon, roundsLost, sipsDrunk, sipsAwarded };
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
		.returning({ id: playerTurnsTable.id });

	return result[0].id;
}
