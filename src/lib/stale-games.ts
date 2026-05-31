import {
  completeGameSession,
  getInProgressGameSessions,
} from "@/db/queries/gameSessions";
import { getGameLastActivity } from "@/lib/game-helpers";
import { getCompleteGame } from "@/lib/game-service";
import type { GameModel } from "@/lib/models";

/**
 * How long an in-progress game can go without any activity before it is
 * considered abandoned and automatically ended. Defaults to 12 hours.
 */
export const STALE_GAME_THRESHOLD_MS = 12 * 60 * 60 * 1000;

/**
 * Whether a game should be auto-ended: it must still be running and its last
 * activity must be older than the stale threshold relative to `now`.
 *
 * Pure function (no DB/IO) so it can be unit tested.
 */
export function isGameStale(
  session: GameModel,
  now: Date = new Date(),
  thresholdMs: number = STALE_GAME_THRESHOLD_MS,
): boolean {
  if (session.status === "completed") return false;
  const lastActivity = getGameLastActivity(session);
  return now.getTime() - lastActivity.getTime() >= thresholdMs;
}

export interface EndedStaleGame {
  id: number;
  /** The last-activity time used as the game's end time. */
  completedAt: Date;
}

/**
 * Find in-progress games that have had no activity for at least the stale
 * threshold and end them, using each game's last-activity time as its end
 * time. Returns the games that were ended.
 *
 * This performs DB writes but does NOT invalidate Next.js caches or publish
 * realtime updates — callers (e.g. the cron route) are responsible for that,
 * since those APIs are only valid in request/route contexts.
 */
export async function endStaleInProgressGames(
  now: Date = new Date(),
  thresholdMs: number = STALE_GAME_THRESHOLD_MS,
): Promise<EndedStaleGame[]> {
  const sessions = await getInProgressGameSessions();
  if (sessions.length === 0) return [];

  const games = await Promise.all(sessions.map((s) => getCompleteGame(s.id)));

  const ended: EndedStaleGame[] = [];

  for (const game of games) {
    if (!game) continue;
    if (!isGameStale(game, now, thresholdMs)) continue;

    const completedAt = getGameLastActivity(game);
    await completeGameSession(game.id, completedAt);
    ended.push({ id: game.id, completedAt });
  }

  return ended;
}
