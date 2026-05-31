"use client";

import { Bug, ChevronRight, FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createTestGameAction } from "@/app/actions";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewGameDebugPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCreateTestGame() {
    startTransition(async () => {
      const result = await createTestGameAction(adminPassword);
      if (result.success) {
        setTestOpen(false);
        toast.success("Test game created");
        router.push(`/game-session/${result.id}`);
      } else {
        setError(result.error);
      }
    });
  }

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
            className="h-7 gap-1.5 px-2 text-xs"
            disabled={isPending}
            onClick={() => setTestOpen(true)}
          >
            <FlaskConical className="size-3" />
            Test Game
          </Button>
        </div>
      )}

      <AlertDialog
        open={testOpen}
        onOpenChange={(v) => {
          setTestOpen(v);
          if (!v) {
            setAdminPassword("");
            setError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start test game</AlertDialogTitle>
            <AlertDialogDescription>
              Creates a throwaway game with 4 test players. This requires the
              admin password.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Input
            type="password"
            placeholder="Admin password"
            value={adminPassword}
            onChange={(e) => {
              setAdminPassword(e.target.value);
              setError(null);
            }}
            autoComplete="off"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending || !adminPassword}
              onClick={(e) => {
                e.preventDefault();
                handleCreateTestGame();
              }}
            >
              {isPending ? "Creating…" : "Start Test Game"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
