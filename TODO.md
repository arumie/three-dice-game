# TODO

## Ideas

### Completed

- [x] Make sure the gentleman rule is held - Add confirm when last roll end turn (see gentleman rule AlertDialog in `player-turn-card.tsx`)
- [x] Add jester logo to loser player (using Frown icon with purple styling)
- [x] Add UI for showing the game rules~~ (see `src/components/game-rules-dialog.tsx`)
- [x] Add previous rounds to the game session page~~ (see `src/components/game-session/round-browser.tsx`)'
- [x] A way to delete game sessions with an admin password (see debug panel + `deleteGameSessionAction`)

### TODO

- [ ] Players can be added to a game session after it has started (not during a round, but between rounds)
- [ ] Player registration with persistent profiles and player stats (games played, rounds won/lost, total sips, special rolls, etc.)
- [ ] Add hyping mechanism that shows chances good rolls - Ex. "Only one more [1] for a three of a kind", "1/6 chance to get a stair!"
- [ ] Add "End turn - X up next" to help clear up who's next
- [ ] Add session based setting that switches between rolls made by the app vs using dice
- [ ] Stats - Relative stats like (avg baddest rolls)
- [ ] Stats - Ensure that if there's even players its consistent
- [ ] Add "Rolling" animation (Can be done by switching between dice in a quick fashion)

## Bugs

### Completed

- [x] Loading is slow on "end turn" button in game session
- [x] Infinite loading on home page after having started a game
- [x] Super stair doesnt check for previous stairs

### TODO

- [ ] Rules should contain section on "All safe"
- [ ] Fix shit stairs info boxes
- [ ] Fix gentlemen rule options. 


## Refactorings

### Completed
- [x] Add unit tests for game session mapping functions to ensure they dont break.

### TODO
- [ ] Refactor the components for player-turn-card, game-state-card, round-info-card, to be more composable and reusable
- [ ] Encrypt/decrypt the password in the database for game sessions
- [ ] Ensure that the game session can handle up to 20 players in the UI
