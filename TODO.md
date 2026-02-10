# TODO

## Completed


## Ideas

- [ ] Players can be added to a game session after it has started (not during a round, but between rounds)
- [ ] Player registration with persistent profiles and player stats (games played, rounds won/lost, total sips, special rolls, etc.)
- [x] A way to delete game sessions with an admin password (see debug panel + `deleteGameSessionAction`)
- [ ] Add hyping mechanism that shows chances good rolls and making sure the gentleman rule is hold
  - Add confirm when last roll end turn
- [ ] Add jester logo to loser player
- [x]  Add UI for showing the game rules~~ (see `src/components/game-rules-dialog.tsx`)
- [x] Add previous rounds to the game session page~~ (see `src/components/game-session/round-browser.tsx`)

## Bugs

- [x] Loading is slow on "end turn" button in game session
- [x] Infinite loading on home page after having started a game
- [ ] Super stair doesnt check for previous stairs


## Refactorings

- [ ] Refactor the components for player-turn-card, game-state-card, round-info-card, to be more composable and reusable
- [ ] Encrypt/decrypt the password in the database for game sessions