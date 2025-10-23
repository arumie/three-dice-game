import process from "node:process";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";

config({ path: ".env.local" }); // or .env

// biome-ignore lint/style/noNonNullAssertion: Url should be available
export const db = drizzle(process.env.POSTGRES_URL!);