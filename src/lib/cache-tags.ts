/**
 * Consistent cache tag for a specific game session.
 * Use this in server actions with `updateTag(gameSessionTag(id))`
 * to invalidate cached game state after mutations.
 */
export function gameSessionTag(id: number): string {
  return `game-session-${id}`;
}

/**
 * Cache tag for the all-games list.
 * Invalidated when games are created or completed.
 */
export const ALL_GAMES_TAG = "all-games";

/**
 * Cache tag for a player profile lookup by username.
 * Invalidated when a new player is created.
 */
export function playerTag(username: string): string {
  return `player-${username.toLowerCase()}`;
}

/**
 * Cache tag for the all-players list.
 * Invalidated when a new player is created.
 */
export const ALL_PLAYERS_TAG = "all-players";
