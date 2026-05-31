import { getGameLastActivity } from "@/lib/game-helpers";
import type {
  AggregatedPlayerStats,
  GameModel,
  ParticipantStats,
} from "@/lib/models";

export const GAMES_LIST_PAGE_SIZE = 5;
export const PLAYERS_LIST_PAGE_SIZE = 10;

export interface GameListEntry {
  session: GameModel;
  stats: ParticipantStats[];
}

export interface PlayerListEntry {
  player: { id: number; username: string };
  memberSince: string;
  stats: AggregatedPlayerStats;
}

/** Sort games by most recent activity first (within a section). */
export function compareGamesByLastActivity(
  a: GameListEntry,
  b: GameListEntry,
): number {
  const aTime = getGameLastActivity(a.session).getTime();
  const bTime = getGameLastActivity(b.session).getTime();
  return bTime - aTime;
}

/** Sort players by sips drunk first, then games/rounds won, then username. */
export function comparePlayersBySipsDrunk(
  a: PlayerListEntry,
  b: PlayerListEntry,
): number {
  if (b.stats.sipsDrunk !== a.stats.sipsDrunk) {
    return b.stats.sipsDrunk - a.stats.sipsDrunk;
  }
  if (b.stats.gamesWon !== a.stats.gamesWon) {
    return b.stats.gamesWon - a.stats.gamesWon;
  }
  if (b.stats.roundsWon !== a.stats.roundsWon) {
    return b.stats.roundsWon - a.stats.roundsWon;
  }
  return a.player.username.localeCompare(b.player.username);
}
