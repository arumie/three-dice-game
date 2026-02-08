import process from "node:process";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const isLocal = process.env.USE_LOCAL_DB === "true";

// biome-ignore lint/style/noNonNullAssertion: Url should be available
const url = process.env.POSTGRES_URL!;

type Database = NeonHttpDatabase | PostgresJsDatabase;

function createDb(): Database {
	if (isLocal) {
		return drizzlePg(postgres(url));
	}
	return drizzleNeon(neon(url));
}

// Prevent connection pool exhaustion during Next.js hot reloading
const globalForDb = globalThis as unknown as { db: Database };
export const db: Database = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== "production") {
	globalForDb.db = db;
}
