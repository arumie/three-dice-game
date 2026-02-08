import { cookies } from "next/headers";
import crypto from "crypto";
import { getGameSessionById } from "@/db/queries/gameSessions";

function hashPassword(password: string): string {
	return crypto.createHash("sha256").update(password).digest("hex");
}

function cookieName(gameSessionId: number): string {
	return `game-auth-${gameSessionId}`;
}

/**
 * Set the auth cookie after successful password verification.
 * HttpOnly, SameSite=Strict, scoped to the game session path.
 */
export async function setGameAuthCookie(
	gameSessionId: number,
	password: string,
): Promise<void> {
	const cookieStore = await cookies();
	const hash = hashPassword(password);

	cookieStore.set(cookieName(gameSessionId), hash, {
		httpOnly: true,
		sameSite: "strict",
		path: "/",
		secure: process.env.NODE_ENV === "production",
		// 30 days
		maxAge: 60 * 60 * 24 * 30,
	});
}

/**
 * Check that the caller has a valid auth cookie for this game.
 * Throws if the cookie is missing, invalid, or the game has no password set.
 *
 * Games with an empty password (legacy/default) are treated as open — no auth required.
 */
export async function requireGameAuth(
	gameSessionId: number,
): Promise<void> {
	const session = await getGameSessionById(gameSessionId);
	if (!session) {
		throw new Error("Game session not found");
	}

	// Games with empty password are open (no auth required)
	if (!session.password) {
		return;
	}

	const cookieStore = await cookies();
	const token = cookieStore.get(cookieName(gameSessionId))?.value;

	if (!token) {
		throw new Error("Not authenticated for this game session");
	}

	const expectedHash = hashPassword(session.password);
	if (token !== expectedHash) {
		throw new Error("Invalid game session authentication");
	}
}

/**
 * Check if a game session requires a password.
 */
export async function gameRequiresPassword(
	gameSessionId: number,
): Promise<boolean> {
	const session = await getGameSessionById(gameSessionId);
	if (!session) return false;
	return session.password.length > 0;
}
