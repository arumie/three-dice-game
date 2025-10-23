# Three Dice Game - Architecture

## Overview

This is a **minimalist, event-sourced** architecture for the Three Dice Game. The system is organized into clear layers with separation of concerns:

- **Database Layer** (`src/db/`) - Schema and queries
- **Domain Layer** (`src/lib/`) - Models, business logic, and services
- **Pure Utilities** (`game-utils.ts`) - Calculation functions without side effects
- **Mappers** (`mappers.ts`) - Orchestrate data fetching and model transformation
- **Services** (`game-service.ts`) - High-level game operations

## Architecture Principles

1. **Store only immutable data** - Don't store what can be calculated
2. **Event sourcing** - Each roll, turn, and round is a permanent record
3. **Separation of concerns** - Pure functions, mappers, and services are distinct
4. **Domain models** - Rich models with calculated fields
5. **Testability** - Pure functions are easily tested without mocks

## Schema Tables

### `players`
Registered users with persistent profiles.
- Stores: userId, username, displayName
- Stats calculated on-demand from game history

### `game_sessions`
Top-level game container.
- Stores: ownerId, createdAt, completedAt
- Status derived from rounds

### `game_participants`
Links players (registered or guest) to game sessions.
- Supports both registered players and guests
- `playerType` enum distinguishes between types
- `guestName` only used for guest players

### `rounds`
Each round in a game.
- Stores: roundNumber, playerOrder (JSON array), startedAt
- `playerOrder` defines turn order for the round
- All other fields (status, penalties, loser) are calculated

### `player_turns`
Each participant's turn in a round.
- Links: gameSessionId, roundId, participantId
- Stores: turnOrder (position in round)
- All stats derived from rolls

### `rolls`
Individual dice rolls within a turn.
- Stores: dice (JSON array with value and kept status)
- Score and special roll type calculated from dice values
- Full history enables replay and analytics

## Key Features

### 1. Fast Game State Reconstruction

All tables indexed on `gameSessionId` for single-query lookups:

```typescript
const gameState = await getCompleteGameState(gameSessionId);
// Returns: session, participants, rounds, turns, rolls
```

### 2. Calculated Fields

The following are **not stored**, but calculated on-demand:

**From game_sessions:**
- `status` - waiting/in_progress/completed
- `startedAt` - First round's startedAt

**From rounds:**
- `status` - in_progress/completed
- `maxRollsAllowed` - First player's roll count
- `currentPenaltySips` - Base + three-of-a-kind bonuses
- `finalPenaltySips` - Final penalty when complete
- `losingParticipantId` - Player with lowest score
- `completedAt` - Last turn's last roll timestamp
- `startingParticipantId` - First in playerOrder

**From player_turns:**
- `totalRollsUsed` - Count of rolls
- `finalScore` - Calculated from dice
- `isSafe` - Has special roll
- `specialRollType` - Detected from dice
- `completedAt` - Last roll's timestamp

**From rolls:**
- `score` - Sum of dice values (1=100, 6=60, etc.)
- `specialRollType` - Three-of-a-kind, stairs, etc.

### 3. Special Roll Detection

All special rolls detected from dice values:

- **Three of a kind**: [1,1,1], [2,2,2], etc.
- **Stairs**: [1,2,3]
- **Super Stairs**: [4,5,6] (only if previous turn was stairs)
- **Shit Stairs**: [2,3,4] or [3,4,5]

### 4. Flexible Player Order

The `playerOrder` JSON array in rounds enables:
- Fixed turn order
- Rotated order (loser starts)
- Shuffled order
- Skip player / Reverse order (future features)

## File Structure

```
src/lib/
├── index.ts          - Convenient exports for all public APIs
├── models.ts         - Domain model interfaces
├── mappers.ts        - Data fetching + transformation
├── game-service.ts   - High-level game operations
├── game-utils.ts     - Pure calculation functions
└── README.md         - This file
```

Import everything you need from the main index:

```typescript
import { 
  getCompleteGame, 
  calculateScore, 
  rollDice,
  type GameModel 
} from './lib';
```

## Layer Architecture

### 1. Database Queries (`src/db/queries/`)

Simple CRUD operations with no business logic:

```typescript
import { getGameSessionById, getRoundsBySession } from '../db/queries';

// Just fetch data - no calculations
const session = await getGameSessionById(1);
const rounds = await getRoundsBySession(1);
```

### 2. Pure Utilities (`game-utils.ts`)

Calculation functions with no database access or side effects:

```typescript
import { calculateScore, detectSpecialRoll, rollDice } from './game-utils';

// Pure functions - easy to test
const dice = [{ value: 1, kept: false }, { value: 2, kept: false }, { value: 3, kept: false }];
const score = calculateScore(dice); // 105
const special = detectSpecialRoll(dice); // "stairs"
const newRoll = rollDice(3); // [4, 2, 6]
```

### 3. Mappers (`mappers.ts`)

Pure transformation functions - no database access:

```typescript
import { mapGame, mapRound, mapPlayerTurn, mapRoll } from './mappers';

// Transform DB results to domain models with calculated fields
// All data is provided as parameters - no DB queries inside
const rollModel = mapRoll(roll); // Adds score and specialRollType
const turnModel = mapPlayerTurn(turn, rolls); // Adds calculated fields
const roundModel = mapRound(round, turns, rollsByTurnId); // Adds status, penalties, loser
const gameModel = mapGame(session, participants, rounds, turnsByRoundId, rollsByTurnId);
```

### 4. Services (`game-service.ts`)

High-level operations that orchestrate queries and mappers:

```typescript
import { getCompleteGame, getCurrentRound, createRound } from './game-service';

// Get complete game state
const game = await getCompleteGame(gameSessionId);
console.log(game.status); // "in_progress"
console.log(game.rounds.length); // 3
console.log(game.rounds[0].currentPenaltySips); // 8

// Get current round
const round = await getCurrentRound(gameSessionId);
console.log(round?.losingParticipantId);

// Create new round
const roundId = await createRound(
  gameSessionId,
  startingParticipantId,
  allParticipantIds,
  { shuffleOrder: true }
);
```

**How services work internally:**

```typescript
// Example: getLatestRound service function
export async function getLatestRound(gameSessionId: number) {
  // 1. Query database
  const round = await getLatestRoundQuery(gameSessionId);
  if (!round) return null;
  
  const turns = await getPlayerTurnsByRound(round.id);
  const rollsArrays = await Promise.all(
    turns.map(turn => getRollsByPlayerTurn(turn.id))
  );
  
  // 2. Organize data
  const rollsByTurnId = new Map();
  turns.forEach((turn, i) => rollsByTurnId.set(turn.id, rollsArrays[i]));
  
  // 3. Transform with mapper
  return mapRound(round, turns, rollsByTurnId);
}
```

Services handle data fetching and organization, then delegate transformation to mappers.

## Usage Examples

### Complete Game Flow

```typescript
import { createGameSession } from '../db/queries';
import { createRound, getCompleteGame } from './game-service';
import { rollDice } from './game-utils';

// 1. Create game
const session = await createGameSession({
  ownerId: "user123",
  config: { name: "Friday Night Game", randomTurnOrder: true }
});

// 2. Add players (using query functions)
const p1 = await createGuestParticipant(session.id, "Alice");
const p2 = await createGuestParticipant(session.id, "Bob");

// 3. Start first round
const roundId = await createRound(
  session.id,
  p1.id,
  [p1.id, p2.id],
  { shuffleOrder: true }
);

// 4. Get complete game state
const game = await getCompleteGame(session.id);
console.log(game.status); // "in_progress"
console.log(game.rounds[0].maxRollsAllowed); // 3
```

### Working with Rolls

```typescript
import { createRoll } from '../db/queries';
import { rollDice, createRollWithKept, detectSpecialRoll } from './game-utils';

// First roll
const values = rollDice(3);
const dice = values.map(value => ({ value, kept: false }));

await createRoll({
  gameSessionId,
  playerTurnId,
  rollNumber: 1,
  dice
});

// Check if special
const special = detectSpecialRoll(dice);
if (special === "stairs") {
  console.log("Stairs! Player is safe!");
}

// Re-roll keeping first die
const newDice = createRollWithKept(dice, [1, 2]); // Re-roll indices 1 and 2
```

### Get Statistics

```typescript
import { getParticipantStats, getPlayerGlobalStats } from './game-service';

// Stats for a participant in a game
const stats = await getParticipantStats(participantId, gameSessionId);
console.log(stats.roundsWon, stats.sipsDrunk);

// Global stats across all games
const globalStats = await getPlayerGlobalStats(playerId);
console.log(globalStats.gamesPlayed, globalStats.totalSipsDrunk);
```

## Performance Considerations

### Indexes

All tables indexed on `gameSessionId` for fast game state queries:
- `game_participants_session_idx`
- `rounds_session_idx`
- `player_turns_session_idx`
- `rolls_session_idx`

**Index Optimization:** All query functions that fetch related data (turns by round, rolls by turn) now require `gameSessionId` as a parameter. This enables composite filtering that leverages the indexed `gameSessionId` column, resulting in faster queries and better performance at scale.

```typescript
// Optimized queries use both filters
const turns = await getPlayerTurnsByRound(roundId, gameSessionId);
const rolls = await getRollsByPlayerTurn(turnId, gameSessionId);
```

### Caching

For real-time games, consider caching:
- Current game state in memory (Redis)
- Round summaries while round is in progress
- Invalidate cache when new rolls added

### Optimization Tips

1. **Parallel queries** - Use `Promise.all()` when fetching game state
2. **Batch operations** - Insert multiple rolls in one query if needed
3. **Materialized views** - Create views for player stats/leaderboards
4. **Pagination** - Limit history queries for games with many rounds

## Database Migration

To create the tables, generate a migration with Drizzle Kit:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

## Future Enhancements

Possible additions without breaking the core schema:

1. **Stats table** - Cache calculated player stats
2. **Game events** - Audit log of all game actions
3. **Chat messages** - In-game communication
4. **Achievements** - Track special accomplishments
5. **Replay data** - Store additional metadata for game replays
6. **Tournament brackets** - Link multiple game sessions

## Architecture Benefits

### Separation of Concerns

**game-utils.ts** - Pure functions
- No database access or side effects
- Easily testable without mocks
- Can be used in browser or Node.js
- Examples: `calculateScore()`, `detectSpecialRoll()`, `rollDice()`

**mappers.ts** - Pure transformation
- Transform DB results to domain models
- Calculate derived fields using pure functions
- No database access or side effects
- All data provided as parameters
- Examples: `mapRound()`, `mapPlayerTurn()`, `mapRoll()`

**game-service.ts** - High-level operations
- Query database for all necessary data
- Pass data to mappers for transformation
- Provide convenient helper functions
- Handle complex workflows and orchestration
- Examples: `getCompleteGame()`, `createRound()`

**Data Flow:**
```
Service → DB Queries → Raw Data → Mapper → Domain Model
```

Services fetch, mappers transform, utilities calculate.

### Trade-offs

**Pros:**
- ✅ Clear separation of concerns
- ✅ Pure functions are highly testable
- ✅ Domain models are rich and self-contained
- ✅ Easy to add new features and helpers
- ✅ No data consistency issues
- ✅ Complete audit trail

**Cons:**
- ❌ More queries to reconstruct state (mitigated by parallel fetching)
- ❌ Slightly more code than storing calculated values
- ❌ Need to map data for every read (can be cached)

For this use case (real-time game with < 100 concurrent games), the benefits far outweigh the costs. The architecture is maintainable, testable, and easy to extend.

