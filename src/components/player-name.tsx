import Link from "next/link";
import type { ParticipantWithPlayer } from "@/lib/models";
import { getNameById, getUsernameById } from "@/lib/game-helpers";

interface PlayerNameByIdProps {
  participantId: number;
  participants: ParticipantWithPlayer[];
  className?: string;
  linked?: boolean;
}

interface PlayerNameDirectProps {
  participant: ParticipantWithPlayer;
  className?: string;
  linked?: boolean;
}

type PlayerNameProps = PlayerNameByIdProps | PlayerNameDirectProps;

function resolve(props: PlayerNameProps) {
  if ("participant" in props) {
    const { participant } = props;
    const name =
      participant.playerType === "registered" && participant.playerUsername
        ? participant.playerUsername
        : (participant.guestName ?? `Player ${participant.id}`);
    const username =
      participant.playerType === "registered"
        ? (participant.playerUsername ?? null)
        : null;
    const guestId =
      participant.playerType === "guest" ? participant.guestId : null;
    return { name, username, guestId };
  }
  const { participantId, participants } = props;
  const participant = participants.find((p) => p.id === participantId);
  const name = getNameById(participantId, participants);
  const username = getUsernameById(participantId, participants);
  const guestId =
    participant?.playerType === "guest" ? (participant.guestId ?? null) : null;
  return { name, username, guestId };
}

export function PlayerName(props: PlayerNameProps) {
  const { name, username, guestId } = resolve(props);
  const { className, linked = false } = props;

  if (linked && username) {
    return (
      <Link
        href={`/player/${encodeURIComponent(username)}`}
        className={`underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground ${className ?? ""}`}
      >
        {name}
      </Link>
    );
  }

  return (
    <span
      className={className}
      title={guestId != null ? `Guest #${guestId}` : undefined}
    >
      {name}
    </span>
  );
}
