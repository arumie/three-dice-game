# Three Dice Game

This is a simple drinking game where each player rolls with three dice

## Rules

The game is played in rounds where each player rolls with three dice and add sips to the penalty which the losing player has to drink after the end of the round.
Any amount of players can play, but the game tends to be more fun with at least 4 players.

### Dice values
- 1: 100 points
- 2: 2 points
- 3: 3 points
- 4: 4 points
- 5: 5 points
- 6: 60 points

### Rolls

A players points are calculated by adding the value of the dice they rolled.

Examples: 
- If a player rolls (1, 2, 4), their points are 100 + 2 + 4 = 106.
- If a player rolls (2, 3, 5), their points are 2 + 3 + 5 = 10.
- If a player rolls (2, 4, 6), their points are 2 + 4 + 60 = 66.

### Special rolls

There are a number of special rolls that can be made which add to the penalty or give a player the ability to award sips to other players.
If a player makes a special roll, they're automatically "safe" for the rest of the round.

#### Three of a kind

A player can roll three of a kind by rolling three dice with the same number.
The penalty is increased by the value of the dice.
- Three 1s: Add 7 sips (due to the 100 point value of the 1)
- Three 2s: Add 2 sips
- Three 3s: Add 3 sips
- Three 4s: Add 4 sips
- Three 5s: Add 5 sips
- Three 6s: Add 6 sips

#### Stairs [1, 2, 3]

A player can roll three dice in ascending order by rolling three dice with the numbers 1, 2, and 3.
Based on the position of the player in the round, the player can award sips to other players.
Example: If the player is the first player to roll, they can award 1 sip to a player of their choice. If they're the second player to roll, they can award 2 sips to a player of their choice and so on.

#### Super Stairs [4, 5, 6]

A player can only get "super stairs" if the roll 4, 5, and 6 right after the previous player rolled a "normal" stairs roll (1, 2, 3). 
If a player rolls "super stairs", they can award sips to a player of their choice like with "normal" stairs rolls, but the number of sips they can award is doubled.
Example: If the first player rolled "normal" stairs (1, 2, 3) and the second player rolled "super stairs" (4, 5, 6), the second player can award 4 sips to a player of their choice.
If the first player rolled "normal" stairs (1, 2, 3), the second player rolled something else, and the third player rolled "super stairs" (4, 5, 6), it doesn't count as a "super stairs" roll.

#### Shit Stairs [2, 3, 4] and [3, 4, 5]

A player can roll three dice in ascending order by rolling three dice with the numbers 2, 3, and 4 or 3, 4, and 5.
These are called "shit stairs" because they don't count as a "normal" stairs roll or a "super stairs" roll, but also don't include a 1 or a 6 (which give the most points). This means that its basically a wasted roll.
The punishment for rolling "shit stairs" is that the player has to drink a sip and smack their own forehead (In a joking manner)

### Playing the game

The game consists of rounds. At the start of a round, the starting player is determined by the previous round's loser (or choose a random player to start if there was no previous round).
The penalty of of the round always starts at 1 sip.

The starting player rolls all their three dice. Then the player has a choice to either:
- Stay with the current roll
- or choose to roll again
If the player chooses to stay with the current roll they get their points or if they made a special roll, they're automatically "safe" and the based on the special roll they can award sips to other players or increase the penalty of the round.
If the player chooses to roll again they can pick whichever dice they want to roll again. 
The starting player chooses how many rolls every player gets in the round. This can be a maximum of 3 rolls per player.

### Examples

#### Example 1

Player A, B, C, and D are playing.

Player A starts the round. They roll (1, 2, 4). They get 106 points. They choose to roll again and roll the 2 and 4 again, but keep the 1. They roll (1, 3) meaning they have 100 + 100 + 3 = 203 points. They choose to stay with the current roll. This means that Player A has 203 points and the penalty of the round is 1 sip and all other players have maximum of two rolls.

Player B is the next player to roll. They roll (2, 3, 3) which is 8 points. They choose to roll the 2 again to try and hit three of a kind of threes. They roll a 3 which means they have (3, 3, 3) which is a "three of a kind" roll. Player B is now "safe" and the penalty of the round is increased by 3 sips to 4 sips.

Player C is the next player to roll. They roll (1, 2, 3) which is a "Stairs" roll. Player C chooses to stay with that roll. This means that Player C is "safe" and is allowed to award 3 sips (being the third player to roll) to a player of their choice. They award 3 sips to Player B.

The last player to roll is Player D. They roll (6, 5, 3) which is 68 points. They choose to roll the 3 again to try and hit a 4 to get "super stairs". They roll a 2 which means have (6, 5, 2) which is 67 points. They do not have any more rolls left.

The round ends and Player D is the loser. They have 67 points, A has 203 points and B and C are both "safe".
Player D then has to drink 4 sips and get to start the next round.

#### Example 2

Player A, B, C, and D are playing.

Player A starts the round. They roll (1, 1, 5) which is 205 points. They choose to stay with that roll. This means that Player A has 205 points and the penalty of the round is 1 sip and all other players have maximum of one roll.

Player B is the next player to roll. They roll (2, 3, 4) which is 9 points and a "shit stairs" roll. Player B has to drink a sip and smack their own forehead (In a joking manner) and has to stay with that roll. This means that Player A is now "safe" since 9 points is less than 205 points.

Player C is the next player to roll. They roll (1, 1, 1) which is a "three of a kind" roll. Player C is now "safe" and the penalty of the round is increased by 7 sips to 8 sips.

Player D is the last player to roll. They roll (3, 2, 5) which is 10 points. They have to stay with that roll.

The round ends and Player B is the loser. They have 9 points, A has 205 points, C is "safe" and D has 10 points.
Player B then has to drink 8 sips and get to start the next round.

#### Example 3

Player A, B, C, and D are playing.

Player A starts the round. They roll (2, 3, 4) which is 9 points and a "shit stairs" roll. They choose to roll all the dice again. They roll (3, 3, 6) which is 66 points. They choose to roll for a third time, this time rolling the 6 (a risky but potentially rewarding move) in order to get three of a kind of threes. They roll a 3 which means they have (3, 3, 3) which is a "three of a kind" roll. Everyone rejoices Player A's success and risk-taking ability. Player A is now "safe" and the penalty of the round is increased by 3 sips to 4 sips. Everyone else now has 3 rolls maximum.

Player B is the next player to roll. They roll (1, 2, 5) which is 108 points. They choose to re-roll the 5 in order to get a "stairs" roll. They roll a 4 which means they have (1, 2, 4). Still wanting to achieve a "stairs" roll they re-roll the 4. They roll a 6 which means they have (1, 2, 6) which is 162 points. Thats their three rolls and theyhave to stop.

Player C is the next to roll. They roll (6, 6, 6) which is a "three of a kind" roll. Everyone complains that Player C is "super lucky". They end their round adding 6 sips to the penalty to get to 10 sips and are now "safe".

Player D is the last to roll. They roll (2, 2, 5) which is 9 points. They choose to roll the 5 in order to get three twos. They roll a 4 which gives them (2, 2, 4) which is 8 points. They pivot and decide to roll all the dice again deeming it to risky to go for three twos. They roll (3, 5, 5) which is 13 points. They have to stop there.

The round ends and Player D is the loser. They have 13 points, A and C are "safe" and B has 162 points.
Player D then has to drink 10 sips and get to start the next round.

### Special Rules

#### First roll of the round

If the first roll of the round (the first roll of the starting player) is any of the "nice" special rolls (three of a kind, stairs, super stairs), the player has to drink the penalty themselves and the round starts over (nobody likes a cheater!)
Example: If the starting player rolls (1, 1, 1) they have to drink 7 sips and the round starts over. If the starting player rolls (1, 2, 3) they have to drink 1 sip and the round starts over.

#### Gentlemen's rules

There are some gentleman's rules that the players can choose to follow (it is frowned upon to break these rules!)
- The last roll of the round has to be able to lose the round unless they have already made a special roll.
  - Example: The player with the lowest points has 11 points (2, 4, 5) and the last player is sitting at a (1, 1, 6) which is 260 points. The last player "has" to roll all the dice again. Because if they kept either a 1 or a 6, they would not be able to lose the round (having at least 60 points)
- It is recommend to "risk it all" and go for potentially risky rolls in order to get a "nice" special roll.
  - Example: The player has rolled (1, 4, 4) which is 104 points. The player chooses to risk it all and roll the 1 in order to get three twos. This is risky because if the don't roll a 4, 1 or 6, they would end up with a low score. This makes it even more rewarding if they succeed!