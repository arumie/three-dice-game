"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bug,
  ClipboardCopy,
  Database,
  RefreshCw,
  Check,
  ChevronRight,
  Trash2,
  RotateCcw,
  UserRoundPlus,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  invalidateCacheAction,
  getRawGameDataAction,
  deleteGameSessionAction,
  reopenGameSessionAction,
  reassignGuestToPlayerAction,
} from "@/app/actions";
import type { GameModel, ParticipantWithPlayer } from "@/lib/models";
import { getParticipantName } from "@/lib/game-helpers";

interface DebugPanelProps {
  session: GameModel;
  gameSessionId: number;
}

export function DebugPanel({ session, gameSessionId }: DebugPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copiedState, setCopiedState] = useState(false);
  const [copiedDb, setCopiedDb] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenPassword, setReopenPassword] = useState("");
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignParticipant, setReassignParticipant] =
    useState<ParticipantWithPlayer | null>(null);
  const [reassignUsername, setReassignUsername] = useState("");
  const [reassignPassword, setReassignPassword] = useState("");
  const [reassignError, setReassignError] = useState<string | null>(null);
  const isCompleted = session.status === "completed";
  const guestParticipants = session.participants.filter(
    (p) => p.playerType === "guest",
  );

  function handleCopyState() {
    const json = JSON.stringify(session, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    });
  }

  function handleCopyDbRows() {
    startTransition(async () => {
      const data = await getRawGameDataAction(gameSessionId);
      const json = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(json);
      setCopiedDb(true);
      setTimeout(() => setCopiedDb(false), 2000);
    });
  }

  function handleInvalidateCache() {
    startTransition(async () => {
      await invalidateCacheAction(gameSessionId);
    });
  }

  function handleDeleteSession() {
    startTransition(async () => {
      const result = await deleteGameSessionAction(
        gameSessionId,
        adminPassword,
      );
      if (result.success) {
        setDeleteOpen(false);
        toast.success("Game session deleted");
        router.push("/");
      } else {
        setDeleteError(result.error ?? "Something went wrong");
      }
    });
  }

  function handleReopenSession() {
    startTransition(async () => {
      const result = await reopenGameSessionAction(
        gameSessionId,
        reopenPassword,
      );
      if (result.success) {
        setReopenOpen(false);
        toast.success("Game session reopened");
        router.push(`/game-session/${gameSessionId}`);
      } else {
        setReopenError(result.error ?? "Something went wrong");
      }
    });
  }

  function openReassignDialog(participant: ParticipantWithPlayer) {
    setReassignParticipant(participant);
    setReassignUsername("");
    setReassignPassword("");
    setReassignError(null);
    setReassignOpen(true);
  }

  function handleReassignGuest() {
    if (!reassignParticipant) return;
    startTransition(async () => {
      const result = await reassignGuestToPlayerAction(
        reassignParticipant.id,
        reassignUsername,
        reassignPassword,
      );
      if (result.success) {
        setReassignOpen(false);
        toast.success(
          `"${getParticipantName(reassignParticipant)}" reassigned to ${reassignUsername}`,
        );
        router.refresh();
      } else {
        setReassignError(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 hidden items-end gap-1.5 lg:flex">
      {/* Toggle button */}
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

      {/* Expandable panel */}
      {open && (
        <div className="flex items-center gap-1.5 rounded-lg border bg-background/95 p-1.5 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80 animate-in slide-in-from-left-2 fade-in-0 duration-150">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={handleCopyState}
          >
            {copiedState ? (
              <Check className="size-3 text-green-500" />
            ) : (
              <ClipboardCopy className="size-3" />
            )}
            {copiedState ? "Copied" : "State"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            disabled={isPending}
            onClick={handleCopyDbRows}
          >
            {copiedDb ? (
              <Check className="size-3 text-green-500" />
            ) : (
              <Database className="size-3" />
            )}
            {copiedDb ? "Copied" : "DB"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            disabled={isPending}
            onClick={handleInvalidateCache}
          >
            <RefreshCw
              className={`size-3 ${isPending ? "animate-spin" : ""}`}
            />
            Cache
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3" />
            Delete
          </Button>
          {isCompleted && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-amber-600 hover:text-amber-600"
              disabled={isPending}
              onClick={() => setReopenOpen(true)}
            >
              <RotateCcw className="size-3" />
              Reopen
            </Button>
          )}
          {guestParticipants.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-blue-600 hover:text-blue-600"
              disabled={isPending}
              onClick={() => openReassignDialog(guestParticipants[0])}
            >
              <UserRoundPlus className="size-3" />
              Reassign
            </Button>
          )}
        </div>
      )}

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(v) => {
          setDeleteOpen(v);
          if (!v) {
            setAdminPassword("");
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete game session</AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible. Enter the admin password to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            placeholder="Admin password"
            value={adminPassword}
            onChange={(e) => {
              setAdminPassword(e.target.value);
              setDeleteError(null);
            }}
            autoComplete="off"
          />
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending || !adminPassword}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteSession();
              }}
            >
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={reopenOpen}
        onOpenChange={(v) => {
          setReopenOpen(v);
          if (!v) {
            setReopenPassword("");
            setReopenError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen game session</AlertDialogTitle>
            <AlertDialogDescription>
              This will reopen the game session so players can continue playing.
              Enter the admin password to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            placeholder="Admin password"
            value={reopenPassword}
            onChange={(e) => {
              setReopenPassword(e.target.value);
              setReopenError(null);
            }}
            autoComplete="off"
          />
          {reopenError && (
            <p className="text-sm text-destructive">{reopenError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending || !reopenPassword}
              onClick={(e) => {
                e.preventDefault();
                handleReopenSession();
              }}
            >
              {isPending ? "Reopening…" : "Reopen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={reassignOpen}
        onOpenChange={(v) => {
          setReassignOpen(v);
          if (!v) {
            setReassignParticipant(null);
            setReassignUsername("");
            setReassignPassword("");
            setReassignError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign guest to player</DialogTitle>
            <DialogDescription>
              Link a guest participant to a registered player account. Their
              game stats will be attributed to that player.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="reassign-guest" className="text-sm font-medium">
                Guest
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {guestParticipants.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    variant={
                      reassignParticipant?.id === p.id ? "default" : "outline"
                    }
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => {
                      setReassignParticipant(p);
                      setReassignError(null);
                    }}
                  >
                    {getParticipantName(p)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="reassign-username"
                className="text-sm font-medium"
              >
                Registered player username
              </Label>
              <Input
                id="reassign-username"
                placeholder="Username"
                value={reassignUsername}
                onChange={(e) => {
                  setReassignUsername(e.target.value);
                  setReassignError(null);
                }}
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="reassign-admin-password"
                className="text-sm font-medium"
              >
                Admin password
              </Label>
              <Input
                id="reassign-admin-password"
                type="password"
                placeholder="Admin password"
                value={reassignPassword}
                onChange={(e) => {
                  setReassignPassword(e.target.value);
                  setReassignError(null);
                }}
                autoComplete="off"
              />
            </div>

            {reassignError && (
              <p className="text-sm text-destructive">{reassignError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                isPending ||
                !reassignParticipant ||
                !reassignUsername.trim() ||
                !reassignPassword
              }
              onClick={handleReassignGuest}
            >
              {isPending ? "Reassigning…" : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
