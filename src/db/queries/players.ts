import { sql } from "drizzle-orm";
import { db } from "..";
import { playersTable, type SelectPlayer } from "../schema";

export async function createPlayer(data: {
  username: string;
  passwordHash: string;
}): Promise<SelectPlayer> {
  const [player] = await db.insert(playersTable).values(data).returning();
  return player;
}

export async function getPlayerById(id: number): Promise<SelectPlayer | null> {
  const [player] = await db
    .select()
    .from(playersTable)
    .where(sql`${playersTable.id} = ${id}`)
    .limit(1);
  return player || null;
}

export async function getPlayerByUsername(
  username: string,
): Promise<SelectPlayer | null> {
  const [player] = await db
    .select()
    .from(playersTable)
    .where(sql`lower(${playersTable.username}) = ${username.toLowerCase()}`)
    .limit(1);
  return player || null;
}

export async function updatePlayer(
  id: number,
  data: Partial<Pick<SelectPlayer, "username" | "passwordHash">>,
): Promise<SelectPlayer | null> {
  const [player] = await db
    .update(playersTable)
    .set(data)
    .where(sql`${playersTable.id} = ${id}`)
    .returning();
  return player || null;
}

export async function deletePlayer(id: number): Promise<boolean> {
  const result = await db
    .delete(playersTable)
    .where(sql`${playersTable.id} = ${id}`)
    .returning();
  return result.length > 0;
}

export async function getAllPlayers(limit?: number): Promise<SelectPlayer[]> {
  const query = db.select().from(playersTable);
  if (limit) {
    return await query.limit(limit);
  }
  return await query;
}
