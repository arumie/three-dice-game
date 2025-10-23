import {
	index,
	integer,
	json,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";

// Enums
export const playerTypeEnum = pgEnum("player_type", ["registered", "guest"]);
export const specialRollTypeEnum = pgEnum("special_roll_type", [
	"three_of_a_kind",
	"stairs",
	"super_stairs",
	"shit_stairs",
	"none",
]);

// Players table - for registered players
export const playersTable = pgTable("players", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull().unique(),
	username: varchar("username", { length: 50 }).notNull().unique(),
	displayName: varchar("display_name", { length: 100 }),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Game session configuration type
export type GameSessionConfig = {
	name: string;
	randomTurnOrder: boolean;
};

// Game sessions table
export const gameSessionsTable = pgTable("game_sessions", {
	id: serial("id").primaryKey(),
	ownerId: text("owner_id").notNull(),
	config: json("config").notNull().$type<GameSessionConfig>(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	completedAt: timestamp("completed_at"),
});

// Game participants - links players (registered or guest) to game sessions
export const gameParticipantsTable = pgTable(
	"game_participants",
	{
		id: serial("id").primaryKey(),
		gameSessionId: integer("game_session_id")
			.notNull()
			.references(() => gameSessionsTable.id, { onDelete: "cascade" }),
		playerId: integer("player_id").references(() => playersTable.id),
		playerType: playerTypeEnum("player_type").notNull(),
		guestName: varchar("guest_name", { length: 50 }),
		joinedAt: timestamp("joined_at").notNull().defaultNow(),
	},
	(t) => [
		unique("unique_participant").on(t.gameSessionId, t.playerId),
		index("game_participants_session_idx").on(t.gameSessionId),
	]);

// Rounds table - each round in a game
export const roundsTable = pgTable(
	"rounds",
	{
		id: serial("id").primaryKey(),
		gameSessionId: integer("game_session_id")
			.notNull()
			.references(() => gameSessionsTable.id, { onDelete: "cascade" }),
		roundNumber: integer("round_number").notNull(),
		playerOrder: json("player_order").notNull().$type<number[]>(),
		startedAt: timestamp("started_at").notNull().defaultNow(),
	},
	(t) => [
		index("rounds_session_idx").on(t.gameSessionId),
	]);

// Player turns - each participant's turn in a round
export const playerTurnsTable = pgTable(
	"player_turns",
	{
		id: serial("id").primaryKey(),
		gameSessionId: integer("game_session_id")
			.notNull()
			.references(() => gameSessionsTable.id, { onDelete: "cascade" }),
		roundId: integer("round_id")
			.notNull()
			.references(() => roundsTable.id, { onDelete: "cascade" }),
		participantId: integer("participant_id")
			.notNull()
			.references(() => gameParticipantsTable.id),
		turnOrder: integer("turn_order").notNull(),
	},
	(t) => [
		index("player_turns_session_idx").on(t.gameSessionId),
	]);

// Individual rolls - each dice roll within a turn
export const rollsTable = pgTable(
	"rolls",
	{
		id: serial("id").primaryKey(),
		gameSessionId: integer("game_session_id")
			.notNull()
			.references(() => gameSessionsTable.id, { onDelete: "cascade" }),
		playerTurnId: integer("player_turn_id")
			.notNull()
			.references(() => playerTurnsTable.id, { onDelete: "cascade" }),
		rollNumber: integer("roll_number").notNull(),
		dice: json("dice").notNull().$type<
			{
				value: number;
				kept: boolean;
			}[]
		>(),
		rolledAt: timestamp("rolled_at").notNull().defaultNow(),
	},
	(t) => [
		index("rolls_session_idx").on(t.gameSessionId),
	]);

// TypeScript types
export type Dice = { value: number; kept: boolean }[];
export type SpecialRollType =
	| "three_of_a_kind"
	| "stairs"
	| "super_stairs"
	| "shit_stairs"
	| "none";

export type InsertPlayer = typeof playersTable.$inferInsert;
export type InsertGameSession = typeof gameSessionsTable.$inferInsert;
export type InsertGameParticipant = typeof gameParticipantsTable.$inferInsert;
export type InsertRound = typeof roundsTable.$inferInsert;
export type InsertPlayerTurn = typeof playerTurnsTable.$inferInsert;
export type InsertRoll = typeof rollsTable.$inferInsert;

export type SelectPlayer = typeof playersTable.$inferSelect;
export type SelectGameSession = typeof gameSessionsTable.$inferSelect;
export type SelectGameParticipant = typeof gameParticipantsTable.$inferSelect;
export type SelectRound = typeof roundsTable.$inferSelect;
export type SelectPlayerTurn = typeof playerTurnsTable.$inferSelect;
export type SelectRoll = typeof rollsTable.$inferSelect;
