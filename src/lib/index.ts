// Export domain models

// Export service functions
export {
  createPlayerTurn,
  createRound,
  getCompleteGame,
  getCurrentRound,
  getLatestRound,
  getNextParticipantToPlay,
  getParticipantStats,
  getPlayerGlobalStats,
} from "./game-service";

// Export pure utility functions
export {
  calculatePenaltyFromTurns,
  calculateScore,
  computeLowestRollCounts,
  computeScoreToBeat,
  computeStairsSipsToAward,
  createPlayerOrder,
  createRollWithKept,
  detectSpecialRoll,
  findLosersFromTurns,
  getMaxRollsFromFirstTurn,
  getStartingParticipant,
  getThreeOfAKindSips,
  isRoundCompleteFromData,
  isSafeRoll,
  rollDice,
  shuffleArray,
  violatesGentlemanRule,
} from "./game-utils";

// Export mapper functions
export { mapGame, mapPlayerTurn, mapRoll, mapRound } from "./mappers";
export type {
  AggregatedPlayerStats,
  GameModel,
  ParticipantStats,
  PlayerGlobalStats,
  PlayerTurnModel,
  RollModel,
  RoundModel,
} from "./models";
