# Three Dice Game

A web application build in NextJS to play the Three Dice Game.

See [GAME_RULES.md](GAME_RULES.md) for the rules of the game.

## Documentation

This project includes detailed documentation for different aspects of the system:

- **[Architecture Overview](src/lib/README.md)** - System architecture, layer structure, and design principles
- **[Database Queries](src/db/queries/README.md)** - Database query API, CRUD operations, and usage examples
- **[Application Structure](src/app/README.md)** - Page structure and UI components

## Technical Implementation

This is an event-sourced, minimalist architecture that:
- Stores only immutable game events (rolls, turns, rounds)
- Calculates derived fields on-demand (scores, penalties, game state)
- Uses TypeScript with Next.js and Drizzle ORM
- Leverages indexed queries for fast game state reconstruction

See the [Architecture Overview](src/lib/README.md) for complete technical details.

## Ideas and TODOs

- Players can be added to a game session after it has started
  - Not during a round but between rounds

### Development

TODO

```
bun dev
```