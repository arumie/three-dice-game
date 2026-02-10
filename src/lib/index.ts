// Export domain models
export type {
	RollModel,
	PlayerTurnModel,
	RoundModel,
	GameModel,
	ParticipantStats,
	PlayerGlobalStats,
	AggregatedPlayerStats,
} from "./models";

// Export pure utility functions
export {
	calculateScore,
	detectSpecialRoll,
	isSafeRoll,
	getThreeOfAKindSips,
	rollDice,
	createRollWithKept,
	getStartingParticipant,
	isRoundCompleteFromData,
	getMaxRollsFromFirstTurn,
	calculatePenaltyFromTurns,
	findLosersFromTurns,
	shuffleArray,
	createPlayerOrder,
	violatesGentlemanRule,
} from "./game-utils";

// Export mapper functions
export { mapRoll, mapPlayerTurn, mapRound, mapGame } from "./mappers";

// Export service functions
export {
	getCompleteGame,
	getLatestRound,
	getCurrentRound,
	getNextParticipantToPlay,
	createRound,
	getParticipantStats,
	getPlayerGlobalStats,
	createPlayerTurn,
} from "./game-service";

