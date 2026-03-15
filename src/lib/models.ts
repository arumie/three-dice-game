import type {
  SelectGameParticipant,
  SelectGameSession,
  SelectPlayerTurn,
  SelectRoll,
  SelectRound,
  SpecialRollType,
} from "../db/schema";

/**
 * Roll domain model with calculated fields
 */
export interface RollModel extends SelectRoll {
  score: number;
  specialRollType: SpecialRollType;
}

/**
 * PlayerTurn domain model with calculated fields
 */
export interface PlayerTurnModel extends SelectPlayerTurn {
  rolls: RollModel[];
  totalRollsUsed: number;
  finalScore: number | null;
  isSafe: boolean;
  specialRollType: SpecialRollType;
  completedAt: Date;
  /** True when the turn is done (endedAt set). Set by mapRound. */
  isComplete: boolean;
}

/**
 * Round domain model with calculated fields
 */
export interface RoundModel extends SelectRound {
  turns: PlayerTurnModel[];
  status: "in_progress" | "completed";
  startingParticipantId: number;
  maxRollsAllowed: number;
  currentPenaltySips: number;
  finalPenaltySips: number | null;
  losingParticipantIds: number[];
  completedAt: Date | null;
  /** True when the round ended because the first player rolled a special on their first roll (false start). */
  falseStart: boolean;
  /** True when the round completed but every player was safe (no loser). */
  allSafe: boolean;
}

/**
 * Participant with joined player username (for registered players)
 */
export interface ParticipantWithPlayer extends SelectGameParticipant {
  playerUsername: string | null;
}

/**
 * GameSession domain model with calculated fields
 */
export interface GameModel extends SelectGameSession {
  participants: ParticipantWithPlayer[];
  rounds: RoundModel[];
  status: "waiting" | "in_progress" | "completed";
  startedAt: Date | null;
}

/**
 * Participant statistics for a game session
 */
export interface ParticipantStats {
  participantId: number;
  roundsWon: number;
  roundsLost: number;
  sipsDrunk: number;
  sipsAwarded: number;
  sipsReceived: number;
  threeOfAKindCount: number;
  stairsCount: number;
  superStairsCount: number;
  shitStairsCount: number;
  lowestScoreCount: number;
  lowestScoreSipsDrunk: number;
  tiebreakerWins: number;
}

/**
 * Global player statistics across all games
 */
export interface PlayerGlobalStats {
  playerId: number;
  gamesPlayed: number;
  gamesWon: number;
  totalSipsDrunk: number;
  totalSipsAwarded: number;
}

/**
 * Aggregated player statistics across all games, keyed by playerId (registered) or guestId (guest)
 */
export interface AggregatedPlayerStats {
  name: string;
  username: string | null;
  gamesPlayed: number;
  gamesWon: number;
  roundsWon: number;
  roundsLost: number;
  sipsDrunk: number;
  sipsAwarded: number;
  sipsReceived: number;
  threeOfAKindCount: number;
  stairsCount: number;
  superStairsCount: number;
  shitStairsCount: number;
  lowestScoreCount: number;
  lowestScoreSipsDrunk: number;
  tiebreakerWins: number;
}
