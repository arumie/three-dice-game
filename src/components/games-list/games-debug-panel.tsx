"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Bug, ChevronRight, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { endGameSessionAction } from "@/app/actions";

interface InProgressGame {
  id: number;
  name: string;
}

interface GamesDebugPanelProps {
  inProgressGames: InProgressGame[];
}

export function GamesDebugPanel({ inProgressGames }: GamesDebugPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<InProgressGame | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleEndGame() {
    if (!selectedGame) return;
    startTransition(async () => {
      const result = await endGameSessionAction(selectedGame.id, adminPassword);
      if (result.success) {
        setEndOpen(false);
        toast.success(`Game "${selectedGame.name}" ended`);
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  }

  if (inProgressGames.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 hidden items-end gap-1.5 lg:flex">
      <Button
        variant="outline"
        size="icon"
        className="size-8 shrink-0 rounded-full border bg-background/95 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80"
        onClick={() => setOpen((v) => !v)}
        title="Toggle debug panel"
      >
        {open ? (
          <ChevronRight className="size-3.5 rotate-180" />
        ) : (
          <Bug className="size-3.5 text-muted-foreground" />
        )}
      </Button>

      {open && (
        <div className="flex items-center gap-1.5 rounded-lg border bg-background/95 p-1.5 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80 animate-in slide-in-from-left-2 fade-in-0 duration-150">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={() => setEndOpen(true)}
          >
            <Square className="size-3" />
            End Game
          </Button>
        </div>
      )}

      <AlertDialog
        open={endOpen}
        onOpenChange={(v) => {
          setEndOpen(v);
          if (!v) {
            setSelectedGame(null);
            setAdminPassword("");
            setError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End game session</AlertDialogTitle>
            <AlertDialogDescription>
              Select an in-progress game to mark as completed. This requires the
              admin password.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Game</Label>
              <div className="flex flex-wrap gap-1.5">
                {inProgressGames.map((game) => (
                  <Button
                    key={game.id}
                    type="button"
                    variant={
                      selectedGame?.id === game.id ? "default" : "outline"
                    }
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => {
                      setSelectedGame(game);
                      setError(null);
                    }}
                  >
                    {game.name}{" "}
                    <span className="text-muted-foreground ml-1">
                      #{game.id}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="end-game-admin-password"
                className="text-sm font-medium"
              >
                Admin password
              </Label>
              <Input
                id="end-game-admin-password"
                type="password"
                placeholder="Admin password"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setError(null);
                }}
                autoComplete="off"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending || !selectedGame || !adminPassword}
              onClick={(e) => {
                e.preventDefault();
                handleEndGame();
              }}
            >
              {isPending ? "Ending…" : "End Game"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
