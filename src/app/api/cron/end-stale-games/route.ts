import { updateTag } from "next/cache";
import { NextResponse } from "next/server";
import { publishGameUpdate } from "@/lib/ably-server";
import { ALL_GAMES_TAG, gameSessionTag } from "@/lib/cache-tags";
import { endStaleInProgressGames } from "@/lib/stale-games";

/**
 * Cron endpoint that ends in-progress games with no activity for 12+ hours,
 * using each game's last-activity time as its end time.
 *
 * Scheduled via `vercel.json`. Vercel attaches `Authorization: Bearer
 * $CRON_SECRET`; when CRON_SECRET is set we require it so the endpoint can't
 * be triggered by arbitrary callers.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const ended = await endStaleInProgressGames();

  for (const game of ended) {
    updateTag(gameSessionTag(game.id));
    publishGameUpdate(game.id);
  }
  if (ended.length > 0) {
    updateTag(ALL_GAMES_TAG);
  }

  return NextResponse.json({
    endedCount: ended.length,
    ended: ended.map((g) => ({
      id: g.id,
      completedAt: g.completedAt.toISOString(),
    })),
  });
}
