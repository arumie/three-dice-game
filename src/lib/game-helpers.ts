import type {
  AggregatedPlayerStats,
  GameModel,
  ParticipantStats,
  ParticipantWithPlayer,
  RoundModel,
} from "./models";

/**
 * Get a participant's display name.
 * For registered players, returns the player's username.
 * For guests, returns the guest name.
 */
export function getParticipantName(participant: ParticipantWithPlayer): string {
  if (participant.playerType === "registered" && participant.playerUsername) {
    return participant.playerUsername;
  }
  return participant.guestName ?? `Player ${participant.id}`;
}

/**
 * Get the display name for a participant ID from the session
 */
export function getNameById(
  participantId: number,
  participants: ParticipantWithPlayer[],
): string {
  const p = participants.find((p) => p.id === participantId);
  return p ? getParticipantName(p) : `Unknown`;
}

/**
 * Get the username for a participant (only for registered players).
 * Returns null for guests.
 */
export function getUsernameById(
  participantId: number,
  participants: ParticipantWithPlayer[],
): string | null {
  const p = participants.find((p) => p.id === participantId);
  if (!p || p.playerType !== "registered") return null;
  return p.playerUsername ?? null;
}

/**
 * Build a unique aggregation key for a participant.
 * Registered players: "player:{playerId}" (cross-game identity)
 * Guests: "guest:{guestId}" or "guest-name:{guestName}" (per-game identity)
 */
export function getAggregationKey(participant: ParticipantWithPlayer): string {
  if (participant.playerType === "registered" && participant.playerId != null) {
    return `player:${participant.playerId}`;
  }
  if (participant.guestId != null) {
    return `guest:${participant.guestId}`;
  }
  return `guest-name:${participant.guestName ?? participant.id}`;
}

/**
 * Create an empty AggregatedPlayerStats object
 */
export function emptyAggregatedStats(
  name: string,
  username: string | null,
): AggregatedPlayerStats {
  return {
    name,
    username,
    gamesPlayed: 0,
    gamesWon: 0,
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
  };
}

/**
 * Accumulate a single game's ParticipantStats into an AggregatedPlayerStats
 */
export function accumulateStats(
  existing: AggregatedPlayerStats,
  s: ParticipantStats,
  isWinner: boolean,
): void {
  existing.gamesPlayed += 1;
  if (isWinner) existing.gamesWon += 1;
  existing.roundsWon += s.roundsWon;
  existing.roundsLost += s.roundsLost;
  existing.sipsDrunk += s.sipsDrunk;
  existing.sipsAwarded += s.sipsAwarded;
  existing.sipsReceived += s.sipsReceived;
  existing.threeOfAKindCount += s.threeOfAKindCount;
  existing.stairsCount += s.stairsCount;
  existing.superStairsCount += s.superStairsCount;
  existing.shitStairsCount += s.shitStairsCount;
  existing.lowestScoreCount += s.lowestScoreCount;
  existing.lowestScoreSipsDrunk += s.lowestScoreSipsDrunk;
  existing.tiebreakerWins += s.tiebreakerWins;
}

/**
 * Get the current (latest) round from a game session
 */
export function getCurrentRound(session: GameModel): RoundModel | null {
  if (session.rounds.length === 0) return null;
  return session.rounds[session.rounds.length - 1];
}

/**
 * Determine the timestamp of the most recent activity in a game session.
 *
 * Activity is any event that advances the game: the session being created,
 * a round starting, a turn ending, or a die being rolled. This is used to
 * decide whether an in-progress game has gone stale (no activity for a while)
 * and should be auto-ended, using the returned time as the end time.
 */
export function getGameLastActivity(session: GameModel): Date {
  let last = session.createdAt;

  const consider = (date: Date | null | undefined) => {
    if (date && date.getTime() > last.getTime()) {
      last = date;
    }
  };

  for (const round of session.rounds) {
    consider(round.startedAt);
    for (const turn of round.turns) {
      consider(turn.endedAt);
      for (const roll of turn.rolls) {
        consider(roll.rolledAt);
      }
    }
  }

  return last;
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
 * Format a list of names for display.
 * Single name: "Alice"
 * Two names: "Alice and Bob"
 * Three+: "Alice, Bob, and Charlie"
 * Empty: null
 */
export function formatNamesList(names: string[]): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
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

    if (round.losingParticipantIds.length === 0 || !round.finalPenaltySips)
      continue;

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
