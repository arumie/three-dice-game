# App Structure

This is the main application folder.

## Pages

- **Home Page**: `/`
- **Game Session Page**: `/game-session/:id`
- **Players Page**: `/players`
- **Player Page**: `/players/:id`


## Home Page

This is the home page of the application. It displays a list of game sessions owned by the current user.

The user can start a new game session.

## Game Session Page

This is the page for a specific game session. It displays the game session details and the current round.

From here the user can play the game.

Only the owner of the game session can see the page.


## Players Page

List of registered players and some of their game stats

### Notes

- Cache should be used and only revalidated when a game session is completed

## Player Page

This page displays the the stats of a specific player.

- Number of games played
- Total number of rolls
- Total number of special rolls
- Total number of three-of-a-kind rolls
- Total number of stairs rolls
- Total number of super stairs rolls
- Total number of shit stairs rolls
- Number of rounds lost
- Number of sips drunk total
- Number of sips awarded to other players
- Number of sips been given from stairs rolls
- etc...

### Notes

- Cache should be used and only revalidated when a game session is completed