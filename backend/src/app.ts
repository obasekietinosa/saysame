import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { redis } from './redis.js';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello SaySame API!');
});

app.post('/room', async (req, res) => {
  const { playerName } = req.body;

  if (!playerName) {
    res.status(400).json({ error: 'playerName is required' });
    return;
  }

  const roomId = uuidv4();
  const playerId = uuidv4();

  const now = new Date().toISOString();

  await redis.hset(`room:${roomId}`, {
    lastUpdatedAt: now,
    currentRound: 0,
    totalRounds: 10,
    playerOneId: playerId,
    playerOneName: playerName,
  });

  res.json({
    roomId,
    playerId,
    playerName,
  });
});

app.post('/room/:roomId/players', async (req, res) => {
  const { roomId } = req.params;
  const { playerName } = req.body;

  if (!playerName) {
    res.status(400).json({ error: 'playerName is required' });
    return;
  }

  const roomExists = await redis.exists(`room:${roomId}`);
  if (!roomExists) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const playerTwoId = await redis.hget(`room:${roomId}`, 'playerTwoId');
  if (playerTwoId) {
    res.status(409).json({ error: 'Room is full' });
    return;
  }

  const playerId = uuidv4();
  const now = new Date().toISOString();

  await redis.hset(`room:${roomId}`, {
    lastUpdatedAt: now,
    playerTwoId: playerId,
    playerTwoName: playerName,
  });

  res.json({
    roomId,
    playerId,
    playerName,
    ready: true,
  });
});

app.post('/lobby', async (req, res) => {
  const { playerName } = req.body;

  if (!playerName) {
    res.status(400).json({ error: 'playerName is required' });
    return;
  }

  const playerId = uuidv4();
  const now = Date.now();
  const cutoff = now - 10000; // 10 seconds ago

  const luaScript = `
    local now = tonumber(ARGV[1])
    local playerId = ARGV[2]
    local playerName = ARGV[3]
    local roomId = ARGV[4]
    local lastUpdatedAt = ARGV[5]

    -- Try to find the oldest valid entry
    local matchedPlayerId = nil
    local matchedPlayerName = nil

    while true do
      local oldest = redis.call("ZRANGE", "lobby:queue", 0, 0)
      if not oldest or #oldest == 0 then
        break
      end

      local candidateId = oldest[1]
      local candidateName = redis.call("GET", "lobby:player:" .. candidateId)

      if candidateName then
        matchedPlayerId = candidateId
        matchedPlayerName = candidateName
        -- Remove the matched player from the queue
        redis.call("ZREM", "lobby:queue", candidateId)
        break
      else
        -- Clean up dead entry and try again
        redis.call("ZREM", "lobby:queue", candidateId)
      end
    end

    if matchedPlayerId then
      -- Create a room
      redis.call("HSET", "room:" .. roomId,
        "lastUpdatedAt", lastUpdatedAt,
        "currentRound", "0",
        "totalRounds", "10",
        "playerOneId", matchedPlayerId,
        "playerOneName", matchedPlayerName,
        "playerTwoId", playerId,
        "playerTwoName", playerName
      )

      -- Set match notification for matched player
      redis.call("SET", "lobby:match:" .. matchedPlayerId, roomId)
      redis.call("EXPIRE", "lobby:match:" .. matchedPlayerId, 60)

      -- Clean up name
      redis.call("DEL", "lobby:player:" .. matchedPlayerId)

      return { "MATCH", roomId, matchedPlayerId, matchedPlayerName }
    else
      -- No match found, add to lobby with current timestamp as score for FIFO
      redis.call("ZADD", "lobby:queue", now, playerId)
      redis.call("SET", "lobby:player:" .. playerId, playerName)
      -- 10 second TTL for the player key, acting as the keepalive timeout
      redis.call("EXPIRE", "lobby:player:" .. playerId, 10)

      return { "WAITING" }
    end
  `;

  const roomId = uuidv4();
  const lastUpdatedAt = new Date().toISOString();

  try {
    const result = await redis.eval(
      luaScript,
      0,
      now.toString(),
      playerId,
      playerName,
      roomId,
      lastUpdatedAt
    ) as any[];

    if (result[0] === 'MATCH') {
      const matchRoomId = result[1];
      const matchedPlayerId = result[2];
      const matchedPlayerName = result[3];

      res.json({
        id: matchRoomId,
        lastUpdatedAt,
        currentRound: 0,
        totalRounds: 10,
        currentRoundState: "PENDING",
        players: [
          { id: matchedPlayerId, name: matchedPlayerName, words: [] },
          { id: playerId, name: playerName, words: [] }
        ]
      });
    } else {
      res.json({
        message: 'waiting',
        playerId
      });
    }
  } catch (error) {
    console.error("Lobby error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/lobby/:playerId', async (req, res) => {
  const { playerId } = req.params;

  // Check if player has been matched
  const matchedRoomId = await redis.get(`lobby:match:${playerId}`);

  if (matchedRoomId) {
    // Return room state
    const roomHash = await redis.hgetall(`room:${matchedRoomId}`);
    if (Object.keys(roomHash).length === 0) {
       res.status(404).json({ error: 'Matched room not found' });
       return;
    }

    // Do NOT immediately delete the match notification, rely on TTL.
    // This allows for client retries in case of transient network issues.

    res.json({
      id: matchedRoomId,
      lastUpdatedAt: roomHash.lastUpdatedAt,
      currentRound: parseInt(roomHash.currentRound || '0', 10),
      totalRounds: parseInt(roomHash.totalRounds || '10', 10),
      currentRoundState: "PENDING", // Initial state
      players: [
        { id: roomHash.playerOneId, name: roomHash.playerOneName, words: [] },
        { id: roomHash.playerTwoId, name: roomHash.playerTwoName, words: [] }
      ]
    });
    return;
  }

  // Check if player is still in the queue
  const score = await redis.zscore('lobby:queue', playerId);

  if (score !== null) {
    // Only refresh TTL for the player key to keep alive, avoiding score update for FIFO
    const updated = await redis.expire(`lobby:player:${playerId}`, 10);

    if (updated) {
      res.json({ message: 'waiting' });
      return;
    }
  }

  res.status(404).json({ error: 'Player not found in lobby' });
});

export async function getRoomState(roomId: string) {
  const roomHash = await redis.hgetall(`room:${roomId}`);

  if (Object.keys(roomHash).length === 0) {
    return null;
  }

  const currentRound = parseInt(roomHash.currentRound || '0', 10);
  const totalRounds = parseInt(roomHash.totalRounds || '10', 10);

  const submissions = await redis.hgetall(`room:${roomId}:submission`);

  const playerOneId = roomHash.playerOneId;
  const playerTwoId = roomHash.playerTwoId;

  const playerOneWords: string[] = [];
  const playerTwoWords: string[] = [];

  let currentRoundState = "PENDING";

  for (let i = 0; i < currentRound; i++) {
    const p1Word = submissions[`${playerOneId}:${i}`] || "";
    const p2Word = submissions[`${playerTwoId}:${i}`] || "";
    playerOneWords.push(p1Word);
    playerTwoWords.push(p2Word);
  }

  if (currentRound > 0) {
    const p1LastWord = submissions[`${playerOneId}:${currentRound - 1}`];
    const p2LastWord = submissions[`${playerTwoId}:${currentRound - 1}`];
    if (p1LastWord && p2LastWord && p1LastWord === p2LastWord) {
      currentRoundState = "MATCH";
    } else if (currentRound === totalRounds) {
      currentRoundState = "NO_MATCH";
    }
  }

  return {
    id: roomId,
    lastUpdatedAt: roomHash.lastUpdatedAt,
    currentRound: currentRound,
    totalRounds: totalRounds,
    currentRoundState: currentRoundState,
    players: [
      { id: playerOneId, name: roomHash.playerOneName, words: playerOneWords },
      { id: playerTwoId, name: roomHash.playerTwoName, words: playerTwoWords }
    ]
  };
}

app.post('/room/:roomId/words', async (req, res) => {
  const { roomId } = req.params;
  const { playerId, word, round } = req.body;

  if (!playerId || !word || round === undefined) {
    res.status(400).json({ error: 'playerId, word, and round are required' });
    return;
  }

  const roomHash = await redis.hgetall(`room:${roomId}`);

  if (Object.keys(roomHash).length === 0) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  if (roomHash.playerOneId !== playerId && roomHash.playerTwoId !== playerId) {
    res.status(403).json({ error: 'Player not in room' });
    return;
  }

  const currentRound = parseInt(roomHash.currentRound || '0', 10);
  const totalRounds = parseInt(roomHash.totalRounds || '10', 10);

  if (round !== currentRound) {
    const roomState = await getRoomState(roomId);
    res.status(422).json(roomState);
    return;
  }

  if (currentRound >= totalRounds) {
    res.status(400).json({ error: 'Game has already ended' });
    return;
  }

  // Guard against submitting if game ended with a match
  if (currentRound > 0) {
    const p1LastWord = await redis.hget(`room:${roomId}:submission`, `${roomHash.playerOneId}:${currentRound - 1}`);
    const p2LastWord = await redis.hget(`room:${roomId}:submission`, `${roomHash.playerTwoId}:${currentRound - 1}`);
    if (p1LastWord && p2LastWord && p1LastWord === p2LastWord) {
      res.status(400).json({ error: 'Game has already ended with a match' });
      return;
    }
  }

  // Save the word
  await redis.hset(`room:${roomId}:submission`, `${playerId}:${round}`, word);

  // Check if both players have submitted for this round
  const submissions = await redis.hgetall(`room:${roomId}:submission`);
  const p1Word = submissions[`${roomHash.playerOneId}:${round}`];
  const p2Word = submissions[`${roomHash.playerTwoId}:${round}`];

  let nextRound = currentRound;
  if (p1Word && p2Word) {
    nextRound = currentRound + 1;
    await redis.hset(`room:${roomId}`, 'currentRound', nextRound.toString());
  }

  const now = new Date().toISOString();
  await redis.hset(`room:${roomId}`, 'lastUpdatedAt', now);

  // Reset TTL to 1 hour (3600 seconds)
  await redis.expire(`room:${roomId}`, 3600);
  await redis.expire(`room:${roomId}:submission`, 3600);

  const roomState = await getRoomState(roomId);
  res.json(roomState);
});

app.get('/room/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const { lastUpdatedAt } = req.query;

  const roomHash = await redis.hgetall(`room:${roomId}`);

  if (Object.keys(roomHash).length === 0) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  if (lastUpdatedAt && roomHash.lastUpdatedAt === lastUpdatedAt) {
    res.status(304).send();
    return;
  }

  const roomState = await getRoomState(roomId);
  res.json(roomState);
});
