"use cache";

import { cacheLife, cacheTag } from "next/cache";
import { getPlayerByUsername as getPlayerByUsernameQuery } from "@/db/queries";
import { getAllGameSessions as getAllGameSessionsQuery } from "@/db/queries/gameSessions";
import type { SelectPlayer } from "@/db/schema";
import { ALL_GAMES_TAG, gameSessionTag, playerTag } from "@/lib/cache-tags";
import { getCompleteGame } from "@/lib/game-service";
import type { GameModel } from "@/lib/models";

/**
 * Cached game session fetcher.
 *
 * Import and call from any Server Component — the result is cached
 * and automatically invalidated when a server action calls
 * `updateTag(gameSessionTag(id))`.
 *
 * Uses the "default" cache profile:
 *   stale: 5 min, revalidate: 15 min, expire: never
 * In practice mutations always trigger `updateTag` so the data is
 * refreshed immediately after every game action.
 */
export async function getGameSession(id: number): Promise<GameModel | null> {
  cacheTag(gameSessionTag(id));
  cacheLife("default");
  return getCompleteGame(id);
}

/**
 * Cached list of all game sessions (full GameModel for each).
 *
 * Invalidated when games are created or completed via
 * `updateTag(ALL_GAMES_TAG)`.
 */
export async function getPlayer(
  username: string,
): Promise<SelectPlayer | null> {
  cacheTag(playerTag(username));
  cacheLife("default");
  return getPlayerByUsernameQuery(username);
}

export async function getAllGames(): Promise<GameModel[]> {
  cacheTag(ALL_GAMES_TAG);
  cacheLife("default");

  const sessions = await getAllGameSessionsQuery();
  const games = await Promise.all(sessions.map((s) => getCompleteGame(s.id)));
  return games.filter((g): g is GameModel => g !== null);
}
