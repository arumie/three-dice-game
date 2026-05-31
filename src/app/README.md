# App Structure

This is the main application folder using the Next.js App Router.

## Routes

| Route | File | Description |
|---|---|---|
| `/` | `page.tsx` | Home page -- create a new game |
| `/games` | `games/page.tsx` | Games list -- view in-progress and completed games |
| `/game-session/[id]` | `game-session/[id]/page.tsx` | Active game session -- play the game |
| `/game-session/[id]/summary` | `game-session/[id]/summary/page.tsx` | Game summary -- final standings after a completed game |

## Home Page (`/`)

The home page renders the `NewGameForm` component where users can create a new game session by entering a game name, player names, and a password. If games already exist, a link to the games list is shown.

## Games List (`/games`)

Displays all game sessions, separated into in-progress and completed games. Each game card shows the game name, player count, and status. Includes global statistics.

## Game Session Page (`/game-session/[id]`)

The active game session page where the game is played. Protected by a password gate -- users must enter the game password before accessing the session.

Key components:
- **Player Turn Card** -- dice rolling interface for the current player (roll, re-roll, end turn)
- **Game State Card** -- leaderboard, round info, and game controls
- **Round Info Card** -- sidebar with current round details
- **Round Browser** -- view results from previous rounds
- **Mobile Game Drawer** -- collapsible game info for mobile

Additional states:
- `loading.tsx` -- loading skeleton while game data is fetched
- `not-found.tsx` -- shown when a game session ID does not exist

## Game Summary Page (`/game-session/[id]/summary`)

Shown after a game is completed. Displays the winner, final standings, and detailed per-player statistics (rounds won, sips drunk, sips awarded, special rolls, etc.).

## Server Actions (`actions.ts`)

All game mutations are handled through Next.js server actions:

| Action | Description |
|---|---|
| `createGameAction` | Create a new game session with players and first round |
| `verifyGamePasswordAction` | Verify game password and set auth cookie |
| `checkGameAuthAction` | Check if the user is authenticated for a game |
| `rollDiceAction` | Record a dice roll (first roll or re-roll) |
| `endTurnAction` | End the current player's turn |
| `startRoundAction` | Start a new round |
| `addPlayerToGameAction` | Add a player between rounds (sets `firstRoundNumber`) |
| `retirePlayerAction` | Retire a player between rounds (sets `retiredAfterRoundNumber`) |
| `endGameAction` | Mark a game session as completed |
| `invalidateCacheAction` | Manually invalidate cached game data |
| `getRawGameDataAction` | Debug action returning raw database rows |

All game-modifying actions require authentication via a session cookie and invalidate relevant cache tags after mutation.

## Layout (`layout.tsx`)

The root layout includes the theme provider for dark/light mode support.
