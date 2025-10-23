// Export domain models
export type {
	RollModel,
	PlayerTurnModel,
	RoundModel,
	GameModel,
	ParticipantStats,
	PlayerGlobalStats,
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
	isSuperStairsValid,
	isRoundCompleteFromData,
	getMaxRollsFromFirstTurn,
	calculatePenaltyFromTurns,
	findLoserFromTurns,
	shuffleArray,
	createPlayerOrder,
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
	wasPreviousTurnStairs,
	validateSuperStairs,
	getParticipantStats,
	getPlayerGlobalStats,
	createPlayerTurn,
} from "./game-service";

