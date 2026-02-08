"use server";

import type { GameModel } from "@/lib/models";
import {
	FAKE_GAME_SESSION_ID,
	getMockSession,
} from "@/lib/mock/game-session";

export async function createGameAction(data: {
	name: string;
	players: { name: string }[];
	randomTurnOrder: boolean;
}) {
	// TODO: Replace with actual DB call
	return { id: FAKE_GAME_SESSION_ID };
}

export async function getGameSessionAction(
	id: number,
	mockKey?: string,
): Promise<GameModel | null> {
	// TODO: Replace with actual DB call
	if (id === FAKE_GAME_SESSION_ID) {
		return getMockSession(mockKey);
	}

	return null;
}
