<p align="center">
  <img src="public/logo.svg" alt="Three Dice Game logo" height="250">
</p>

<h1 align="center">Three Dice Game</h1>

<p align="center">
  A web application built with Next.js to play the Three Dice Game -- a dice-based drinking game with special rolls and penalties.
</p>

See [GAME_RULES.md](GAME_RULES.md) for the complete rules of the game.

## Features

- **Password-protected game sessions** -- each game is secured with a password
- **Guest players** -- jump straight into a game with no account required
- **Special roll mechanics** -- three of a kind, stairs, super stairs, and shit stairs
- **Round history browser** -- browse previous rounds and their results
- **In-game rules dialog** -- quick reference for game rules while playing
- **Leaderboard** -- per-game standings and stats
- **Game summary** -- final standings, winner, and detailed stats after a game ends
- **Dark/light theme** -- toggle between dark and light mode
- **Mobile-responsive UI** -- optimized for both desktop and mobile
- **Debug tools** -- development panel for inspecting game state

## Tech Stack

| Category | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) |
| Database | [PostgreSQL 16](https://www.postgresql.org/) via [Drizzle ORM](https://orm.drizzle.team/) |
| Forms | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Client State | [Preact Signals](https://preactjs.com/guide/v10/signals/) |
| Linting/Formatting | [Biome](https://biomejs.dev/) |
| Package Manager | [Bun](https://bun.sh/) |

## Documentation

This project includes detailed documentation for different aspects of the system:

- **[Architecture Overview](src/lib/README.md)** -- System architecture, layer structure, and design principles
- **[Database Queries](src/db/queries/README.md)** -- Database query API, CRUD operations, and usage examples
- **[Application Structure](src/app/README.md)** -- Page structure, routes, and server actions

## Technical Implementation

This is an event-sourced, minimalist architecture that:

- Stores only immutable game events (rolls, turns, rounds)
- Calculates derived fields on-demand (scores, penalties, game state)
- Uses TypeScript with Next.js and Drizzle ORM
- Leverages indexed queries for fast game state reconstruction
- Uses Next.js caching with tag-based invalidation for real-time updates

See the [Architecture Overview](src/lib/README.md) for complete technical details.

## Project Structure

```
three-dice-game/
├── src/
│   ├── app/                    # Next.js App Router pages and server actions
│   │   ├── page.tsx            # Home page (new game form)
│   │   ├── actions.ts          # Server actions (roll dice, end turn, etc.)
│   │   ├── games/              # Games list page
│   │   └── game-session/[id]/  # Active game session + summary pages
│   ├── components/
│   │   ├── game-session/       # Game session components (turn card, state, summary, etc.)
│   │   ├── games-list/         # Games list components
│   │   └── ui/                 # shadcn/ui components
│   ├── db/
│   │   ├── schema.ts           # Drizzle ORM schema (players, sessions, rounds, turns, rolls)
│   │   └── queries/            # Database query functions organized by table
│   └── lib/
│       ├── game-service.ts     # High-level game operations
│       ├── game-utils.ts       # Pure calculation functions
│       ├── mappers.ts          # DB-to-domain model transformations
│       ├── models.ts           # Domain model interfaces
│       ├── game-auth.ts        # Cookie-based game session authentication
│       ├── cached-queries.ts   # Next.js cache wrappers
│       ├── signals/            # Preact Signals (game config, theme, UI state)
│       └── mock/               # Mock data for development
├── docker-compose.yml          # PostgreSQL 16 for local development
├── drizzle.config.ts           # Drizzle ORM configuration
└── biome.json                  # Biome linter/formatter configuration
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js)
- [Docker](https://www.docker.com/) (for local PostgreSQL)

### Setup

1. **Install dependencies:**

```bash
bun install
```

2. **Set up the database** (copies `.env.example` to `.env.local`, starts PostgreSQL via Docker, and pushes the schema):

```bash
bun run db:setup
```

3. **Start the development server:**

```bash
bun dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Description |
|---|---|
| `POSTGRES_URL` | PostgreSQL connection string |
| `USE_LOCAL_DB` | Set to `true` for local Docker PostgreSQL |

### Database Commands

| Command | Description |
|---|---|
| `bun run db:setup` | Full setup (env, Docker, schema push) |
| `bun run db:start` | Start the PostgreSQL container |
| `bun run db:stop` | Stop the PostgreSQL container |
| `bun run db:push` | Push schema changes to the database |
| `bun run db:generate` | Generate a Drizzle migration |
| `bun run db:migrate` | Run pending migrations |
| `bun run db:studio` | Open Drizzle Studio (database GUI) |
