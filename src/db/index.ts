import process from "node:process";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const isLocal = process.env.USE_LOCAL_DB === "true";

// biome-ignore lint/style/noNonNullAssertion: Url should be available
const url = process.env.POSTGRES_URL!;

type Database = NeonDatabase | PostgresJsDatabase;

function createDb(): Database {
	if (isLocal) {
		return drizzlePg(postgres(url));
	}
	const pool = new Pool({ connectionString: url });
	return drizzleNeon(pool);
}

// Prevent connection pool exhaustion during Next.js hot reloading
const globalForDb = globalThis as unknown as { db: Database };
export const db: Database = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== "production") {
	globalForDb.db = db;
}
