"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  addPlayerToGameAction,
  verifyOrRegisterPlayerAction,
} from "@/app/actions";
import { VerifyIndicator } from "@/components/player-verify-indicator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { getParticipantName } from "@/lib/game-helpers";
import type { ParticipantWithPlayer } from "@/lib/models";
import {
  type PlayerVerifyStatus,
  USERNAME_MAX_LENGTH,
} from "@/lib/player-validation";

interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameSessionId: number;
  activeParticipants: ParticipantWithPlayer[];
  onAdded: () => void;
}

export function AddPlayerDialog({
  open,
  onOpenChange,
  gameSessionId,
  activeParticipants,
  onAdded,
}: AddPlayerDialogProps) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [playerId, setPlayerId] = useState<number | undefined>();
  const [verifyStatus, setVerifyStatus] = useState<PlayerVerifyStatus>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setName("");
    setPassword("");
    setPlayerId(undefined);
    setVerifyStatus("idle");
    setShowPassword(false);
  }

  async function handleVerify() {
    const trimmed = name.trim();
    const pw = password.trim();
    if (!trimmed || !pw) return;

    setVerifyStatus("verifying");
    setPlayerId(undefined);

    try {
      const result = await verifyOrRegisterPlayerAction(trimmed, pw);
      setVerifyStatus(result.status as PlayerVerifyStatus);
      if ("playerId" in result) {
        setPlayerId(result.playerId);
      }
      if (result.status === "wrong_password") {
        toast.error(`Wrong password for "${trimmed}"`);
      } else if (result.status === "available") {
        toast.success(`"${trimmed}" will be registered when added`);
      } else if (result.status === "invalid_username") {
        toast.error("Invalid username");
      }
    } catch {
      setVerifyStatus("idle");
      toast.error("Verification failed");
    }
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Player name is required");
      return;
    }
    if (trimmed.length > USERNAME_MAX_LENGTH) {
      toast.error("Player name must be 30 characters or less");
      return;
    }

    const duplicate = activeParticipants.some(
      (p) =>
        getParticipantName(p).trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      toast.error("A player with that name is already active");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addPlayerToGameAction({
        gameSessionId,
        name: trimmed,
        playerId,
        playerPassword: password.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added ${trimmed}`);
      resetForm();
      onOpenChange(false);
      onAdded();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Player</DialogTitle>
          <DialogDescription>
            Player joins the next round. Add a password to register or sign in
            to a profile.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            placeholder="Player name"
            value={name}
            maxLength={USERNAME_MAX_LENGTH}
            onChange={(e) => {
              setName(e.target.value);
              setVerifyStatus("idle");
              setPlayerId(undefined);
            }}
          />
          <InputGroup>
            <InputGroupInput
              type={showPassword ? "text" : "password"}
              placeholder="Password (optional)"
              value={password}
              autoComplete="new-password"
              onChange={(e) => {
                setPassword(e.target.value);
                setVerifyStatus("idle");
                setPlayerId(undefined);
              }}
              onBlur={() => void handleVerify()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleVerify();
                }
              }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                size="icon-xs"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </InputGroupButton>
              <VerifyIndicator status={verifyStatus} />
            </InputGroupAddon>
          </InputGroup>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
          >
            Add Player
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
