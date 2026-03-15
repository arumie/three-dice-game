import { eq } from "drizzle-orm";
import { db } from "..";
import { guestsTable, type SelectGuest } from "../schema";

export async function createGuest(name: string): Promise<SelectGuest> {
  const [guest] = await db.insert(guestsTable).values({ name }).returning();
  return guest;
}

export async function getGuestById(id: number): Promise<SelectGuest | null> {
  const [guest] = await db
    .select()
    .from(guestsTable)
    .where(eq(guestsTable.id, id))
    .limit(1);
  return guest || null;
}
