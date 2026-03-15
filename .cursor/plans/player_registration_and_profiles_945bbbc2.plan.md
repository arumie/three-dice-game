---
name: Player Registration and Profiles
overview: Add player registration and profiles with cross-game stats. Registration and verification happen inline in the new game form. Add a guests table for unique guest identity. Profile pages at `/player/[username]` show aggregated stats. Global stats aggregate by playerId/guestId instead of name strings.
todos:
  - id: schema
    content: Modify playersTable (add passwordHash, remove userId/displayName), add guestsTable, add guestId FK to gameParticipantsTable. Run drizzle-kit push.
    status: completed
  - id: guest-migration
    content: "Write a migration script: for each guest participant row, create a guest record and backfill guestId on game_participants."
    status: completed
  - id: player-queries
    content: "Update src/db/queries/players.ts: remove getPlayerByUserId, make getPlayerByUsername case-insensitive, update createPlayer signature."
    status: completed
  - id: guest-queries
    content: Create src/db/queries/guests.ts with createGuest and getGuestById.
    status: completed
  - id: player-auth
    content: Create src/lib/player-auth.ts using Bun.password (argon2id) with PEPPER_SECRET env var for hashPlayerPassword and verifyPlayerPassword.
    status: completed
  - id: verify-action
    content: Add verifyOrRegisterPlayerAction(username, password) server action with admin password fallback.
    status: completed
  - id: new-game-form
    content: "Rework new-game-form.tsx: add password field per player, inline verify/register flow with status indicators, trigger on Enter/blur."
    status: completed
  - id: create-game-action
    content: "Update createGameAction: use playerId for registered players, use createGuest + guestId for guests."
    status: completed
  - id: display-names
    content: Add left join on playersTable in game fetch query; create extended ParticipantWithPlayer type; update getParticipantName.
    status: completed
  - id: stats-helper
    content: Refactor stats aggregation in /games page to key by playerId/guestId instead of name strings; extract reusable helper.
    status: completed
  - id: profile-page
    content: "Create /player/[username] profile page: reuse cached getAllGames(), filter to player's games, aggregate and display stats."
    status: completed
  - id: profile-links
    content: Add profile links for registered players in game summary card, GlobalStatsCard, and game state card.
    status: completed
isProject: false
---

# Player Registration and Profiles

## Approach

No login/logout or session management. The new game form is the single entry point for both registering new players and verifying existing ones. Each player slot gets an optional password field. A new `guests` table gives each guest a unique ID per game (no cross-game guest identity -- only registered players have that). Global stats aggregate by `playerId`/`guestId` (not name strings), so a registered "Alice" and a guest "Alice" are separate identities. Profile pages at `/player/[username]` display cross-game stats for registered players only.

## Schema Changes

**[src/db/schema.ts](src/db/schema.ts)**:

### Modify `playersTable`

- Add `passwordHash: varchar("password_hash", { length: 255 }).notNull()`
- Remove `userId` column (unused -- currently hardcoded to `"local"` everywhere)
- Remove `displayName` column (not needed -- username is the display name)
- Keep `username` (unique, max 50) as the sole identifier and display name
- Validate username format at the application level via zod regex: `/^[a-zA-Z0-9_-]+$/`
- Store usernames as-entered (preserving case for display), but use `lower()` in queries for case-insensitive lookups and uniqueness checks

```typescript
export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("players_username_lower_idx").on(sql`lower(${t.username})`),
]);
```

Note: uses a functional unique index on `lower(username)` instead of a plain `.unique()` so that "Alice" and "alice" are treated as the same username, while preserving the original casing for display.

### Add `guestsTable`

New table giving each guest a unique ID. Each guest record is per-game -- two guests named "Alice" in different games are separate records. Only registered players have cross-game identity.

```typescript
export const guestsTable = pgTable("guests", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

No unique constraint on `name` -- the same name can appear multiple times (one per game).

### Modify `gameParticipantsTable`

Add a `guestId` FK alongside the existing `playerId`:

```typescript
guestId: integer("guest_id").references(() => guestsTable.id),
```

After migration, `guestName` becomes redundant (the name lives in `guestsTable`), but we keep it for backward compatibility and as a denormalized convenience. Guest participants will have both `guestId` and `guestName` set.

Run `drizzle-kit push` to apply all schema changes.

### Guest Migration

Write a one-time migration script (e.g., `scripts/migrate-guests.ts`) that:

1. Queries all `game_participants` rows where `playerType = 'guest'`
2. For **each row**, creates a new `guestsTable` record with the `guestName`
3. Updates that `game_participants` row to set `guestId` to the newly created guest's ID

Each existing guest participant gets its own unique guest record (no deduplication by name). This can be run manually after `drizzle-kit push`.

## New Game Form UX

**[src/components/new-game-form.tsx](src/components/new-game-form.tsx)** -- Rework each player row:

Current layout per player:

```
[Name input] [X remove]
```

New layout per player:

```
[Name input] [Password input] [verify status icon] [X remove]
```

- Password field is optional. If left empty, the player is a guest (same as today).
- Verification triggers automatically on **Enter keypress** or **blur** on either the username or password input, but only when both fields are non-empty. No separate "Verify" button needed.
- The server action `verifyOrRegisterPlayerAction(username, password)` returns one of:
  - `{ status: "verified", playerId }` -- existing player, correct password
  - `{ status: "registered", playerId }` -- new player created
  - `{ status: "admin_verified", playerId }` -- existing player, verified via admin password override
  - `{ status: "wrong_password" }` -- existing player, wrong password (and no valid admin password)
  - `{ status: "no_password" }` -- no password provided, treat as guest
- On success (`verified` / `registered` / `admin_verified`), show a green checkmark and store the `playerId` in form state.
- On `registered`, briefly show "New player!" or similar feedback.
- On `wrong_password`, show red indicator with error text.
- On name change, reset the verification status.
- If the same registered player (same `playerId`) is verified in two different slots, show an error -- a registered player can only appear once per game.

### Admin Password Override

If a player forgets their password, the admin password (env `ADMIN_PASSWORD`, already used for game deletion) can be entered instead. The verify action checks: if the player's own password doesn't match, fall back to checking against the admin password. If the admin password matches, the player is verified as `admin_verified` (same effect as `verified` -- they're linked as a registered participant). This reuses the existing `ADMIN_PASSWORD` env var.

Update the zod schema to include `password` and `playerId` per player:

```typescript
z.object({
  name: z.string().min(1).max(50),
  password: z.string().max(100).optional(),
  playerId: z.number().optional(), // set by verification, not by user
})
```

## Server Actions

**[src/app/actions.ts](src/app/actions.ts)** -- Add/modify:

### `verifyOrRegisterPlayerAction(username, password)`

1. If no password provided, return `{ status: "no_password" }`
2. Validate username format (`/^[a-zA-Z0-9_-]+$/`)
3. Look up player by username using `lower()` for case-insensitive match
4. If player exists:
  - Verify password hash -- if correct, return `{ status: "verified", playerId }`
  - If wrong, check if password matches `ADMIN_PASSWORD` env var -- if so, return `{ status: "admin_verified", playerId }`
  - Otherwise return `{ status: "wrong_password" }`
5. If player doesn't exist: hash password, insert new row into `playersTable`, return `{ status: "registered", playerId }`

### Modify `createGameAction`

Accept players as `{ name: string; playerId?: number }[]`. For each player:

- If `playerId` is set, call `createRegisteredParticipant(sessionId, playerId)`
- Otherwise, call `createGuest(name)` to create a new guest record, then call `createGuestParticipant(sessionId, guestId, name)`

Update `createGuestParticipant` in [src/db/queries/gameParticipants.ts](src/db/queries/gameParticipants.ts) to also accept and set `guestId`.

## DB Queries

### Existing file: [src/db/queries/players.ts](src/db/queries/players.ts) (modify, not new)

- Remove `getPlayerByUserId()` (references deleted `userId` column)
- Update `getPlayerByUsername()` to use `lower()` for case-insensitive lookup: `where(sql\`lower(username) = ${username.toLowerCase()})`
- Update `createPlayer()` signature to accept `{ username, passwordHash }`
- Update `updatePlayer()` to remove reference to `userId`
- Keep `getPlayerById()`, `deletePlayer()`, `getAllPlayers()` as-is

### New file: [src/db/queries/guests.ts](src/db/queries/guests.ts)

- `createGuest(name)` -- always creates a new guest record, returns it
- `getGuestById(id)` -- by primary key

## Password Hashing

**New file: [src/lib/player-auth.ts](src/lib/player-auth.ts)**:

Uses `Bun.password` (argon2id by default, automatic per-password salting, salt embedded in the hash string) with a **pepper** (server-side secret from env var `PEPPER_SECRET`):

- `hashPlayerPassword(password)` -- prepends the pepper to the password, then calls `await Bun.password.hash(pepper + password)`. Returns a PHC-format string like `$argon2id$v=19$m=65536,t=2,p=1$<salt>$<hash>`.
- `verifyPlayerPassword(password, hash)` -- prepends the same pepper, then calls `await Bun.password.verify(pepper + password, hash)`.

The pepper is read from `process.env.PEPPER_SECRET`. If not set, fall back to an empty string (with a dev-mode warning). This means even if the DB is stolen, the attacker also needs the server secret to brute-force passwords. The full salt+hash fits in `varchar(255)`.

Add `PEPPER_SECRET` to `.env.example` with a placeholder value.

## Display Name Resolution (Option A -- Eager Join)

**[src/db/queries/common.ts](src/db/queries/common.ts)** -- In `getFullGameState()`, add a left join on `playersTable` when fetching participants so each row includes the player's `username`:

```typescript
// Instead of:
db.select().from(gameParticipantsTable).where(...)
// Do:
db.select({
  ...getTableColumns(gameParticipantsTable),
  playerUsername: playersTable.username,
}).from(gameParticipantsTable)
  .leftJoin(playersTable, eq(gameParticipantsTable.playerId, playersTable.id))
  .where(...)
```

### Extended type

Create a `ParticipantWithPlayer` type that extends `SelectGameParticipant` with `playerUsername: string | null`. This type replaces `SelectGameParticipant` in:

- `FullGameState.participants`
- `GameModel.participants`
- All component props that receive participants

**[src/lib/game-helpers.ts](src/lib/game-helpers.ts)** -- Update `getParticipantName()`:

- For registered participants (`playerType === "registered"`), return `playerUsername`
- For guests, continue returning `guestName` as today

## Stats Aggregation

### Refactor aggregation key

**[src/app/games/page.tsx](src/app/games/page.tsx)** (L37-92) -- Currently aggregates by `name` string. Change to aggregate by a composite key:

- Registered players: `"player:" + playerId`
- Guests: `"guest:" + guestId` (falling back to `"guest-name:" + guestName` if guestId not yet backfilled) -- each guest is unique per game, so they appear as individual entries

This ensures a registered "Alice" and a guest "Alice" have separate stats. Guests don't accumulate cross-game stats since each game creates a new guest record -- only registered players get meaningful cross-game aggregation.

### Extract reusable helper

**[src/lib/game-helpers.ts](src/lib/game-helpers.ts)** -- Extract the aggregation logic into a reusable function for use in both `/games` page and `/player/[username]` profile page.

## Profile Page

**New file: [src/app/player/[username]/page.tsx**](src/app/player/[username]/page.tsx):

Server component that:

1. Looks up the player by username via `getPlayerByUsername()` (case-insensitive, so `/player/alice` and `/player/Alice` both work)
2. Calls the cached `getAllGames()` and filters to games where this player has a participant entry (matching by `playerId`)
3. For each matching game, computes `ParticipantStats` using existing `computeParticipantStats()`
4. Aggregates into `AggregatedPlayerStats` using the extracted helper
5. Displays:
  - Player username and "member since" date
  - Aggregated stats grid (reuse the stat card layout from `GlobalStatsCard`)
  - Personal awards (best per-game stats)
  - Game history list with links to `/game-session/[id]/summary`

**New file: [src/components/player-profile/player-stats-card.tsx](src/components/player-profile/player-stats-card.tsx)**:

- Reuses the visual patterns from `GlobalStatsCard` but for a single player's aggregated stats.

## Navigation to Profiles

- **Game summary page** ([src/components/game-session/game-summary-card.tsx](src/components/game-session/game-summary-card.tsx)): For registered players, make names clickable links to `/player/[username]` in these locations:
  - The winner banner heading ("{name} wins!")
  - Each player row in the "Final Standings" leaderboard
  - Player names in the "Game Awards" section
- **Global stats** ([src/components/games-list/global-stats-card.tsx](src/components/games-list/global-stats-card.tsx)): make player names in all-time awards clickable links to `/player/[username]` (only for registered players).
- **Game state card**: make registered player names link to their profile during active games too.

## Files Summary

**New files:**

- `src/db/schema.ts` -- add `guestsTable` (existing file, new table)
- `src/db/queries/guests.ts` -- guest DB queries
- `src/lib/player-auth.ts` -- password hash/verify
- `src/app/player/[username]/page.tsx` -- profile page
- `src/components/player-profile/player-stats-card.tsx` -- profile stats display
- `scripts/migrate-guests.ts` -- one-time guest migration script

**Modified files:**

- `src/db/schema.ts` -- update `playersTable` (add `passwordHash`, remove `userId`/`displayName`), update `gameParticipantsTable` (add `guestId` FK)
- `src/db/queries/players.ts` -- remove `getPlayerByUserId`, update signatures, case-insensitive lookup
- `src/db/queries/gameParticipants.ts` -- update `createGuestParticipant` to accept `guestId`
- `src/db/queries/common.ts` -- add left join on `playersTable` in `getFullGameState()`
- `src/app/actions.ts` -- add `verifyOrRegisterPlayerAction`, update `createGameAction`
- `src/components/new-game-form.tsx` -- add password field per player, verification flow
- `src/lib/game-helpers.ts` -- extract aggregation helper, update `getParticipantName`
- `src/lib/models.ts` -- add `ParticipantWithPlayer` type; extend `AggregatedPlayerStats` with optional `username: string | null` for profile linking
- `src/app/games/page.tsx` -- use extracted aggregation helper, key by playerId/guestId
- `src/components/game-session/game-summary-card.tsx` -- link registered player names to profiles
- `src/components/games-list/global-stats-card.tsx` -- link player names to profiles

