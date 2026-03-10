# TODO

## Ideas

### Completed

- [x] Make sure the gentleman rule is held - Add confirm when last roll end turn (see gentleman rule AlertDialog in `player-turn-card.tsx`)
- [x] Add jester logo to loser player (using Frown icon with purple styling)
- [x] Add UI for showing the game rules~~ (see `src/components/game-rules-dialog.tsx`)
- [x] Add previous rounds to the game session page~~ (see `src/components/game-session/round-browser.tsx`)'
- [x] A way to delete game sessions with an admin password (see debug panel + `deleteGameSessionAction`)
- [x] Add "End turn - X up next" to help clear up who's next (see `player-turn-card.tsx` `TurnActionButtons`)
- [x] Stats - Ensure that if there's even players its consistent (see `game-state-card.tsx` tied stats handling)
- [x] Add "Rolling" animation (Can be done by switching between dice in a quick fashion) (see `player-turn-card.tsx` rolling animation + `dice-display.tsx`)

### TODO

#### Hard
- [ ] Player registration with persistent profiles and player stats (games played, rounds won/lost, total sips, special rolls, etc.)
- [ ] Add a way to archive old game sessions by adding them to adding the game data to a blob storage and only saving a summarized game calculation in order to save space in the DB and make loading the games overview faster.

#### Medium
- [ ] Players can be added to a game session after it has started (not during a round, but between rounds)
- [ ] Add hyping mechanism that shows chances good rolls - Ex. "Only one more [1] for a three of a kind", "1/6 chance to get a stair!"
- [x] Add session based setting that switches between rolls made by the app vs using dice (see `player-turn-card.tsx` "App Dice" toggle with sessionStorage)
- [ ] Stats - Relative stats like (avg baddest rolls)

#### Easy
- [x] Add info box when the player rolls a shit stair (see `player-turn-card.tsx` DiceSection)
- [ ] Update the end round screen with how many sips each player added to the final sip count and who they awarded stair sips to and how much

## Bugs

### Completed

- [x] Loading is slow on "end turn" button in game session
- [x] Infinite loading on home page after having started a game
- [x] Super stair doesnt check for previous stairs

### TODO

- [ ] Rules should contain section on "All safe"
- [ ] Fix gentlemen rule options. 


## Refactorings

### Completed
- [x] Add unit tests for game session mapping functions to ensure they dont break.

### TODO
- [ ] Refactor the components for player-turn-card, game-state-card, round-info-card, to be more composable and reusable
  - [x] player-turn-card (see `player-turn-card.tsx`)
  - [ ] game-state-card (see `game-state-card.tsx`)
  - [ ] round-info-card (see `round-info-card.tsx`)
- [ ] Encrypt/decrypt the password in the database for game sessions
- [ ] Ensure that the game session can handle up to 20 players in the UI
- [ ] Add playwright e2e tests for the game session
