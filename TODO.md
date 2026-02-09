# TODO

## Completed

- ~~Add UI for showing the game rules~~ (see `src/components/game-rules-dialog.tsx`)
- ~~Add previous rounds to the game session page~~ (see `src/components/game-session/round-browser.tsx`)

## Ideas

- [ ] Players can be added to a game session after it has started (not during a round, but between rounds)
- [ ] Player registration with persistent profiles and player stats (games played, rounds won/lost, total sips, special rolls, etc.)
- [x] A way to delete game sessions with an admin password (see debug panel + `deleteGameSessionAction`)

## Bugs

- [ ] Loading is slow on "end turn" button in game session
- [x] Infinite loading on home page after having started a game
