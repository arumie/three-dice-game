# Database Queries

This folder contains all database query functions organized by table. Each file provides a clean API for interacting with the database.

## File Structure

- **`players.ts`** - Registered player operations (create, read, update, delete)
- **`gameSessions.ts`** - Game session operations (create, read, update, delete)
- **`gameParticipants.ts`** - Game participant operations (create, read only)
- **`rounds.ts`** - Round operations (create, read only)
- **`playerTurns.ts`** - Player turn operations (create, read only)
- **`rolls.ts`** - Roll operations (create, read only)
- **`common.ts`** - Complex queries that join multiple tables
- **`index.ts`** - Central export for all query functions
- **`CONFIG.md`** - Game session configuration documentation

## Design Principles

### CRUD Operations

Only **players** and **game sessions** support full CRUD (Create, Read, Update, Delete):
- These are the top-level entities that users manage directly
- Other tables use **cascade delete** through game sessions

Other tables only support **Create** and **Read**:
- They represent immutable game events
- Deleting a game session automatically deletes all related data

### Index Optimization

All query functions that fetch related data now require `gameSessionId` as a parameter for optimal performance:

```typescript
// These functions use composite filters with gameSessionId
getRoundById(roundId, gameSessionId)
getPlayerTurnsByRound(roundId, gameSessionId)
getRollsByPlayerTurn(turnId, gameSessionId)
getPlayerTurn(roundId, participantId, gameSessionId)
getLatestRoll(turnId, gameSessionId)
getRollByNumber(turnId, rollNumber, gameSessionId)
```

**Benefits:**
- Leverages indexed `gameSessionId` columns on all tables
- More selective queries = better performance
- Enables partition pruning if you scale to partitioned tables
- Adds validation that entities belong to the same game

### Cascade Delete Strategy

```
gameSession (delete)
  └─> gameParticipants (cascade)
  └─> rounds (cascade)
      └─> playerTurns (cascade)
          └─> rolls (cascade)
```

Deleting a game session automatically removes:
- All participants
- All rounds
- All player turns
- All rolls

## Usage Examples

### Basic Operations

```typescript
import {
  createGameSession,
  createPlayer,
  createGuestParticipant,
  createRound,
  createPlayerTurn,
  createRoll
} from '@/db/queries';

// Create a game with custom config
const session = await createGameSession({
  ownerId: "user123",
  config: {
    name: "Friday Night Dice",
    randomTurnOrder: true
  }
});

// Add a guest
const participant = await createGuestParticipant(session.id, "Alice");

// Start a round
const round = await createRound({
  gameSessionId: session.id,
  roundNumber: 1,
  playerOrder: [participant.id]
});

// Create a turn
const turn = await createPlayerTurn({
  gameSessionId: session.id,
  roundId: round.id,
  participantId: participant.id,
  turnOrder: 1
});

// Add a roll
const roll = await createRoll({
  gameSessionId: session.id,
  playerTurnId: turn.id,
  rollNumber: 1,
  dice: [
    { value: 6, kept: false },
    { value: 3, kept: false },
    { value: 2, kept: false }
  ]
});
```

### Complex Queries

```typescript
import {
  getFullGameState,
  getFullRound,
  getGameWithParticipants,
  getParticipantStats
} from '@/db/queries';

// Get complete game state (all data in parallel)
const gameState = await getFullGameState(sessionId);
console.log(gameState.session);
console.log(gameState.participants);
console.log(gameState.rounds);
console.log(gameState.turns);
console.log(gameState.rolls);

// Get a round with all turns and rolls
const fullRound = await getFullRound(roundId);
for (const { turn, participant, rolls } of fullRound.turns) {
  console.log(`${participant.guestName}: ${rolls.length} rolls`);
}

// Get game with participant details
const game = await getGameWithParticipants(sessionId);
for (const { participant, player } of game.participants) {
  console.log(player ? player.username : participant.guestName);
}

// Get participant statistics
const stats = await getParticipantStats(sessionId);
for (const stat of stats) {
  console.log(`${stat.participant.guestName}: ${stat.totalRolls} rolls`);
}
```

### Update and Delete (Players and Sessions Only)

```typescript
import {
  updatePlayer,
  deletePlayer,
  updateGameSession,
  completeGameSession,
  deleteGameSession
} from '@/db/queries';

// Update a player
await updatePlayer(playerId, {
  displayName: "New Name"
});

// Delete a player
await deletePlayer(playerId);

// Complete a game session
await completeGameSession(sessionId);

// Update a game session
await updateGameSession(sessionId, {
  completedAt: new Date()
});

// Delete a game session (cascades to all related data)
await deleteGameSession(sessionId);
```

## API Reference

### Players (`players.ts`)

- `createPlayer(data)` - Create a new registered player
- `getPlayerById(id)` - Get player by ID
- `getPlayerByUserId(userId)` - Get player by auth user ID
- `getPlayerByUsername(username)` - Get player by username
- `updatePlayer(id, data)` - Update player details
- `deletePlayer(id)` - Delete a player
- `getAllPlayers(limit?)` - Get all players

### Game Sessions (`gameSessions.ts`)

- `createGameSession(data)` - Create a new game session (with optional config)
- `getGameSessionById(id)` - Get session by ID
- `getGameSessionsByOwner(ownerId)` - Get all sessions for an owner
- `updateGameSession(id, data)` - Update a session (merges config changes)
- `updateGameSessionConfig(id, config)` - Update only the config
- `completeGameSession(id)` - Mark session as completed
- `deleteGameSession(id)` - Delete session (cascades to all related data)
- `getAllGameSessions(limit?)` - Get all sessions

**Configuration:**
Game sessions support a `config` object with:
- `name: string` - Display name for the game
- `randomTurnOrder: boolean` - Randomize player order each round

See `CONFIG.md` for full configuration documentation.

### Game Participants (`gameParticipants.ts`)

- `createGameParticipant(data)` - Create a participant
- `createRegisteredParticipant(sessionId, playerId)` - Add a registered player
- `createGuestParticipant(sessionId, guestName)` - Add a guest player
- `getGameParticipantById(id)` - Get participant by ID
- `getGameParticipantsBySession(sessionId)` - Get all participants in a game
- `getGameParticipant(sessionId, playerId)` - Get specific participant
- `getParticipantsByPlayerId(playerId)` - Get all participations for a player

### Rounds (`rounds.ts`)

- `createRound(data)` - Create a new round
- `getRoundById(id, gameSessionId)` - Get round by ID (optimized with gameSessionId)
- `getRoundsBySession(sessionId)` - Get all rounds in a game
- `getLatestRound(sessionId)` - Get the most recent round
- `getRoundByNumber(sessionId, roundNumber)` - Get specific round
- `getMaxRoundNumber(sessionId)` - Get highest round number

### Player Turns (`playerTurns.ts`)

- `createPlayerTurn(data)` - Create a new turn
- `getPlayerTurnById(id)` - Get turn by ID
- `getPlayerTurnsByRound(roundId)` - Get all turns in a round
- `getPlayerTurnsBySession(sessionId)` - Get all turns in a game
- `getPlayerTurnsByParticipant(participantId)` - Get all turns for a participant
- `getPlayerTurn(roundId, participantId)` - Get specific turn
- `hasParticipantTakenTurn(roundId, participantId)` - Check if turn exists

### Rolls (`rolls.ts`)

- `createRoll(data)` - Create a new roll
- `getRollById(id)` - Get roll by ID
- `getRollsByPlayerTurn(playerTurnId)` - Get all rolls for a turn
- `getRollsBySession(sessionId)` - Get all rolls in a game
- `getLatestRoll(playerTurnId)` - Get the most recent roll for a turn
- `getRollByNumber(playerTurnId, rollNumber)` - Get specific roll
- `countRollsByPlayerTurn(playerTurnId)` - Count rolls for a turn

### Common Queries (`common.ts`)

Complex queries that join multiple tables:

#### `getFullGameState(sessionId): FullGameState | null`
Get complete game state with all related data in parallel.

Returns:
```typescript
{
  session: SelectGameSession,
  participants: SelectGameParticipant[],
  rounds: SelectRound[],
  turns: SelectPlayerTurn[],
  rolls: SelectRoll[]
}
```

#### `getFullRound(roundId): FullRound | null`
Get a complete round with all turns and rolls.

Returns:
```typescript
{
  round: SelectRound,
  turns: Array<{
    turn: SelectPlayerTurn,
    participant: SelectGameParticipant,
    rolls: SelectRoll[]
  }>
}
```

#### `getLatestFullRound(sessionId): FullRound | null`
Get the most recent round with all data.

#### `getParticipantsWithPlayers(sessionId): ParticipantWithPlayer[]`
Get all participants with their player details (for registered players).

Returns:
```typescript
Array<{
  participant: SelectGameParticipant,
  player: SelectPlayer | null
}>
```

#### `getGameWithParticipants(sessionId): GameWithParticipants | null`
Get a game session with all participants and their details.

Returns:
```typescript
{
  session: SelectGameSession,
  participants: ParticipantWithPlayer[]
}
```

#### `getParticipantStats(sessionId): ParticipantGameStats[]`
Get statistics for all participants in a game.

Returns:
```typescript
Array<{
  participant: SelectGameParticipant,
  roundsPlayed: number,
  totalRolls: number
}>
```

## Performance Considerations

### Indexes

All tables are indexed on `gameSessionId` for fast lookups:
- Single-query access to all game data
- Efficient cascade deletes
- Optimized for real-time game state reconstruction

### Parallel Queries

Complex queries use `Promise.all()` to fetch data in parallel:
```typescript
const [sessions, participants, rounds] = await Promise.all([...]);
```

### Batch Operations

When possible, fetch related data in batch queries rather than individual lookups:
```typescript
// Good: Single query for all participants
const participants = await getGameParticipantsBySession(sessionId);

// Bad: Multiple queries
for (const id of participantIds) {
  await getGameParticipantById(id); // Don't do this!
}
```

## Best Practices

1. **Use type-safe functions** - All functions use Drizzle-inferred types
2. **Leverage cascade deletes** - Don't manually delete related data
3. **Use common queries** - For complex joins, use `common.ts` functions
4. **Batch lookups** - Fetch multiple records in single queries
5. **Use indexes** - All `gameSessionId` queries are optimized

## Migration Path

If you need to add new query functions:

1. Add to appropriate table file (`players.ts`, `rounds.ts`, etc.)
2. Export from `index.ts`
3. Document in this README
4. Consider if it should be in `common.ts` (if it joins tables)

## Testing

When testing queries:

```typescript
// Create test data
const session = await createGameSession({ ownerId: "test" });
const participant = await createGuestParticipant(session.id, "TestUser");

// Run your test
// ...

// Cleanup (cascade delete removes everything)
await deleteGameSession(session.id);
```

