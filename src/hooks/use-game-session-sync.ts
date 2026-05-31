"use client";

import Ably from "ably";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CLIENT_ID, isGameSyncSuppressed } from "@/lib/game-sync";

export function useGameSessionSync(gameSessionId: number) {
  const router = useRouter();
  const clientRef = useRef<Ably.Realtime | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: CookieStore API is not supported in Firefox/Safari; document.cookie is intentional here.
    document.cookie = `game-sync-client-id=${CLIENT_ID}; path=/; samesite=strict`;

    const channelName = `game-session:${gameSessionId}`;

    const ably = new Ably.Realtime({ authUrl: "/api/ably-auth" });
    clientRef.current = ably;

    const channel = ably.channels.get(channelName);

    const REFRESH_DELAY_MS = 500;

    channel.subscribe("game-updated", (message) => {
      const senderId = message.data?.senderId;
      if (senderId === CLIENT_ID) return;
      if (isGameSyncSuppressed()) return;

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        if (isGameSyncSuppressed()) return;
        router.refresh();
      }, REFRESH_DELAY_MS);
    });

    channel.presence.enter();

    const updateViewerCount = () => {
      channel.presence.get().then((members) => {
        setViewerCount(members.length);
      });
    };
    channel.presence.subscribe(updateViewerCount);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      channel.presence.leave();
      channel.presence.unsubscribe();
      channel.unsubscribe();
      ably.close();
    };
  }, [gameSessionId, router]);

  return { viewerCount };
}
