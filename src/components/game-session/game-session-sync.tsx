"use client";

import { useGameSessionSync } from "@/hooks/use-game-session-sync";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GameSessionSync({ gameSessionId }: { gameSessionId: number }) {
  const { viewerCount } = useGameSessionSync(gameSessionId);

  if (viewerCount <= 1) return null;

  return (
    <div className="fixed bottom-4 left-14 z-50 hidden lg:block">
      <Button
        variant="outline"
        size="icon"
        className="relative size-8 rounded-full border bg-background/95 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80 pointer-events-none"
        title={`${viewerCount} viewing`}
      >
        <Eye className="size-3.5 text-muted-foreground" />
        <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {viewerCount}
        </span>
      </Button>
    </div>
  );
}
