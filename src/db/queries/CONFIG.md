# Game Session Configuration

Game sessions can be configured with various settings stored in a JSON configuration object.

## Configuration Structure

```typescript
type GameSessionConfig = {
  name: string;              // Display name for the game session
  randomTurnOrder: boolean;  // Whether to randomize turn order in rounds
}
```

## Default Configuration

```typescript
const DEFAULT_GAME_CONFIG = {
  name: "New Game",
  randomTurnOrder: false
};
```

## Usage

### Creating a Game with Custom Config

```typescript
import { createGameSession } from '@/db/queries';

// Create with default config
const game1 = await createGameSession({
  ownerId: "user123"
});
// Config: { name: "New Game", randomTurnOrder: false }

// Create with custom name
const game2 = await createGameSession({
  ownerId: "user123",
  config: {
    name: "Friday Night Dice"
  }
});
// Config: { name: "Friday Night Dice", randomTurnOrder: false }

// Create with random turn order enabled
const game3 = await createGameSession({
  ownerId: "user123",
  config: {
    name: "Chaos Mode",
    randomTurnOrder: true
  }
});
// Config: { name: "Chaos Mode", randomTurnOrder: true }
```

### Updating Configuration

```typescript
import { updateGameSession, updateGameSessionConfig } from '@/db/queries';

// Update just the name
await updateGameSession(gameId, {
  config: { name: "New Name" }
});
// Other config properties are preserved

// Update just randomTurnOrder
await updateGameSessionConfig(gameId, {
  randomTurnOrder: true
});
// Convenience method for updating config only

// Update multiple properties
await updateGameSession(gameId, {
  config: {
    name: "Tournament Finals",
    randomTurnOrder: false
  }
});
```

## Configuration Properties

### `name: string`

The display name for the game session.

**Usage:**
- Show in game lobby
- Display in game history
- Identify games in lists

**Examples:**
- "Friday Night Dice"
- "Tournament Round 1"
- "Practice Game"
- "John's Birthday Party"

### `randomTurnOrder: boolean`

Controls whether the turn order for each round should be randomized (excluding the starting player).

**When `false` (default):**
- Turn order follows the player join order
- Predictable and fair for competitive play
- Starting player always goes first
- Other players follow in consistent order

**When `true`:**
- Turn order is shuffled each round
- Starting player still goes first
- Other players are randomized
- More chaotic and unpredictable

**Example:**
```typescript
// Players: [Alice, Bob, Charlie, Diana]
// Starting player: Alice (loser of previous round)

// randomTurnOrder: false
// Round order: [Alice, Bob, Charlie, Diana]
// Every round is the same order

// randomTurnOrder: true
// Round 1: [Alice, Charlie, Diana, Bob]
// Round 2: [Alice, Bob, Diana, Charlie]
// Round 3: [Alice, Diana, Bob, Charlie]
// Random each time (Alice always first)
```

## How Configuration Affects Gameplay

### Round Creation

When `createRound()` is called, it automatically reads the game session config:

```typescript
import { createRound } from '@/lib/game-utils';

// Automatically uses randomTurnOrder from config
await createRound(
  gameSessionId,
  startingParticipantId,
  allParticipantIds
);

// Override config setting for this specific round
await createRound(
  gameSessionId,
  startingParticipantId,
  allParticipantIds,
  { shuffleOrder: true }  // Force shuffle this round only
);
```

### Configuration Workflow

1. **Create Game** → Config is set with defaults or custom values
2. **Add Players** → Config doesn't affect participant management
3. **Start Round** → `randomTurnOrder` determines player order
4. **During Game** → Config can be updated between rounds
5. **Complete Game** → Config is preserved in history

## Future Configuration Options

Potential future additions to `GameSessionConfig`:

```typescript
type GameSessionConfig = {
  name: string;
  randomTurnOrder: boolean;
  
  // Potential future options:
  maxRoundsPerGame?: number;      // End game after N rounds
  enableSuperStairs?: boolean;    // Toggle super stairs rule
  enableShitStairs?: boolean;     // Toggle shit stairs rule
  maxRollsAllowed?: number;       // Override first player choice
  allowSpectators?: boolean;      // Allow non-playing viewers
  isPrivate?: boolean;            // Hide from public game lists
  autoCompleteRounds?: boolean;   // Auto-end round when all played
}
```

## Best Practices

1. **Set name on creation** - Makes it easier to identify games later
2. **Don't change randomTurnOrder mid-game** - Can confuse players
3. **Use descriptive names** - Include context (tournament, casual, etc.)
4. **Document custom configs** - If you add fields, update this file

## Migration

If you need to add new config properties:

1. Update `GameSessionConfig` type in `schema.ts`
2. Update `DEFAULT_GAME_CONFIG` in `queries/gameSessions.ts`
3. Update existing sessions with migration or default values
4. Document the new property in this file

Example migration for new field:

```typescript
// Add a new config property with default
const sessions = await getAllGameSessions();
for (const session of sessions) {
  await updateGameSession(session.id, {
    config: {
      ...session.config,
      newProperty: defaultValue  // Add with default
    }
  });
}
```

