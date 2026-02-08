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
