/**
 * Consistent cache tag for a specific game session.
 * Use this in server actions with `updateTag(gameSessionTag(id))`
 * to invalidate cached game state after mutations.
 */
export function gameSessionTag(id: number): string {
	return `game-session-${id}`;
}
