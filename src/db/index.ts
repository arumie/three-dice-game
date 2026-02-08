import process from "node:process";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

config({ path: ".env.local" });

// biome-ignore lint/style/noNonNullAssertion: Url should be available
const url = process.env.POSTGRES_URL!;

// Prevent connection pool exhaustion during Next.js hot reloading
const globalForDb = globalThis as unknown as { db: PostgresJsDatabase };
export const db: PostgresJsDatabase =
	globalForDb.db ?? drizzle(postgres(url));
if (process.env.NODE_ENV !== "production") {
	globalForDb.db = db;
}
