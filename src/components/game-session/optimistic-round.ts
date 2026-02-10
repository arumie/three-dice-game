import type { Dice } from "@/db/schema";
import type { PlayerTurnModel, RollModel, RoundModel } from "@/lib/models";
import { calculateScore, detectSpecialRoll, isSafeRoll } from "@/lib/game-utils";

export type OptimisticAction =
	| { type: "roll"; dice: Dice }
	| { type: "endTurn" };

export function applyOptimisticUpdate(
	currentRound: RoundModel,
	action: OptimisticAction,
): RoundModel {
	if (action.type === "roll") {
		const { dice } = action;
		const score = calculateScore(dice);
		let specialRollType = detectSpecialRoll(dice);

		// Downgrade super_stairs if the previous turn wasn't a normal stairs
		if (specialRollType === "super_stairs") {
			const completedTurns = currentRound.turns.filter((t) => t.isComplete);
			const prevTurn = completedTurns[completedTurns.length - 1];
			if (prevTurn?.specialRollType !== "stairs") {
				specialRollType = "none";
			}
		}

		const newRoll: RollModel = {
			id: -Date.now(),
			gameSessionId: currentRound.gameSessionId,
			playerTurnId: -1,
			rollNumber: 1,
			dice,
			rolledAt: new Date(),
			score,
			specialRollType,
		};

		// Find the active (in-progress) turn
		const activeTurn = currentRound.turns.find((t) => !t.isComplete && t.totalRollsUsed > 0);

		if (activeTurn) {
			// Re-roll: add roll to existing turn
			newRoll.playerTurnId = activeTurn.id;
			newRoll.rollNumber = activeTurn.totalRollsUsed + 1;
			const isSafe = isSafeRoll(specialRollType);
			const updatedTurns = currentRound.turns.map((t) => {
				if (t.id !== activeTurn.id) return t;
				const updatedRolls = [...t.rolls, newRoll];
				return {
					...t,
					rolls: updatedRolls,
					totalRollsUsed: updatedRolls.length,
					finalScore: isSafe ? null : score,
					isSafe,
					specialRollType,
				};
			});
			return { ...currentRound, turns: updatedTurns };
		}

		// First roll: create optimistic turn
		const nextParticipantId = currentRound.playerOrder.find(
			(pid) => !currentRound.turns.some((t) => t.participantId === pid),
		);
		if (nextParticipantId == null) return currentRound;

		const isSafe = isSafeRoll(specialRollType);
		const newTurn: PlayerTurnModel = {
			id: -Date.now(),
			gameSessionId: currentRound.gameSessionId,
			roundId: currentRound.id,
			participantId: nextParticipantId,
			turnOrder: currentRound.turns.length,
			endedAt: null,
			sipsAwardedTo: null,
			rolls: [newRoll],
			totalRollsUsed: 1,
			finalScore: isSafe ? null : score,
			isSafe,
			specialRollType,
			completedAt: new Date(),
			isComplete: false,
		};
		return { ...currentRound, turns: [...currentRound.turns, newTurn] };
	}

	if (action.type === "endTurn") {
		// Mark the active turn as complete
		const updatedTurns = currentRound.turns.map((t) => {
			if (!t.isComplete && t.totalRollsUsed > 0) {
				return { ...t, isComplete: true, endedAt: new Date() };
			}
			return t;
		});
		return { ...currentRound, turns: updatedTurns };
	}

	return currentRound;
}
