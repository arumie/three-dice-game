"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GENTLEMAN_RULE_MESSAGES = [
  {
    title: "Where's Your Honor?",
    text: (score: number, scoreToBeat: number) =>
      `You're sitting at ${score} points and only need to beat ${scoreToBeat}. You still have rolls left — you might get three ones! A true gentleman would risk it all.`,
  },
  {
    title: "Have You No Shame?",
    text: (score: number, scoreToBeat: number) =>
      `${score} points against a measly ${scoreToBeat}? Come on, that's not even a contest. Roll again and give someone else a fighting chance!`,
  },
  {
    title: "Coward's Way Out?",
    text: (score: number, scoreToBeat: number) =>
      `Ending at ${score} when the score to beat is just ${scoreToBeat}? That's playing it safe to the extreme. Where's the thrill? Roll those dice!`,
  },
  {
    title: "Really?",
    text: (score: number, scoreToBeat: number) =>
      `You've got ${score} points, the lowest is ${scoreToBeat}, and you still have rolls to spare. Even your grandma would re-roll. Don't be that guy.`,
  },
];

export function GentlemanRuleDialog({
  open,
  onOpenChange,
  currentScore,
  scoreToBeat,
  onEndTurn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentScore: number;
  scoreToBeat: number;
  onEndTurn: () => void;
}) {
  const [messageIndex] = useState(() =>
    Math.floor(Math.random() * GENTLEMAN_RULE_MESSAGES.length),
  );
  const message = GENTLEMAN_RULE_MESSAGES[messageIndex];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="border-amber-500/30 bg-amber-500/10">
            <ShieldAlert className="text-amber-500" />
          </AlertDialogMedia>
          <AlertDialogTitle>{message.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {message.text(currentScore, scoreToBeat)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction variant="destructive" onClick={onEndTurn}>
            End Turn Anyway
          </AlertDialogAction>
          <AlertDialogCancel>I&apos;ll Roll Again</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
