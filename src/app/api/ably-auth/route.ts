import Ably from "ably";
import { NextResponse } from "next/server";

export async function GET() {
  if (!process.env.ABLY_API_KEY) {
    return NextResponse.json(
      { error: "Ably is not configured" },
      { status: 503 },
    );
  }

  const client = new Ably.Rest(process.env.ABLY_API_KEY);
  const tokenRequest = await client.auth.createTokenRequest({
    clientId: crypto.randomUUID(),
    capability: { "game-session:*": ["subscribe", "presence"] },
  });
  return NextResponse.json(tokenRequest);
}
