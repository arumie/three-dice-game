import type { SelectGameParticipant } from "@/db/schema";
import type { RoundModel } from "./models";

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;

type RosterParticipant = Pick<
  SelectGameParticipant,
  "firstRoundNumber" | "retiredAfterRoundNumber"
>;

/** True if participant should be in playerOrder for the given round number. */
export function isParticipantInRound(
  p: RosterParticipant,
  roundNumber: number,
): boolean {
  const from = p.firstRoundNumber ?? 1;
  if (roundNumber < from) return false;
  if (
    p.retiredAfterRoundNumber != null &&
    roundNumber > p.retiredAfterRoundNumber
  ) {
    return false;
  }
  return true;
}

/** True if participant is eligible for the next round after latest completed round N. */
export function isParticipantActiveForNextRound(
  p: RosterParticipant,
  latestCompletedRoundNumber: number,
): boolean {
  return isParticipantInRound(p, latestCompletedRoundNumber + 1);
}

export function countActiveForNextRound(
  participants: RosterParticipant[],
  latestCompletedRoundNumber: number,
): number {
  return participants.filter((p) =>
    isParticipantActiveForNextRound(p, latestCompletedRoundNumber),
  ).length;
}

/** Latest round must be completed; blocks mid-round roster changes. */
export function assertBetweenRounds(latestRound: RoundModel | null):
  | {
      ok: true;
      completedRoundNumber: number;
    }
  | { ok: false; error: string } {
  if (!latestRound) {
    return { ok: false, error: "No round has been started yet" };
  }
  if (latestRound.status !== "completed") {
    return {
      ok: false,
      error: "Roster changes are only allowed between rounds",
    };
  }
  if (latestRound.losingParticipantIds.length > 1) {
    return {
      ok: false,
      error: "Complete the tiebreaker before changing the roster",
    };
  }
  return { ok: true, completedRoundNumber: latestRound.roundNumber };
}
