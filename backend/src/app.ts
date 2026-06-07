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
