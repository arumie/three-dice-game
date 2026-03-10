"use client";

import { useState } from "react";
import { Beer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { SelectGameParticipant } from "@/db/schema";
import { getParticipantName } from "@/lib/game-helpers";

interface AwardSipsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sipsToAward: number;
  participants: SelectGameParticipant[];
  currentParticipantId: number;
  onConfirm: (targetParticipantId: number) => void;
}

export function AwardSipsDialog({
  open,
  onOpenChange,
  sipsToAward,
  participants,
  currentParticipantId,
  onConfirm,
}: AwardSipsDialogProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const otherPlayers = participants.filter(
    (p) => p.id !== currentParticipantId,
  );

  function handleConfirm() {
    if (selectedId === null) return;
    onConfirm(selectedId);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beer className="size-5" />
            Award Sips
          </DialogTitle>
          <DialogDescription>
            You rolled stairs! Choose a player to award{" "}
            <span className="font-semibold text-foreground">
              {sipsToAward} {sipsToAward === 1 ? "sip" : "sips"}
            </span>{" "}
            to.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          {otherPlayers.map((p) => {
            const name = getParticipantName(p);
            const isSelected = selectedId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-accent/50",
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{name}</span>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedId === null}>
            Award {sipsToAward} {sipsToAward === 1 ? "sip" : "sips"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
