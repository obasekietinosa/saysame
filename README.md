# SaySame
SaySame is a two player game where the objective is for the players to eventually type the same word. It's inspired by a game I've seen played on Instagram reels.

# Gameplay and Rules
The game starts by players joining a room. Players can either create a room and share it with specific players or they can be randomly matched with another currently online player. 

Once players are connected, they are each asked to enter a word. The words each player chose is revealed to the other at the same time and if they are not the same word, they are asked to enter another word. This continues until they both enter the same word or they reach 10 rounds. When they enter the same word or run out of rounds the game ends, highlighting the words they used each turn and how many turns it took them to arrive at the same word if they succeeded.

# Design
## Client
Our client will be a single page application with react-router for navigation between pages. We'll have a home page introducing the game, perhaps with a modal for rules and allowing selecting game type, ie play with a particular friend and send them the link or join a random player. We'll have a page for selecting user names, regardless of what game type they've selected. After selecting thier name we'll have a page to show the link to join a room, a page to insert the code (if they clicked the link they can skip this, but this is incase the code is shared instead), a waiting page while waiting to be paired with someone else playing. This covers each game style.

Once the two players have their names set and are in the room, the game begins and in the actual gameplay we show a list of the words each player has entered so far, a textbox to allow them enter words and then once they submit we show a loading screen while waiting for the other player's word to be submitted. Once both are submitted we show both words and if they are the same a success screen saying they've won and the game is over, otherwise we continue until they run out of rounds at which point the game ends.

## Server
The server will handle two things: websockets and api calls. 

We can split the server actions by game phase

### Starting a Game
- an endpoint to create a room. This will get called when a player wants to create a game and share it with a specific person. It'll persist a room ID and the player's ID as well as details like how many rounds have been played (will initialise at 0) and when the last move was played.
- an endpoint to join a room. This gets called when a player clicks the link to join a room or enters the room's code on the join page. This will store the player's ID against the room ID as well. It'll let the client know the game is ready to start as well.
- an endpoint to join the lobby and wait for a random game.
- a message to say all players have joined the room. This will be sent to the host of a room, ie the player who created the room, when another player joins and its time to start the game. It will also be sent to both players in cases where there is no host, ie it should return the `RoomState` as data.

### Playing a Game
The common DTO across API endpoints and websocket messages while playing is the RoomState. It contains the current round, the state of the round which would be PENDING, NO_MATCH or MATCH, the words each player has played for complete rounds.

```typescript
type RoomState = {
  id: string;

  /** Rounds */
  currentRound: number;
  totalRounds: number;
  currentRoundState: "PENDING" | "NO_MATCH" | "MATCH"

  /** Players */
  players: [Player, Player]
}

type Player = {
  id: string;
  name: string;
  words: string[]
}
```

For endpoints and messages we'll need in this phase are:
- an endpoint to submit words. This is called once a player has entered their word and hit submit. It should also return the current `RoomState`
- a message to say the other player has submitted their word. This will be sent to the opposing player to the one who submitted. It should return the `RoomState`

For persistence, we don't really need long term storage or even storage with ACID guarantees. A key value store like redis will be sufficient. We'll store user ids against rooms and submitted words.
