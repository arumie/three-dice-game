/**
 * One-time migration script: backfill guestId on existing guest participants.
 *
 * For each game_participants row with playerType='guest', creates a new
 * guests record and sets the guestId FK on the participant row.
 *
 * Run after `drizzle-kit push`:
 *   bun run scripts/migrate-guests.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, isNull, and } from "drizzle-orm";
import { gameParticipantsTable, guestsTable } from "../src/db/schema";

async function main() {
  const { db } = await import("../src/db");

  const guestParticipants = await db
    .select()
    .from(gameParticipantsTable)
    .where(
      and(
        eq(gameParticipantsTable.playerType, "guest"),
        isNull(gameParticipantsTable.guestId),
      ),
    );

  console.log(
    `Found ${guestParticipants.length} guest participants without guestId`,
  );

  let migrated = 0;
  for (const participant of guestParticipants) {
    const name = participant.guestName ?? `Guest ${participant.id}`;

    const [guest] = await db.insert(guestsTable).values({ name }).returning();

    await db
      .update(gameParticipantsTable)
      .set({ guestId: guest.id })
      .where(eq(gameParticipantsTable.id, participant.id));

    migrated++;
  }

  console.log(`Migrated ${migrated} guest participants`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
