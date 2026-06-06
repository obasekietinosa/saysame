# SaySame
SaySame is a two player game where the objective is for the players to eventually type the same word. It's inspired by a game I've seen played on Instagram reels.

# Gameplay and Rules
The game starts by players joining a room. Players can either create a room and share it with specific players or they can be randomly matched with another currently online player. 

Once players are connected, they are each asked to enter a word. The words each player chose is revealed to the other at the same time and if they are not the same word, they are asked to enter another word. This continues until they both enter the same word or they reach 10 rounds. When they enter the same word or run out of rounds the game ends, highlighting the words they used each turn and how many turns it took them to arrive at the same word if they succeeded.

# Design
Ideally, we'd build this with websockets, but for simplicity's sake at the start (especially since we aren't using a managed websocket service), we will start with polling.

## Client
Our client will be a single page application with react-router for navigation between pages. We'll have a home page introducing the game, perhaps with a modal for rules and allowing selecting game type, ie play with a particular friend and send them the link or join a random player. We'll have a page for selecting user names, regardless of what game type they've selected. After selecting thier name we'll have a page to show the link to join a room, a page to insert the code (if they clicked the link they can skip this, but this is incase the code is shared instead), a waiting page while waiting to be paired with someone else playing. This covers each game style.

Once the two players have their names set and are in the room, the game begins and in the actual gameplay we show a list of the words each player has entered so far, a textbox to allow them enter words and then once they submit we show a loading screen while waiting for the other player's word to be submitted. Once both are submitted we show both words and if they are the same a success screen saying they've won and the game is over, otherwise we continue until they run out of rounds at which point the game ends.

## Server
We can split the server actions by game phase

### Starting a Game
- `POST /room` an endpoint to create a room. This will get called when a player wants to create a game and share it with a specific person. It'll persist a room ID and the player's ID as well as details like how many rounds have been played (will initialise at 0) and when the last move was played.

  ```typescript
    type CreateRoomRequest = {
      playerName: string;
    }

    type CreateRoomResponse = {
      roomId: string;
      playerId: string;
      playerName: string;
    }
  ```
- `POST /room/:roomId/players` an endpoint to join a room. This gets called when a player clicks the link to join a room or enters the room's code on the join page. This will store the player's ID against the room ID as well. It'll let the client know the game is ready to start as well.
- `POST /lobby` an endpoint to join the lobby and wait for a random game. We perform the following actions in a Lua script in order to make them atomic. First, we prune any lobby entries older than 10 seconds (5 sec ttl + buffer) and then we fetch the oldest entry in the lobby, put their id and the current entry id into a room, ending the atomic operation before returning with `RoomState` (see below). Otherwise, if there is no match in the lobby, we add a new entry with the current player id, end the atomic operation and then we return `{ message: "waiting" }` as the response and wait to be picked by another lobby player.
- `GET /room/:roomId?lastUpdatedAt=<datetime>` returns the `RoomState` and will be polled to receive the up to date room information. It returns a 304 if the timestamp on the request is the same as the lastUpdatedAt for that room (skipping over the desrialisation and saving some CPU cycles)
- `GET /lobby/:playerId` check to see if player has been matched to room. Also functions as a keep alive for the lobby. If a player does not send a request to this endpoint within 5 seconds we consider them no longer in the lobby and they'll be cleaned up as part of the `POST /lobby` lifecycle.

### Playing a Game
The common DTO across API endpoints and websocket messages while playing is the RoomState. It contains the current round, the state of the round which would be PENDING, NO_MATCH or MATCH, the words each player has played for complete rounds.

```typescript
type RoomState = {
  id: string;
  lastUpdatedAt: string;

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
  words: string[] // words are only returned for the opposing player for completed rounds
}
```

The endpoints we'll need in this phase are:
- `POST /room/:roomId/words` an endpoint to submit words. This is called once a player has entered their word and hit submit. It should also return the current `RoomState`. If the round in the request payload doesn't match what the server considers the current round, then we return a HTTP 422 with the current room state, discarding the proposed changes.
  ```typescript
    type SubmitWordRequest = {
      playerId: string;
      word: string;
      round: number;
    }

    // success - word submitted sucessfully - HTTP 200 return RoomState
    // failure - round number does not match - HTTP 422 return RoomState
  ```

  A successful update of the words would update the lastUpdatedAt field of the room and reset the Redis TTL on the room hash and the room submissions hash. This removes stale sessions automatically.

- `GET /room/:roomId` returns the `RoomState` and will be polled to receive the up to date room information. Same endpoint as defined above. But called if player has submitted a word and is waiting for the other player to submit as well. Expiry and HTTP 304 mechanics apply as described above.

## Persistence
For persistence, we don't need long term storage here. Nor do we need ACID guarantees. However, we want a speedy data store especially for retrievals. A key value store like redis should do nicely.  

The data we store will be as follows:
- **rooms** will be stored as a hash, keyed against the room id
  ```
  room:<roomId>
    ├─ lastUpdatedAt -> date
    ├─ currentRound -> number
    ├─ totalRounds -> number
    ├─ playerOneId -> string
    └─ playerTwoId -> string
  ```

- **submissions** will be stored as a hash containing per round submissions for each room
  ```
  room:<roomId>:submission
    └─ <playerId>:<roundNumber> -> string
  ```
  
- **lobbies** will be stored as a sorted set (zset) with the timestamp as the score, so that we can sort by the oldest in the lobby and match them first
  ```
  lobby:queue
    └─ <timestamp> <playerId>
  ```
