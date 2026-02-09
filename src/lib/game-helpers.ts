import type { GameModel, ParticipantStats, RoundModel } from "./models";
import type { SelectGameParticipant } from "@/db/schema";

/**
 * Get a participant's display name
 */
export function getParticipantName(participant: SelectGameParticipant): string {
	return participant.guestName ?? `Player ${participant.id}`;
}

/**
 * Get the display name for a participant ID from the session
 */
export function getNameById(
	participantId: number,
	participants: SelectGameParticipant[],
): string {
	const p = participants.find((p) => p.id === participantId);
	return p ? getParticipantName(p) : `Unknown`;
}

/**
 * Get the current (latest) round from a game session
 */
export function getCurrentRound(session: GameModel): RoundModel | null {
	if (session.rounds.length === 0) return null;
	return session.rounds[session.rounds.length - 1];
}

/**
 * Format a special roll type for display
 */
export function formatSpecialRoll(type: string): string | null {
	switch (type) {
		case "three_of_a_kind":
			return "Three of a Kind";
		case "stairs":
			return "Stairs";
		case "super_stairs":
			return "Super Stairs";
		case "shit_stairs":
			return "Shit Stairs";
		case "lowest":
			return "Lowest";
		default:
			return null;
	}
}

/**
 * Get the status badge variant for a game/round status
 */
export function getStatusVariant(
	status: string,
): "default" | "secondary" | "outline" | "destructive" {
	switch (status) {
		case "in_progress":
			return "default";
		case "completed":
			return "secondary";
		case "waiting":
			return "outline";
		default:
			return "outline";
	}
}

/**
 * Format a status string for display
 */
export function formatStatus(status: string): string {
	return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Compute basic participant stats from rounds (mock-friendly)
 */
export function computeParticipantStats(
	session: GameModel,
): ParticipantStats[] {
	const statsMap = new Map<number, ParticipantStats>();

	for (const p of session.participants) {
		statsMap.set(p.id, {
			participantId: p.id,
			roundsWon: 0,
			roundsLost: 0,
			sipsDrunk: 0,
			sipsAwarded: 0,
			sipsReceived: 0,
			threeOfAKindCount: 0,
			stairsCount: 0,
			superStairsCount: 0,
			shitStairsCount: 0,
			lowestScoreCount: 0,
			lowestScoreSipsDrunk: 0,
			tiebreakerWins: 0,
		});
	}

	for (const round of session.rounds) {
		// Count lowest rolls from ALL rounds (including in-progress)
		// since "everyone drinks 1 sip" triggers immediately on each roll
		for (const turn of round.turns) {
			const s = statsMap.get(turn.participantId);
			if (!s) continue;

			for (const roll of turn.rolls) {
				if (roll.specialRollType === "lowest") {
					s.lowestScoreCount += 1;
					for (const [, ps] of statsMap) {
						ps.lowestScoreSipsDrunk += 1;
						ps.sipsDrunk += 1;
					}
				}
			}
		}

		if (round.status !== "completed") continue;

		// Count special rolls, sips awarded, and sips received per turn
		for (const turn of round.turns) {
			const s = statsMap.get(turn.participantId);
			if (!s) continue;

			let sipsAmount = 0;
			if (turn.specialRollType === "three_of_a_kind") {
				s.threeOfAKindCount += 1;
			} else if (turn.specialRollType === "stairs") {
				s.stairsCount += 1;
				sipsAmount = turn.turnOrder + 1;
				s.sipsAwarded += sipsAmount;
			} else if (turn.specialRollType === "super_stairs") {
				s.superStairsCount += 1;
				sipsAmount = (turn.turnOrder + 1) * 2;
				s.sipsAwarded += sipsAmount;
			} else if (turn.specialRollType === "shit_stairs") {
				s.shitStairsCount += 1;
			}

			// Record sips received by the target (counts toward their total drunk)
			if (turn.sipsAwardedTo != null && sipsAmount > 0) {
				const target = statsMap.get(turn.sipsAwardedTo);
				if (target) {
					target.sipsReceived += sipsAmount;
					target.sipsDrunk += sipsAmount;
				}
			}
		}

		if (round.losingParticipantIds.length === 0 || !round.finalPenaltySips) continue;

		// Each loser drinks the full penalty
		for (const loserId of round.losingParticipantIds) {
			const loserStats = statsMap.get(loserId);
			if (loserStats) {
				loserStats.roundsLost += 1;
				loserStats.sipsDrunk += round.finalPenaltySips;
			}
		}

		// Everyone else "won" the round
		for (const p of session.participants) {
			if (!round.losingParticipantIds.includes(p.id)) {
				const s = statsMap.get(p.id);
				if (s) s.roundsWon += 1;
			}
		}
	}

	// Count tiebreaker wins from consecutive round pairs
	for (let i = 0; i < session.rounds.length - 1; i++) {
		const round = session.rounds[i];
		const nextRound = session.rounds[i + 1];
		if (round.status === "completed" && round.losingParticipantIds.length > 1) {
			const winnerId = nextRound.startingParticipantId;
			const s = statsMap.get(winnerId);
			if (s) s.tiebreakerWins += 1;
		}
	}

	return Array.from(statsMap.values());
}
