import Ably from "ably";
import { cookies } from "next/headers";

let client: Ably.Rest | null = null;

function getClient(): Ably.Rest | null {
  if (!process.env.ABLY_API_KEY) return null;
  if (!client) {
    client = new Ably.Rest(process.env.ABLY_API_KEY);
  }
  return client;
}

/**
 * Read the sync client ID from the request cookie.
 * Must be called while the request context is still active (before fire-and-forget).
 */
export async function getSyncSenderId(): Promise<string | undefined> {
  return (await cookies()).get("game-sync-client-id")?.value;
}

export function publishGameUpdate(gameSessionId: number, senderId?: string) {
  const ably = getClient();
  if (!ably) return;

  const channelName = `game-session:${gameSessionId}`;
  const channel = ably.channels.get(channelName);
  channel
    .publish("game-updated", { senderId, timestamp: Date.now() })
    .catch(() => {});
}
