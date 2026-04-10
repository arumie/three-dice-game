# TODO

## Ideas

### Completed

- [x] Make sure the gentleman rule is held - Add confirm when last roll end turn (see gentleman rule AlertDialog in `player-turn-card.tsx`) ([136f6c2](https://github.com/arumie/three-dice-game/commit/136f6c2), [8b0c5c2](https://github.com/arumie/three-dice-game/commit/8b0c5c2))
- [x] Add jester logo to loser player (using Frown icon with purple styling) ([4b0da99](https://github.com/arumie/three-dice-game/commit/4b0da99))
- [x] Add UI for showing the game rules (see `src/components/game-rules-dialog.tsx`) ([7eb71f9](https://github.com/arumie/three-dice-game/commit/7eb71f9))
- [x] Add previous rounds to the game session page (see `src/components/game-session/round-browser.tsx`) ([eda64ee](https://github.com/arumie/three-dice-game/commit/eda64ee))
- [x] A way to delete game sessions with an admin password (see debug panel + `deleteGameSessionAction`) ([834cfff](https://github.com/arumie/three-dice-game/commit/834cfff))
- [x] Add "End turn - X up next" to help clear up who's next (see `player-turn-card.tsx` `TurnActionButtons`) ([9d7d7f0](https://github.com/arumie/three-dice-game/commit/9d7d7f0))
- [x] Stats - Ensure that if there's even players its consistent (see `game-state-card.tsx` tied stats handling) ([9d7d7f0](https://github.com/arumie/three-dice-game/commit/9d7d7f0))
- [x] Add "Rolling" animation (Can be done by switching between dice in a quick fashion) (see `player-turn-card.tsx` rolling animation + `dice-display.tsx`) ([9d7d7f0](https://github.com/arumie/three-dice-game/commit/9d7d7f0))
- [x] Add info box when the player rolls a shit stair (see `player-turn-card.tsx` DiceSection) ([f1345c6](https://github.com/arumie/three-dice-game/commit/f1345c6))
- [x] Add session based setting that switches between rolls made by the app vs using dice (see `player-turn-card.tsx` "App Dice" toggle with sessionStorage) ([f1345c6](https://github.com/arumie/three-dice-game/commit/f1345c6))
- [x] Update the end round screen with how many sips each player added to the final sip count and who they awarded stair sips to and how much (see `round-complete-card.tsx` sip annotations on `TurnScoreRow`) ([a793b67](https://github.com/arumie/three-dice-game/commit/a793b67), [f695f91](https://github.com/arumie/three-dice-game/commit/f695f91))
- [x] Add "beer" tracking. Add the number of beers that a player has to have consumed (14 sips pr beer). Add to game state card. The beers should be an actual beer icon (one for each beer that needs  to have been consumed) and should show how the level of the beer should be for the current one the player is on. (see `beer-bottle.tsx`, `beer-tracker.tsx`, `game-state-card.tsx`) ([307e502](https://github.com/arumie/three-dice-game/commit/307e502))
- [x] Player registration with persistent profiles and player stats (games played, rounds won/lost, total sips, special rolls, etc.) ([afce81b](https://github.com/arumie/three-dice-game/commit/afce81b))
- [x] Add system for checking for changes if multiple players are looking at the same game session and update the game session in real time if changes are detected. ([08d3dbb](https://github.com/arumie/three-dice-game/commit/08d3dbb))
- [x] Add an info box that explains the icons in the game info screen.

### TODO

#### Hard
- [ ] Add a way to archive old game sessions by adding them to adding the game data to a blob storage and only saving a summarized game calculation in order to save space in the DB and make loading the games overview faster.

#### Medium
- [ ] Add player/spectator mode selection when joining a game session. Choose whether you play as a single player or control all players. Lock action buttons on devices whose turn it isn't, so only the active player's device can interact.
- [ ] Players can be added to a game session after it has started (not during a round, but between rounds)
- [ ] Add hyping mechanism that shows chances good rolls - Ex. "Only one more [1] for a three of a kind", "1/6 chance to get a stair!"
- [ ] Stats - Relative stats like avg. worst roller (i.e. Simon)
- [ ] Add graphs showing progress over rounds for every player  - Should be able to switch between what stat to show (sips, special rolls, rounds won/lost) 
- [ ] Add profile settings for players to change their display name and add profile picture

#### Easy

## Bugs

### Completed

- [x] Loading is slow on "end turn" button in game session ([2f553b1](https://github.com/arumie/three-dice-game/commit/2f553b1))
- [x] Infinite loading on home page after having started a game ([60d1190](https://github.com/arumie/three-dice-game/commit/60d1190))
- [x] Super stair doesnt check for previous stairs ([1540684](https://github.com/arumie/three-dice-game/commit/1540684))
- [x] Rules should contain section on "All safe" ([cfdb7a5](https://github.com/arumie/three-dice-game/commit/cfdb7a5))
- [x] Switching apps on mobile during game creation causes duplicate game with same input (mobile tab suspension drops server action response, form re-appears with values, user re-submits)

### TODO

- [ ] Fix gentlemen rule options. 


## Refactorings

### Completed
- [x] Add unit tests for game session mapping functions to ensure they dont break. ([78d1afe](https://github.com/arumie/three-dice-game/commit/78d1afe))

### TODO
- [ ] Refactor the components for player-turn-card, game-state-card, round-info-card, to be more composable and reusable
  - [x] player-turn-card (see `player-turn-card.tsx`)
  - [ ] game-state-card (see `game-state-card.tsx`)
  - [ ] round-info-card (see `round-info-card.tsx`)
- [ ] Encrypt/decrypt the password in the database for game sessions
- [ ] Ensure that the game session can handle up to 20 players in the UI
- [ ] Add playwright e2e tests for the game session
- [ ] Split debug-panel into multiple smaller components
